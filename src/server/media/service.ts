import type { MediaKind } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import {
  isStorageFolder,
  LIBRARY_FOLDERS,
  type StorageFolder,
} from "@/server/storage/config";

/**
 * Two ideas share the word "folder" and are deliberately kept apart.
 *
 * The *physical* layout on disk is fixed and sharded by date — it exists to
 * keep directories a sane size, and nothing a user does reorganises it. The
 * *logical* tree in MediaFolder is what administrators see and rearrange.
 *
 * Moving an asset between logical folders therefore never touches the bytes:
 * it updates one column. That removes any possibility of a half-completed move
 * leaving a database row pointing at a file that is no longer there.
 */

const ROOT_LABELS: Record<StorageFolder, string> = {
  products: "Products",
  categories: "Categories",
  brands: "Brands",
  blogs: "Blogs",
  pages: "Pages",
  cities: "Locations",
  brochures: "Brochures",
  documents: "Documents",
  // Listed for completeness of the map. Form attachments never appear in the
  // media library: they are a stranger's files, not the company's.
  submissions: "Form attachments",
  general: "General",
};

export function slugifyFolderName(name: string): string {
  return name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/** Creates the fixed root folders if they are missing. Safe to call repeatedly. */
export async function ensureRootFolders(): Promise<void> {
  for (const slug of LIBRARY_FOLDERS) {
    await prisma.mediaFolder.upsert({
      where: { path: `/${slug}` },
      update: {},
      create: {
        name: ROOT_LABELS[slug],
        slug,
        path: `/${slug}`,
        depth: 0,
      },
    });
  }
}

export type FolderNode = {
  id: string;
  name: string;
  slug: string;
  path: string;
  depth: number;
  parentId: string | null;
  isRoot: boolean;
  assetCount: number;
};

export async function listFolders(): Promise<FolderNode[]> {
  const folders = await prisma.mediaFolder.findMany({
    orderBy: [{ path: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      path: true,
      depth: true,
      parentId: true,
      _count: { select: { assets: true } },
    },
  });

  return folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    slug: folder.slug,
    path: folder.path,
    depth: folder.depth,
    parentId: folder.parentId,
    isRoot: folder.depth === 0,
    assetCount: folder._count.assets,
  }));
}

/**
 * The physical destination for an upload is the root ancestor of the logical
 * folder, so a file dropped into "Products / Monitors" still lands under
 * products/ on disk. Anything unrecognised falls back to general/.
 */
/**
 * Where a file goes when the uploader had no folder selected.
 *
 * Defaulting to General rather than leaving folderId null matters: an unfiled
 * asset belongs to no folder, so it would be invisible in every folder view and
 * make the counts read zero while files clearly exist.
 */
export async function defaultFolderId(): Promise<string | null> {
  const general = await prisma.mediaFolder.findUnique({
    where: { path: "/general" },
    select: { id: true },
  });
  return general?.id ?? null;
}

export async function countAllAssets(): Promise<number> {
  return prisma.mediaAsset.count({ where: { deletedAt: null } });
}

export async function storageFolderForLogicalFolder(
  folderId: string | null,
): Promise<StorageFolder> {
  if (!folderId) return "general";

  const folder = await prisma.mediaFolder.findUnique({
    where: { id: folderId },
    select: { path: true },
  });
  if (!folder) return "general";

  const rootSlug = folder.path.split("/").filter(Boolean)[0] ?? "general";
  return isStorageFolder(rootSlug) ? rootSlug : "general";
}

