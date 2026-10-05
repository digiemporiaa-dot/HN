import { NextResponse } from "next/server";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import { recordAuditEvent } from "@/server/audit/log";
import { clientIpFrom, isSameOrigin } from "@/server/http/client";
import { requirePermission } from "@/server/permissions";
import { backupConfigured } from "@/server/backups/paths";
import {
  adoptUploadedArchive,
  BackupError,
  backupVolumeSpace,
  uploadStagingPath,
} from "@/server/backups/service";

/** Far above any realistic site; a bound so a runaway upload cannot fill the volume. */
const MAX_BYTES = 20 * 1024 ** 3;

/**
 * Receives a backup archive as the raw request body, streamed to the backup
 * volume. Adopting it is not restoring it: the archive joins the list, and
 * restoring is a separate, confirmed step.
 */
export async function POST(request: Request) {
  const actor = await requirePermission("BACKUPS", "RESTORE");

  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Refused." }, { status: 403 });
  }
  if (!backupConfigured()) {
    return NextResponse.json(
      { error: "BACKUP_ROOT is not configured on this server." },
      { status: 503 },
    );
  }
  if (!request.body) {
    return NextResponse.json({ error: "No file was sent." }, { status: 400 });
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  const space = await backupVolumeSpace();
  if (declared > MAX_BYTES || (space && declared > space.free)) {
    return NextResponse.json(
      {
        error: "There is not enough space on the backup volume for this file.",
      },
      { status: 413 },
    );
  }

  const staging = await uploadStagingPath();
  try {
    let received = 0;
    const limit = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        received += chunk.length;
        if (received > MAX_BYTES) {
          callback(new BackupError("The file is too large."));
          return;
        }
        callback(null, chunk);
      },
    });
    await pipeline(
      Readable.fromWeb(
        request.body as import("node:stream/web").ReadableStream,
      ),
      limit,
      createWriteStream(staging, { mode: 0o600 }),
    );
    if (received === 0) {
      throw new BackupError("The file is empty.");
    }

    const backup = await adoptUploadedArchive(staging, {
      id: actor.id,
      name: actor.name,
    });
    await recordAuditEvent({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "BACKUP_UPLOADED",
      module: "BACKUPS",
      entityType: "Backup",
      entityId: backup.id,
      summary: `Backup archive uploaded as ${backup.filename}`,
      metadata: { bytes: received },
      ipAddress: clientIpFrom(request.headers),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ id: backup.id });
  } catch (error) {
    if (!(error instanceof BackupError)) {
      console.error(
        "Backup upload failed",
        error instanceof Error ? error.message : "unknown",
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof BackupError
            ? error.message
            : "The upload failed. The server log has the details.",
      },
      { status: 400 },
    );
  } finally {
    await fs.rm(staging, { force: true }).catch(() => {});
  }
}
