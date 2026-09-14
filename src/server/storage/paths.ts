import { randomBytes } from "node:crypto";
import path from "node:path";

import {
  findAllowedTypeByExtension,
  isStorageFolder,
  uploadRoot,
  type StorageFolder,
} from "./config";

export class StoragePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoragePathError";
  }
}

/**
 * A storage key is the path of a file relative to UPLOAD_ROOT, for example
 * `products/2026/09/3f2a…b1.webp`. Keys are generated, never derived from what
 * a client sent, and are the only thing persisted in the database.
 */
const STORAGE_KEY_PATTERN =
  /^[a-z0-9-]+\/\d{4}\/\d{2}\/[a-f0-9]{32}\.[a-z0-9]{2,5}$/;

export function isValidStorageKey(key: string): boolean {
  return STORAGE_KEY_PATTERN.test(key);
}

/**
 * Resolves a storage key to an absolute path, refusing anything that would
 * escape the upload root.
 *
 * The containment check is done after resolution rather than by inspecting the
 * input for "..", because encodings, symlinked segments and normalisation all
 * conspire to make string inspection unreliable. Comparing the resolved path
 * against the root is the check that actually holds.
 */
export function resolveStoragePath(storageKey: string): string {
  if (!storageKey || typeof storageKey !== "string") {
    throw new StoragePathError("A storage key is required.");
  }

  if (storageKey.includes("\0")) {
    throw new StoragePathError("Storage key contains a null byte.");
  }

  if (path.isAbsolute(storageKey) || storageKey.includes("\\")) {
    throw new StoragePathError("Storage key must be a relative POSIX path.");
  }

  const root = uploadRoot();
  const target = path.resolve(root, storageKey);
  const relative = path.relative(root, target);

  if (
    relative === "" ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    throw new StoragePathError("Storage key resolves outside the upload root.");
  }

  return target;
}

/** Splits a filename into its extension, lower-cased and without the dot. */
export function extensionOf(filename: string): string {
  const extension = path.extname(filename).replace(/^\./, "").toLowerCase();
  return extension;
}

/**
 * Builds the key a new file will be stored under.
 *
 * The name is random rather than a slug of the original: it removes any
 * dependence on client-supplied text, makes collisions a non-issue, and means a
 * file cannot be guessed at from the name of the thing it belongs to. The
 * original filename is kept as metadata instead.
 *
 * Files are sharded by year and month so no single directory accumulates
 * hundreds of thousands of entries.
 */
export function buildStorageKey(params: {
  folder: StorageFolder;
  extension: string;
  now?: Date;
}): string {
  if (!isStorageFolder(params.folder)) {
    throw new StoragePathError(`Unknown storage folder: ${params.folder}`);
  }

  const extension = params.extension.replace(/^\./, "").toLowerCase();
  if (!findAllowedTypeByExtension(extension)) {
    throw new StoragePathError(`Extension is not permitted: ${extension}`);
  }

  const now = params.now ?? new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const name = randomBytes(16).toString("hex");

  return `${params.folder}/${year}/${month}/${name}.${extension}`;
}

/** Public URL for a stored file. Uploads are never served from /public. */
export function publicUrlForKey(storageKey: string): string {
  return `/api/media/file/${storageKey}`;
}
