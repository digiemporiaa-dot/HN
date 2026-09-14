import { createReadStream } from "node:fs";
import { constants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import type { MediaKind } from "@/generated/prisma/enums";
import { STORAGE_FOLDERS, uploadRoot, type StorageFolder } from "./config";
import { buildStorageKey, resolveStoragePath } from "./paths";
import { validateUpload } from "./validate";

export type StoredFile = {
  storageKey: string;
  mimeType: string;
  kind: MediaKind;
  sizeBytes: number;
  width: number | null;
  height: number | null;
};

export type StoreResult =
  | { ok: true; file: StoredFile }
  | { ok: false; reason: string };

/**
 * Creates the folder tree if it is missing and confirms the volume is
 * writable. Called by the healthcheck, so a misconfigured mount surfaces as a
 * failing deploy rather than as the first failed upload.
 */
export async function ensureStorageReady(): Promise<void> {
  const root = uploadRoot();

  await fs.mkdir(root, { recursive: true });
  await fs.access(root, constants.R_OK | constants.W_OK);

  await Promise.all(
    STORAGE_FOLDERS.map((folder) =>
      fs.mkdir(path.join(root, folder), { recursive: true }),
    ),
  );
}

async function readImageDimensions(
  bytes: Buffer,
  kind: MediaKind,
): Promise<{ width: number | null; height: number | null }> {
  if (kind !== "IMAGE") return { width: null, height: null };

  try {
    // Metadata only — the original bytes are stored untouched. Re-encoding on
    // upload would degrade quality for no benefit, and doing it repeatedly
    // across edits compounds the loss.
    const metadata = await sharp(bytes).metadata();
    return {
      width: metadata.width ?? null,
      height: metadata.height ?? null,
    };
  } catch {
    return { width: null, height: null };
  }
}

/**
 * Validates and writes a file to the persistent volume.
 *
 * Nothing is written until validation passes, so a rejected upload leaves no
 * trace on disk.
 */
export async function storeFile(params: {
  bytes: Buffer;
  filename: string;
  folder: StorageFolder;
}): Promise<StoreResult> {
  const validation = await validateUpload({
    bytes: params.bytes,
    filename: params.filename,
  });

  if (!validation.ok) return { ok: false, reason: validation.reason };

  const storageKey = buildStorageKey({
    folder: params.folder,
    extension: validation.extension,
  });
  const absolutePath = resolveStoragePath(storageKey);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });

  // Written without the executable bit; the volume should also be mounted
  // noexec where the host allows it.
  await fs.writeFile(absolutePath, params.bytes, { mode: 0o640 });

  const { width, height } = await readImageDimensions(
    params.bytes,
    validation.kind,
  );

  return {
    ok: true,
    file: {
      storageKey,
      mimeType: validation.mimeType,
      kind: validation.kind,
      sizeBytes: validation.sizeBytes,
      width,
      height,
    },
  };
}

export async function fileExists(storageKey: string): Promise<boolean> {
  try {
    const stats = await fs.stat(resolveStoragePath(storageKey));
    return stats.isFile();
  } catch {
    return false;
  }
}

export async function statFile(storageKey: string) {
  const absolutePath = resolveStoragePath(storageKey);
  const stats = await fs.stat(absolutePath);
  if (!stats.isFile()) throw new Error("Storage key does not point at a file.");
  return { absolutePath, size: stats.size, modifiedAt: stats.mtime };
}

export function readFileStream(absolutePath: string) {
  return createReadStream(absolutePath);
}

export async function readFileBytes(storageKey: string): Promise<Buffer> {
  return fs.readFile(resolveStoragePath(storageKey));
}

/** Removing a file that is already gone is success, not an error. */
export async function deleteFile(storageKey: string): Promise<void> {
  try {
    await fs.unlink(resolveStoragePath(storageKey));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

/**
 * Moves a file between folders, keeping its generated name. Used when an asset
 * is reorganised in the media library.
 */
export async function moveFile(
  storageKey: string,
  destinationFolder: StorageFolder,
): Promise<string> {
  const source = resolveStoragePath(storageKey);
  const [, year, month, filename] = storageKey.split("/");
  const nextKey = `${destinationFolder}/${year}/${month}/${filename}`;
  const destination = resolveStoragePath(nextKey);

  if (source === destination) return storageKey;

  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.rename(source, destination);
  return nextKey;
}

/** Total bytes stored, for the media library and disk-usage reporting. */
export async function storageUsage(): Promise<{ files: number; bytes: number }> {
  const root = uploadRoot();
  let files = 0;
  let bytes = 0;

  async function walk(directory: string): Promise<void> {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
      } else if (entry.isFile()) {
        files += 1;
        bytes += (await fs.stat(entryPath)).size;
      }
    }
  }

  try {
    await walk(root);
  } catch {
    return { files: 0, bytes: 0 };
  }

  return { files, bytes };
}
