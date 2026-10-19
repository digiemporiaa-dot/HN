import { prisma } from "@/server/db";
import { publicUrlForKey } from "@/server/storage/paths";
import type { PublicImage } from "@/server/products/public";

/** The public page listing every published catalogue. */
export const CATALOGUES_PATH = "/catalogues";

export const CATALOGUE_LIST_SELECT = {
  id: true,
  title: true,
  status: true,
  gated: true,
  order: true,
  updatedAt: true,
  file: { select: { originalName: true, sizeBytes: true } },
  cover: { select: { storageKey: true } },
} as const;

export type CatalogueRow = {
  id: string;
  title: string;
  status: string;
  gated: boolean;
  order: number;
  updatedAt: Date;
  file: { originalName: string; sizeBytes: number };
  cover: { storageKey: string } | null;
};

export async function findCatalogue(id: string) {
  return prisma.catalogue.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      title: true,
      description: true,
      fileId: true,
      coverId: true,
      gated: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
    },
  });
}

/** PDFs in the media library, for the catalogue form's file choice. */
export async function catalogueFileOptions(): Promise<Array<{ id: string; name: string }>> {
  const files = await prisma.mediaAsset.findMany({
    where: { deletedAt: null, kind: "DOCUMENT", mimeType: "application/pdf" },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: { id: true, title: true, originalName: true },
  });
  return files.map((file) => ({ id: file.id, name: file.title || file.originalName }));
}

export type PublicCatalogue = {
  id: string;
  title: string;
  description: string | null;
  cover: PublicImage | null;
  gated: boolean;
  /** The file's address, only for an ungated catalogue. */
  href: string | null;
  sizeBytes: number;
};

/**
 * Published catalogues for the public page. A gated catalogue's file address
 * is never part of this: it is reachable only through a download grant.
 */
export async function publicCatalogues(): Promise<PublicCatalogue[]> {
  const rows = await prisma.catalogue.findMany({
    where: { status: "PUBLISHED", deletedAt: null, file: { deletedAt: null } },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      gated: true,
      file: { select: { storageKey: true, sizeBytes: true } },
      cover: { select: { storageKey: true, altText: true, deletedAt: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    cover:
      row.cover && !row.cover.deletedAt
        ? { url: publicUrlForKey(row.cover.storageKey), alt: row.cover.altText ?? `${row.title} cover` }
        : null,
    gated: row.gated,
    href: row.gated ? null : publicUrlForKey(row.file.storageKey),
    sizeBytes: row.file.sizeBytes,
  }));
}

/** Whether any catalogue is published, for the footer and header links. */
export async function hasPublishedCatalogues(): Promise<boolean> {
  const count = await prisma.catalogue.count({
    where: { status: "PUBLISHED", deletedAt: null, file: { deletedAt: null } },
  });
  return count > 0;
}
