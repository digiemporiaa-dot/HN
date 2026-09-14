"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import { deleteFile } from "@/server/storage/files";
import {
  assetMetadataSchema,
  createFolderSchema,
  deleteAssetSchema,
  folderIdSchema,
  moveAssetSchema,
  renameFolderSchema,
} from "@/lib/validation/media";
import {
  assetUsage,
  createFolder,
  deleteFolder,
  renameFolder,
} from "./service";

export type MediaActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
  /** Present when a delete was refused pending confirmation. */
  usageWarning?: { count: number; places: string[] };
};

export async function createFolderAction(
  _previous: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  const actor = await requirePermission("MEDIA", "CREATE");

  const parsed = createFolderSchema.safeParse({
    name: formData.get("name"),
    parentId: formData.get("parentId") || null,
  });
  if (!parsed.success) {
    return {
      fieldErrors: {
        name: parsed.error.flatten().fieldErrors.name?.[0] ?? "Invalid name",
      },
    };
  }

  const result = await createFolder({
    name: parsed.data.name,
    parentId: parsed.data.parentId ?? null,
  });
  if (!result.ok) return { error: result.reason };

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "MEDIA_FOLDER_CREATED",
    module: "MEDIA",
    entityType: "MediaFolder",
    entityId: result.id,
    summary: `Created folder ${parsed.data.name}`,
  });

  revalidatePath("/admin/media");
  return { success: `Folder "${parsed.data.name}" created.` };
}

export async function renameFolderAction(
  _previous: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  const actor = await requirePermission("MEDIA", "EDIT");

  const parsed = renameFolderSchema.safeParse({
    folderId: formData.get("folderId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return { error: "Invalid request." };

  const result = await renameFolder(parsed.data);
  if (!result.ok) return { error: result.reason };

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "MEDIA_FOLDER_RENAMED",
    module: "MEDIA",
    entityType: "MediaFolder",
    entityId: parsed.data.folderId,
    summary: `Renamed folder to ${parsed.data.name}`,
  });

  revalidatePath("/admin/media");
  return { success: "Folder renamed." };
}

export async function deleteFolderAction(
  _previous: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  const actor = await requirePermission("MEDIA", "DELETE");

  const parsed = folderIdSchema.safeParse({ folderId: formData.get("folderId") });
  if (!parsed.success) return { error: "Invalid request." };

  const result = await deleteFolder(parsed.data.folderId);
  if (!result.ok) return { error: result.reason };

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "MEDIA_FOLDER_DELETED",
    module: "MEDIA",
    entityType: "MediaFolder",
    entityId: parsed.data.folderId,
  });

  revalidatePath("/admin/media");
  return { success: "Folder deleted." };
}

export async function updateAssetMetadataAction(
  _previous: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  const actor = await requirePermission("MEDIA", "EDIT");

  const parsed = assetMetadataSchema.safeParse({
    assetId: formData.get("assetId"),
    altText: formData.get("altText") ?? undefined,
    title: formData.get("title") ?? undefined,
    caption: formData.get("caption") ?? undefined,
    description: formData.get("description") ?? undefined,
  });
  if (!parsed.success) return { error: "Invalid request." };

  const asset = await prisma.mediaAsset.findFirst({
    where: { id: parsed.data.assetId, deletedAt: null },
    select: { id: true, originalName: true },
  });
  if (!asset) return { error: "That file no longer exists." };

  await prisma.mediaAsset.update({
    where: { id: asset.id },
    data: {
      altText: parsed.data.altText,
      title: parsed.data.title,
      caption: parsed.data.caption,
      description: parsed.data.description,
    },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "MEDIA_METADATA_UPDATED",
    module: "MEDIA",
    entityType: "MediaAsset",
    entityId: asset.id,
    summary: `Updated details for ${asset.originalName}`,
  });

  revalidatePath("/admin/media");
  return { success: "Details saved." };
}

export async function moveAssetAction(
  _previous: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  const actor = await requirePermission("MEDIA", "EDIT");

  const raw = formData.get("folderId");
  const parsed = moveAssetSchema.safeParse({
    assetId: formData.get("assetId"),
    folderId: typeof raw === "string" && raw ? raw : null,
  });
  if (!parsed.success) return { error: "Invalid request." };

  if (parsed.data.folderId) {
    const folder = await prisma.mediaFolder.findUnique({
      where: { id: parsed.data.folderId },
      select: { id: true },
    });
    if (!folder) return { error: "That folder no longer exists." };
  }

  // Only the logical location changes; the stored file is never relocated, so
  // there is no window in which the row points at a path that does not exist.
  await prisma.mediaAsset.update({
    where: { id: parsed.data.assetId },
    data: { folderId: parsed.data.folderId },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "MEDIA_MOVED",
    module: "MEDIA",
    entityType: "MediaAsset",
    entityId: parsed.data.assetId,
  });

  revalidatePath("/admin/media");
  return { success: "File moved." };
}

const USAGE_LABELS: Record<string, string> = {
  Staff: "staff profile",
  Product: "product",
  Category: "category",
  Brand: "brand",
  Page: "page",
  BlogPost: "blog post",
};

/**
 * Deletes an asset, refusing the first attempt when it is still referenced.
 *
 * The warning is not decorative: a file removed while a published page still
 * points at it produces a broken image that nobody notices until a customer
 * does. The administrator has to see where it is used and confirm.
 */
export async function deleteAssetAction(
  _previous: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  const actor = await requirePermission("MEDIA", "DELETE");

  const parsed = deleteAssetSchema.safeParse({
    assetId: formData.get("assetId"),
    confirmInUse: formData.get("confirmInUse") === "true",
  });
  if (!parsed.success) return { error: "Invalid request." };

  const asset = await prisma.mediaAsset.findFirst({
    where: { id: parsed.data.assetId, deletedAt: null },
    select: { id: true, originalName: true, storageKey: true },
  });
  if (!asset) return { error: "That file no longer exists." };

  const usages = await assetUsage(asset.id);

  if (usages.length > 0 && !parsed.data.confirmInUse) {
    const places = [
      ...new Set(
        usages.map(
          (usage) =>
            `${USAGE_LABELS[usage.entityType] ?? usage.entityType} (${usage.field})`,
        ),
      ),
    ];
    return { usageWarning: { count: usages.length, places } };
  }

  // Soft delete first so the record — and the ability to investigate — survives
  // even if removing the bytes fails.
  await prisma.mediaAsset.update({
    where: { id: asset.id },
    data: { deletedAt: new Date() },
  });
  await prisma.mediaUsage.deleteMany({ where: { assetId: asset.id } });

  try {
    await deleteFile(asset.storageKey);
  } catch (error) {
    console.error("Failed to remove media file from disk", {
      storageKey: asset.storageKey,
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "MEDIA_DELETED",
    module: "MEDIA",
    entityType: "MediaAsset",
    entityId: asset.id,
    summary: `Deleted ${asset.originalName}`,
    metadata: {
      storageKey: asset.storageKey,
      wasInUse: usages.length > 0,
      usageCount: usages.length,
    },
  });

  revalidatePath("/admin/media");
  return { success: `Deleted ${asset.originalName}.` };
}
