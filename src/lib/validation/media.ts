import { z } from "zod";

import { STORAGE_FOLDERS } from "@/server/storage/config";

export const folderNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a folder name")
  .max(64, "Folder names must be 64 characters or fewer")
  .regex(
    /^[\p{L}\p{N} ._-]+$/u,
    "Use letters, numbers, spaces, dots, hyphens or underscores",
  );

export const createFolderSchema = z.object({
  name: folderNameSchema,
  parentId: z.string().min(1).nullable().optional(),
});

export const renameFolderSchema = z.object({
  folderId: z.string().min(1),
  name: folderNameSchema,
});

export const folderIdSchema = z.object({
  folderId: z.string().min(1),
});

/**
 * Metadata is free text shown to visitors, so it is length-bounded and stored
 * as plain text. Alt text in particular is rendered into an attribute.
 */
export const assetMetadataSchema = z.object({
  assetId: z.string().min(1),
  altText: z.string().trim().max(300).optional().transform((v) => v || null),
  title: z.string().trim().max(200).optional().transform((v) => v || null),
  caption: z.string().trim().max(500).optional().transform((v) => v || null),
  description: z.string().trim().max(2000).optional().transform((v) => v || null),
});

export const moveAssetSchema = z.object({
  assetId: z.string().min(1),
  folderId: z.string().min(1).nullable(),
});

export const deleteAssetSchema = z.object({
  assetId: z.string().min(1),
  /** Set once the administrator has seen and accepted the usage warning. */
  confirmInUse: z.coerce.boolean().optional(),
});

export const uploadTargetSchema = z.object({
  folderId: z.string().min(1).nullable().optional(),
});

export const ROOT_FOLDER_SLUGS = STORAGE_FOLDERS;
