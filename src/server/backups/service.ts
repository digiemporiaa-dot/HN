import { createHash, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import * as tar from "tar";

import { prisma } from "@/server/db";
import { uploadRoot } from "@/server/storage/config";
import type { BackupKind } from "@/generated/prisma/enums";
import { archivePath, backupRoot, newArchiveName } from "./paths";

/**
 * Backups: one archive per backup, holding the whole site.
 *
 *   manifest.json        what the archive holds and which schema it came from
 *   database/<Table>.json  every row of every application table
 *   uploads/...          every uploaded file, folders as on the volume
 *
 * Rows are exported with PostgreSQL's own row_to_json and imported with
 * json_populate_recordset, so every type — timestamps, enums, JSON, arrays —
 * round-trips exactly, and no pg_dump binary has to match the server's
 * version.
 */

export const ARCHIVE_FORMAT = 1;
const APP = "hn-medical-system";

/** Never part of an archive: Prisma's own bookkeeping, and the archive list. */
const EXCLUDED_TABLES = ["_prisma_migrations", "Backup"];

/** A backup or restore still marked running after this is considered dead. */
const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

export type BackupManifest = {
  format: number;
  app: string;
  createdAt: string;
  migrations: string[];
  tables: Record<string, number>;
  uploads: { files: number; bytes: number };
};

export class BackupError extends Error {}

/* ----------------------------------------------------------------- helpers -- */

const quote = (identifier: string) => `"${identifier.replace(/"/g, '""')}"`;

async function applicationTables(): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'
    ORDER BY table_name`;
  return rows
    .map((row) => row.table_name)
    .filter((name) => !EXCLUDED_TABLES.includes(name));
}

async function appliedMigrations(): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ migration_name: string }>>`
    SELECT migration_name FROM "_prisma_migrations"
    WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
    ORDER BY migration_name`;
  return rows.map((row) => row.migration_name);
}

export async function fileChecksum(file: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

/** Top-level entries of the upload volume that belong to the application. */
async function uploadEntries(root: string): Promise<string[]> {
  const entries = await fs.readdir(root).catch(() => [] as string[]);
  // Dot-folders are this module's own working space during a restore.
  return entries.filter((name) => !name.startsWith("."));
}

/**
 * One backup or restore at a time in this process. Held on globalThis because
 * Next.js may load this module more than once (the scheduler and the admin
 * actions are bundled separately); the RUNNING row covers other processes.
 */
const LOCK = Symbol.for("hnmedical.backups.lock");
type LockHolder = { [LOCK]?: boolean };

async function exclusively<T>(work: () => Promise<T>): Promise<T> {
  const holder = globalThis as LockHolder;
  if (holder[LOCK]) {
    throw new BackupError(
      "Another backup or restore is in progress. Try again when it has finished.",
    );
  }
  holder[LOCK] = true;
  try {
    await assertIdle();
    return await work();
  } finally {
    holder[LOCK] = false;
  }
}

async function assertIdle(): Promise<void> {
  const running = await prisma.backup.findFirst({
    where: {
      status: "RUNNING",
      startedAt: { gt: new Date(Date.now() - STALE_AFTER_MS) },
    },
    select: { id: true },
  });
  if (running) {
    throw new BackupError(
      "Another backup or restore is in progress. Try again when it has finished.",
    );
  }
}

/**
 * Marks backups left running by a crash or restart as failed. At start-up,
 * pass the boot time: nothing started before it can still be running here.
 */
export async function failStaleBackups(
  startedBefore = new Date(Date.now() - STALE_AFTER_MS),
): Promise<void> {
  await prisma.backup.updateMany({
    where: {
      status: "RUNNING",
      startedAt: { lt: startedBefore },
    },
    data: {
      status: "FAILED",
      error: "Interrupted before it finished.",
      finishedAt: new Date(),
    },
  });
}

/* ------------------------------------------------------------------ create -- */

type BackupOptions = {
  kind: BackupKind;
  actor?: { id: string; name: string } | null;
  note?: string | null;
};

export function createBackup(
  options: BackupOptions,
): Promise<{ id: string; filename: string }> {
  return exclusively(() => writeBackup(options));
}

async function writeBackup(
  options: BackupOptions,
): Promise<{ id: string; filename: string }> {
  const root = backupRoot();
  await fs.mkdir(root, { recursive: true, mode: 0o750 });
  const filename = newArchiveName(options.kind);
  const target = archivePath(filename);

  const row = await prisma.backup.create({
    data: {
      filename,
      kind: options.kind,
      status: "RUNNING",
      note: options.note ?? null,
      createdById: options.actor?.id ?? null,
      createdByName: options.actor?.name ?? null,
    },
    select: { id: true },
  });

  const work = path.join(root, `.work-${row.id}`);
  try {
    await fs.mkdir(path.join(work, "database"), { recursive: true });

    // Every table read from one snapshot, so the archive is consistent even
    // while staff keep working.
    const tables: Record<string, number> = {};
    await prisma.$transaction(
      async (tx) => {
        for (const table of await applicationTables()) {
          const [result] = await tx.$queryRawUnsafe<
            Array<{ data: string; rows: number }>
          >(
            `SELECT coalesce(json_agg(t), '[]'::json)::text AS data, count(*)::int AS rows FROM ${quote(table)} t`,
          );
          await fs.writeFile(
            path.join(work, "database", `${table}.json`),
            result.data,
          );
          tables[table] = result.rows;
        }
      },
      {
        isolationLevel: "RepeatableRead",
        timeout: 10 * 60 * 1000,
        maxWait: 30_000,
      },
    );

    // Built as a plain tar and appended to, then compressed once. (Nesting a
    // second archive with tar's "@file" entries can stall node-tar.)
    const plain = path.join(work, "archive.tar");
    await tar.c({ file: plain, cwd: work, portable: true }, ["database"]);

    // Uploaded files, under an "uploads/" prefix.
    const media = uploadRoot();
    await fs.mkdir(media, { recursive: true });
    let files = 0;
    let bytes = 0;
    const entries = await uploadEntries(media);
    if (entries.length > 0) {
      await tar.r(
        {
          file: plain,
          cwd: media,
          prefix: "uploads",
          portable: true,
          filter: (_entryPath, stat) => {
            if ("isFile" in stat && stat.isFile()) {
              files += 1;
              bytes += stat.size;
            }
            // Regular files and folders only: never a link out of the volume.
            return !("isSymbolicLink" in stat) || !stat.isSymbolicLink();
          },
        },
        entries,
      );
    }

    const manifest: BackupManifest = {
      format: ARCHIVE_FORMAT,
      app: APP,
      createdAt: new Date().toISOString(),
      migrations: await appliedMigrations(),
      tables,
      uploads: { files, bytes },
    };
    await fs.writeFile(
      path.join(work, "manifest.json"),
      JSON.stringify(manifest, null, 2),
    );

    await tar.r({ file: plain, cwd: work, portable: true }, ["manifest.json"]);
    await pipeline(
      createReadStream(plain),
      createGzip(),
      createWriteStream(target, { mode: 0o600 }),
    );
    await fs.chmod(target, 0o600);

    const [stat, checksum] = await Promise.all([
      fs.stat(target),
      fileChecksum(target),
    ]);
    await prisma.backup.update({
      where: { id: row.id },
      data: {
        status: "COMPLETED",
        sizeBytes: BigInt(stat.size),
        checksum,
        manifest,
        finishedAt: new Date(),
      },
    });
    return { id: row.id, filename };
  } catch (error) {
    await fs.rm(target, { force: true }).catch(() => {});
    await prisma.backup
      .update({
        where: { id: row.id },
        data: {
          status: "FAILED",
          error:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "Unknown error",
          finishedAt: new Date(),
        },
      })
      .catch(() => {});
    throw error;
  } finally {
    await fs.rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

/* ----------------------------------------------------------------- inspect -- */

/** Reads and checks an archive's manifest without extracting anything else. */
export async function readManifest(file: string): Promise<BackupManifest> {
  let raw = "";
  await tar.t({
    file,
    filter: (entryPath) => entryPath === "manifest.json",
    onReadEntry: (entry) => {
      entry.on("data", (chunk: Buffer) => {
        raw += chunk.toString("utf8");
        if (raw.length > 5_000_000)
          throw new BackupError("Manifest too large.");
      });
    },
  });
  let manifest: BackupManifest;
  try {
    manifest = JSON.parse(raw) as BackupManifest;
  } catch {
    throw new BackupError("This file is not an HN Medical System backup.");
  }
  if (manifest?.app !== APP || manifest.format !== ARCHIVE_FORMAT) {
    throw new BackupError("This file is not an HN Medical System backup.");
  }
  if (
    !Array.isArray(manifest.migrations) ||
    typeof manifest.tables !== "object"
  ) {
    throw new BackupError("The backup's manifest is incomplete.");
  }
  return manifest;
}

/**
 * Whether this deployment can take an archive's data: every migration the
 * backup was made with must be applied here. An older backup restores into a
 * newer schema (new columns take their defaults); a newer one cannot.
 */
export async function compatibility(manifest: BackupManifest): Promise<{
  ok: boolean;
  missing: string[];
}> {
  const applied = new Set(await appliedMigrations());
  const missing = manifest.migrations.filter((name) => !applied.has(name));
  return { ok: missing.length === 0, missing };
}

/* ----------------------------------------------------------------- restore -- */

const ALLOWED_ENTRY =
  /^(manifest\.json|database\/[A-Za-z0-9_]+\.json|uploads(\/[^/]+)*\/?)$/;

type RestoreResult = {
  preRestoreId: string;
  tables: number;
  rows: number;
  files: number;
};

export function restoreBackup(options: {
  backupId: string;
  actor: { id: string; name: string };
}): Promise<RestoreResult> {
  return exclusively(() => runRestore(options));
}

async function runRestore(options: {
  backupId: string;
  actor: { id: string; name: string };
}): Promise<RestoreResult> {
  const backup = await prisma.backup.findUnique({
    where: { id: options.backupId },
    select: { id: true, filename: true, status: true, checksum: true },
  });
  if (!backup || backup.status !== "COMPLETED") {
    throw new BackupError(
      "That backup is not complete and cannot be restored.",
    );
  }
  const file = archivePath(backup.filename);
  await fs.access(file).catch(() => {
    throw new BackupError(
      "The archive file is missing from the backup volume.",
    );
  });
  if (!backup.checksum || (await fileChecksum(file)) !== backup.checksum) {
    throw new BackupError(
      "The archive does not match its checksum; it may be damaged. It was not restored.",
    );
  }

  const manifest = await readManifest(file);
  const { ok, missing } = await compatibility(manifest);
  if (!ok) {
    throw new BackupError(
      `This backup was made by a newer version of the application (${missing.length} migration${missing.length === 1 ? "" : "s"} not applied here). Deploy that version first.`,
    );
  }

  // The undo button: the site as it is now, archived before anything changes.
  const pre = await writeBackup({
    kind: "PRE_RESTORE",
    actor: options.actor,
    note: `Taken automatically before restoring ${backup.filename}`,
  });

  const root = backupRoot();
  const work = path.join(root, `.restore-${randomBytes(6).toString("hex")}`);
  const media = uploadRoot();
  const incoming = path.join(media, `.incoming-${path.basename(work)}`);
  const previous = path.join(media, `.previous-${path.basename(work)}`);

  try {
    await fs.mkdir(work, { recursive: true });
    await tar.x({
      file,
      cwd: work,
      strict: true,
      // Only what an archive of ours contains, and only files and folders:
      // no links, no devices, no paths outside the working folder.
      filter: (entryPath, entry) =>
        ALLOWED_ENTRY.test(entryPath.replace(/^\.\//, "")) &&
        !entryPath.split("/").includes("..") &&
        "type" in entry &&
        (entry.type === "File" || entry.type === "Directory"),
    });

    /* --- database: one transaction, one statement ---------------------- */
    const current = await applicationTables();
    const columnRows = await prisma.$queryRaw<
      Array<{ table_name: string; column_name: string }>
    >`SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = current_schema()`;
    const columnsOf = new Map<string, Set<string>>();
    for (const row of columnRows) {
      if (!columnsOf.has(row.table_name))
        columnsOf.set(row.table_name, new Set());
      columnsOf.get(row.table_name)!.add(row.column_name);
    }

    const inserts: Array<{ table: string; columns: string[]; data: string }> =
      [];
    let rows = 0;
    for (const table of current) {
      const source = path.join(work, "database", `${table}.json`);
      const data = await fs.readFile(source, "utf8").catch(() => null);
      if (data === null) continue;
      const parsed = JSON.parse(data) as Array<Record<string, unknown>>;
      if (parsed.length === 0) continue;
      // Columns both the backup and today's schema have. A column added since
      // the backup takes its default; one removed since is ignored.
      const available = columnsOf.get(table) ?? new Set<string>();
      const columns = Object.keys(parsed[0]).filter((column) =>
        available.has(column),
      );
      inserts.push({ table, columns, data });
      rows += parsed.length;
    }

    await prisma.$transaction(
      async (tx) => {
        // The highest token version ever issued here, read before it is
        // replaced: see the sign-out below.
        const [{ highest }] = await tx.$queryRaw<Array<{ highest: number }>>`
          SELECT coalesce(max("tokenVersion"), 0)::int AS highest FROM "Staff"`;

        // The audit trail is not rolled back: what happened since the backup
        // — perhaps the reason for restoring — stays on record. It is set
        // aside here and merged with the backup's own entries below.
        const keepAudit = current.includes("AuditLog");
        if (keepAudit) {
          await tx.$executeRawUnsafe(
            `CREATE TEMP TABLE hn_audit_keep ON COMMIT DROP AS SELECT * FROM "AuditLog"`,
          );
        }

        await tx.$executeRawUnsafe(
          `TRUNCATE TABLE ${current.map(quote).join(", ")}`,
        );
        if (inserts.length > 0) {
          // Every table in one statement: foreign keys are checked at the end
          // of it, so tables that refer to each other restore in any order.
          const ctes = inserts.map((insert, index) => {
            const list = insert.columns.map(quote).join(", ");
            return `i${index} AS (INSERT INTO ${quote(insert.table)} (${list}) SELECT ${list} FROM json_populate_recordset(NULL::${quote(insert.table)}, $${index + 1}::json))`;
          });
          await tx.$executeRawUnsafe(
            `WITH ${ctes.join(", ")} SELECT 1`,
            ...inserts.map((insert) => insert.data),
          );
        }

        if (keepAudit) {
          // Entries by staff the backup does not contain keep their email.
          await tx.$executeRawUnsafe(
            `UPDATE hn_audit_keep k SET "actorId" = NULL
             WHERE k."actorId" IS NOT NULL
               AND NOT EXISTS (SELECT 1 FROM "Staff" s WHERE s.id = k."actorId")`,
          );
          await tx.$executeRawUnsafe(
            `INSERT INTO "AuditLog" SELECT * FROM hn_audit_keep ON CONFLICT (id) DO NOTHING`,
          );
        }

        // Sign everyone out. The backup's sessions and token versions would
        // otherwise bring back sign-ins revoked after it was made — after a
        // password change, say. Every version moves past any ever issued.
        await tx.$executeRaw`
          UPDATE "Staff" SET "tokenVersion" = "tokenVersion" + ${highest + 1}`;
        await tx.$executeRaw`
          UPDATE "StaffSession" SET "revokedAt" = now() WHERE "revokedAt" IS NULL`;
      },
      { timeout: 15 * 60 * 1000, maxWait: 30_000 },
    );

    /* --- files: swap the upload folders -------------------------------- */
    const extractedUploads = path.join(work, "uploads");
    let files = 0;
    await fs.mkdir(incoming, { recursive: true });
    if (
      await fs.stat(extractedUploads).then(
        () => true,
        () => false,
      )
    ) {
      // Copied rather than moved: the backup volume and the media volume are
      // separate filesystems.
      await fs.cp(extractedUploads, incoming, { recursive: true });
      files = manifest.uploads.files;
    }
    await fs.mkdir(previous, { recursive: true });
    for (const name of await uploadEntries(media)) {
      await fs.rename(path.join(media, name), path.join(previous, name));
    }
    for (const name of await fs.readdir(incoming)) {
      await fs.rename(path.join(incoming, name), path.join(media, name));
    }
    await fs.rm(previous, { recursive: true, force: true });

    await prisma.backup.update({
      where: { id: backup.id },
      data: { restoredAt: new Date() },
    });

    return { preRestoreId: pre.id, tables: inserts.length, rows, files };
  } finally {
    await fs.rm(work, { recursive: true, force: true }).catch(() => {});
    await fs.rm(incoming, { recursive: true, force: true }).catch(() => {});
  }
}

/* ------------------------------------------------------------------ upload -- */

/** Where an upload is written while it arrives; never a valid archive name. */
export async function uploadStagingPath(): Promise<string> {
  const root = backupRoot();
  await fs.mkdir(root, { recursive: true, mode: 0o750 });
  return path.join(root, `.upload-${randomBytes(8).toString("hex")}`);
}

/**
 * Adopts an uploaded file as a backup — for moving a site to a new server, or
 * restoring from an off-site copy. It must be one of this application's
 * archives; it is filed under a generated name and only restored on request.
 */
export async function adoptUploadedArchive(
  file: string,
  actor: { id: string; name: string },
): Promise<{ id: string; filename: string }> {
  const notOurs = new BackupError(
    "This file is not an HN Medical System backup.",
  );
  const handle = await fs.open(file, "r");
  const magic = Buffer.alloc(2);
  try {
    await handle.read(magic, 0, 2, 0);
  } finally {
    await handle.close();
  }
  if (magic[0] !== 0x1f || magic[1] !== 0x8b) throw notOurs;

  let manifest: BackupManifest;
  try {
    manifest = await readManifest(file);
  } catch (error) {
    throw error instanceof BackupError ? error : notOurs;
  }

  const filename = newArchiveName("UPLOADED");
  const target = archivePath(filename);
  await fs.rename(file, target);
  await fs.chmod(target, 0o600);
  const [stat, checksum] = await Promise.all([
    fs.stat(target),
    fileChecksum(target),
  ]);
  const row = await prisma.backup.create({
    data: {
      filename,
      kind: "UPLOADED",
      status: "COMPLETED",
      sizeBytes: BigInt(stat.size),
      checksum,
      manifest,
      note: `Uploaded; made ${manifest.createdAt}`,
      createdById: actor.id,
      createdByName: actor.name,
      finishedAt: new Date(),
    },
    select: { id: true },
  });
  return { id: row.id, filename };
}

/* ------------------------------------------------------------ housekeeping -- */

export async function deleteBackupFile(filename: string): Promise<void> {
  await fs.rm(archivePath(filename), { force: true });
}

/** Keeps the newest `keep` scheduled backups; older ones are removed. */
export async function pruneScheduledBackups(keep: number): Promise<number> {
  const scheduled = await prisma.backup.findMany({
    where: { kind: "SCHEDULED", status: "COMPLETED" },
    orderBy: { startedAt: "desc" },
    select: { id: true, filename: true },
  });
  const surplus = scheduled.slice(Math.max(1, keep));
  for (const backup of surplus) {
    await deleteBackupFile(backup.filename);
    await prisma.backup.delete({ where: { id: backup.id } });
  }
  return surplus.length;
}

/** Free space on the backup volume, for the admin screen. */
export async function backupVolumeSpace(): Promise<{
  free: number;
  total: number;
} | null> {
  try {
    const stats = await fs.statfs(backupRoot());
    return {
      free: Number(stats.bavail) * Number(stats.bsize),
      total: Number(stats.blocks) * Number(stats.bsize),
    };
  } catch {
    return null;
  }
}