export async function createFolder(params: {
  name: string;
  parentId: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  const slug = slugifyFolderName(params.name);
  if (!slug) return { ok: false, reason: "That name cannot be used." };

  let parentPath = "";
  let depth = 0;

  if (params.parentId) {
    const parent = await prisma.mediaFolder.findUnique({
      where: { id: params.parentId },
      select: { path: true, depth: true },
    });
    if (!parent)
      return { ok: false, reason: "The parent folder no longer exists." };

    // Deep trees make the picker unusable long before they hurt the database.
    if (parent.depth >= 3) {
      return {
        ok: false,
        reason: "Folders cannot be nested more than four levels deep.",
      };
    }
    parentPath = parent.path;
    depth = parent.depth + 1;
  }

  const path = `${parentPath}/${slug}`;

  const clash = await prisma.mediaFolder.findUnique({
    where: { path },
    select: { id: true },
  });
  if (clash)
    return {
      ok: false,
      reason: "A folder with that name already exists here.",
    };

  const folder = await prisma.mediaFolder.create({
    data: {
      name: params.name.trim(),
      slug,
      path,
      depth,
      parentId: params.parentId,
    },
    select: { id: true },
  });

  return { ok: true, id: folder.id };
}

export async function renameFolder(params: {
  folderId: string;
  name: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const folder = await prisma.mediaFolder.findUnique({
    where: { id: params.folderId },
    select: { id: true, depth: true, path: true, parentId: true },
  });
  if (!folder) return { ok: false, reason: "That folder no longer exists." };

  if (folder.depth === 0) {
    return {
      ok: false,
      reason:
        "The top-level folders mirror the storage layout and cannot be renamed.",
    };
  }

  const slug = slugifyFolderName(params.name);
  if (!slug) return { ok: false, reason: "That name cannot be used." };

  const parentPath = folder.path.slice(0, folder.path.lastIndexOf("/"));
  const nextPath = `${parentPath}/${slug}`;

  if (nextPath !== folder.path) {
    const clash = await prisma.mediaFolder.findUnique({
      where: { path: nextPath },
      select: { id: true },
    });
    if (clash)
      return {
        ok: false,
        reason: "A folder with that name already exists here.",
      };
  }

  const descendants = await prisma.mediaFolder.findMany({
    where: { path: { startsWith: `${folder.path}/` } },
    select: { id: true, path: true },
  });

  // Paths are materialised, so every descendant has to be rewritten with the
  // rename in one transaction — a partial rewrite would orphan a subtree.
  await prisma.$transaction([
    prisma.mediaFolder.update({
      where: { id: folder.id },
      data: { name: params.name.trim(), slug, path: nextPath },
    }),
    ...descendants.map((descendant) =>
      prisma.mediaFolder.update({
        where: { id: descendant.id },
        data: { path: nextPath + descendant.path.slice(folder.path.length) },
      }),
    ),
  ]);

  return { ok: true };
}

export async function deleteFolder(
  folderId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const folder = await prisma.mediaFolder.findUnique({
    where: { id: folderId },
    select: {
      depth: true,
      path: true,
      _count: { select: { assets: true, children: true } },
    },
  });
  if (!folder) return { ok: false, reason: "That folder no longer exists." };

  if (folder.depth === 0) {
    return { ok: false, reason: "The top-level folders cannot be deleted." };
  }
  if (folder._count.children > 0) {
    return { ok: false, reason: "Empty or move the subfolders first." };
  }
  if (folder._count.assets > 0) {
    return {
      ok: false,
      reason: `This folder still holds ${folder._count.assets} ${
        folder._count.assets === 1 ? "file" : "files"
      }. Move them first.`,
    };
  }

  await prisma.mediaFolder.delete({ where: { id: folderId } });
  return { ok: true };
}

export type AssetListFilters = {
  folderId?: string | null;
  query?: string;
  kind?: MediaKind;
  page: number;
  pageSize: number;
};

export async function listAssets(filters: AssetListFilters) {
  const where: Prisma.MediaAssetWhereInput = {
    deletedAt: null,
    ...(filters.folderId ? { folderId: filters.folderId } : {}),
    ...(filters.kind ? { kind: filters.kind } : {}),
    ...(filters.query
      ? {
          OR: [
            { originalName: { contains: filters.query, mode: "insensitive" } },
            { title: { contains: filters.query, mode: "insensitive" } },
            { altText: { contains: filters.query, mode: "insensitive" } },
            { description: { contains: filters.query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, assets] = await Promise.all([
    prisma.mediaAsset.count({ where }),
    prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        storageKey: true,
        originalName: true,
        mimeType: true,
        kind: true,
        sizeBytes: true,
        width: true,
        height: true,
        altText: true,
        title: true,
        caption: true,
        description: true,
        createdAt: true,
        folderId: true,
        uploadedBy: { select: { name: true } },
        _count: { select: { usages: true } },
      },
    }),
  ]);

  return { total, assets };
}

/** Where an asset is referenced, for the warning shown before deletion. */
export async function assetUsage(assetId: string) {
  return prisma.mediaUsage.findMany({
    where: { assetId },
    select: { entityType: true, entityId: true, field: true },
    take: 25,
  });
}

/**
 * Records that an entity references an asset. Idempotent, so re-saving a form
 * does not accumulate duplicate references.
 */
export async function recordUsage(params: {
  assetId: string;
  entityType: string;
  entityId: string;
  field: string;
}): Promise<void> {
  await prisma.mediaUsage.upsert({
    where: {
      assetId_entityType_entityId_field: {
        assetId: params.assetId,
        entityType: params.entityType,
        entityId: params.entityId,
        field: params.field,
      },
    },
    update: {},
    create: params,
  });
}

export async function clearUsage(params: {
  entityType: string;
  entityId: string;
  field: string;
}): Promise<void> {
  await prisma.mediaUsage.deleteMany({ where: params });
}
