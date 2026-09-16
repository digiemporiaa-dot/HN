import path from "node:path";

import type { MediaKind } from "@/generated/prisma/enums";

/**
 * Persistent media storage on the VPS.
 *
 * UPLOAD_ROOT must point at a volume mounted into the container, never at a
 * path inside the image — anything written to the container filesystem is lost
 * on the next deploy, rebuild or restart.
 */
export function uploadRoot(): string {
  const configured = process.env.UPLOAD_ROOT?.trim();

  if (!configured) {
    throw new Error(
      "UPLOAD_ROOT is not set. It must point at a persistent volume, for example /data/hnmedical/uploads.",
    );
  }

  if (!path.isAbsolute(configured)) {
    throw new Error("UPLOAD_ROOT must be an absolute path.");
  }

  return path.resolve(configured);
}

/**
 * Top-level folders. Uploads are confined to these, so a caller cannot invent
 * a destination and scatter files across the volume.
 */
export const STORAGE_FOLDERS = [
  "products",
  "categories",
  "brands",
  "blogs",
  "pages",
  "cities",
  "brochures",
  "documents",
  /// What visitors attach to a form. Kept apart from every folder an
  /// administrator uploads into, so a stranger's file is never one directory
  /// listing away from the media library.
  "submissions",
  "general",
] as const;

export type StorageFolder = (typeof STORAGE_FOLDERS)[number];

/**
 * The folders the media library shows.
 *
 * "submissions" is a place on disk, not a folder in the library: a visitor's
 * attachment is never a MediaAsset, so a folder for it would sit permanently
 * empty next to the ones administrators actually use.
 */
export const LIBRARY_FOLDERS = STORAGE_FOLDERS.filter(
  (folder) => folder !== "submissions",
);

export function isStorageFolder(value: string): value is StorageFolder {
  return (STORAGE_FOLDERS as readonly string[]).includes(value);
}

type AllowedType = {
  mimeType: string;
  extensions: string[];
  kind: MediaKind;
  maxBytes: number;
};

const MEGABYTE = 1024 * 1024;

/**
 * The allowlist is by MIME type, and the extension must agree with it. Both
 * checks matter: the extension decides how the file is later served, and the
 * sniffed type decides what it actually is.
 *
 * Limits are conservative defaults; they become configurable through settings
 * once that module exists.
 */
export const ALLOWED_TYPES: AllowedType[] = [
  {
    mimeType: "image/jpeg",
    extensions: ["jpg", "jpeg"],
    kind: "IMAGE",
    maxBytes: 10 * MEGABYTE,
  },
  {
    mimeType: "image/png",
    extensions: ["png"],
    kind: "IMAGE",
    maxBytes: 10 * MEGABYTE,
  },
  {
    mimeType: "image/webp",
    extensions: ["webp"],
    kind: "IMAGE",
    maxBytes: 10 * MEGABYTE,
  },
  {
    mimeType: "image/avif",
    extensions: ["avif"],
    kind: "IMAGE",
    maxBytes: 10 * MEGABYTE,
  },
  {
    mimeType: "image/gif",
    extensions: ["gif"],
    kind: "IMAGE",
    maxBytes: 10 * MEGABYTE,
  },
  {
    mimeType: "image/svg+xml",
    extensions: ["svg"],
    kind: "VECTOR",
    maxBytes: 2 * MEGABYTE,
  },
  {
    mimeType: "application/pdf",
    extensions: ["pdf"],
    kind: "DOCUMENT",
    maxBytes: 25 * MEGABYTE,
  },
];

export const MAX_UPLOAD_BYTES = Math.max(
  ...ALLOWED_TYPES.map((type) => type.maxBytes),
);

export function findAllowedTypeByMime(mimeType: string): AllowedType | null {
  return ALLOWED_TYPES.find((type) => type.mimeType === mimeType) ?? null;
}

export function findAllowedTypeByExtension(
  extension: string,
): AllowedType | null {
  const normalised = extension.replace(/^\./, "").toLowerCase();
  return (
    ALLOWED_TYPES.find((type) => type.extensions.includes(normalised)) ?? null
  );
}

/** Content types served back, derived from the extension validated on upload. */
export function contentTypeForExtension(extension: string): string | null {
  return findAllowedTypeByExtension(extension)?.mimeType ?? null;
}
