import fs from "node:fs/promises";
import path from "node:path";

import type { StorageFolder } from "../../src/server/storage/config";
import { prisma } from "../../src/server/db";
import {
  buildStorageKey,
  resolveStoragePath,
} from "../../src/server/storage/paths";

/**
 * Media helpers shared by the seeding scripts. Files go into the media
 * library exactly as an upload would, so editors can replace them later.
 */

/**
 * Store a file in the media library, or return the asset already stored
 * under the same original name, so running a seeder twice adds nothing.
 */
export async function storeFile(params: {
  originalName: string;
  bytes: Buffer;
  folder: StorageFolder;
  extension: string;
  mimeType: string;
  kind: "IMAGE" | "VECTOR" | "DOCUMENT";
  title: string;
  altText?: string;
  width?: number;
  height?: number;
}): Promise<string> {
  const existing = await prisma.mediaAsset.findFirst({
    where: { originalName: params.originalName, deletedAt: null },
    select: { id: true },
  });
  if (existing) return existing.id;

  const storageKey = buildStorageKey({ folder: params.folder, extension: params.extension });
  const file = resolveStoragePath(storageKey);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, params.bytes, { mode: 0o640 });

  const asset = await prisma.mediaAsset.create({
    data: {
      storageKey,
      originalName: params.originalName,
      mimeType: params.mimeType,
      kind: params.kind,
      sizeBytes: params.bytes.length,
      width: params.width,
      height: params.height,
      title: params.title,
      altText: params.altText,
    },
    select: { id: true },
  });
  return asset.id;
}

/**
 * Width and height from a WebP header, without an image library (the bundled
 * ops script runs where native modules are not available).
 */
export function webpSize(bytes: Buffer): [number, number] | null {
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8X") return [1 + bytes.readUIntLE(24, 3), 1 + bytes.readUIntLE(27, 3)];
  if (chunk === "VP8 ") return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
  if (chunk === "VP8L") {
    const bits = bytes.readUInt32LE(21);
    return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
  }
  return null;
}
