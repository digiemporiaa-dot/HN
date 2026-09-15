import { cache } from "react";

import { prisma } from "@/server/db";
import { publicUrlForKey } from "@/server/storage/paths";

/** The specifications a product currently carries, in display order. */
export async function productSpecs(productId: string) {
  return prisma.productSpecGroup.findMany({
    where: { productId },
    orderBy: { order: "asc" },
    select: {
      id: true,
      label: true,
      items: {
        orderBy: { order: "asc" },
        select: { id: true, label: true, value: true, unit: true },
      },
    },
  });
}

export async function productDocuments(productId: string) {
  return prisma.productDocument.findMany({
    where: { productId },
    orderBy: { order: "asc" },
    select: {
      id: true,
      mediaId: true,
      title: true,
      kind: true,
      gated: true,
      media: {
        select: { originalName: true, sizeBytes: true, mimeType: true },
      },
    },
  });
}

export async function productRelated(productId: string) {
  const links = await prisma.productRelated.findMany({
    where: { productId },
    orderBy: { order: "asc" },
    select: {
      relatedId: true,
      related: { select: { name: true, slug: true, deletedAt: true } },
    },
  });

  return links.map((link) => ({
    id: link.relatedId,
    name: link.related.name,
    slug: link.related.slug,
    deleted: link.related.deletedAt !== null,
  }));
}

export async function productFaqs(productId: string) {
  return prisma.faq.findMany({
    where: { entityType: "Product", entityId: productId },
    orderBy: { order: "asc" },
    select: { id: true, question: true, answer: true },
  });
}

/**
 * Files an editor may attach to a product.
 *
 * Documents only: the picker for images is a different control with thumbnails,
 * and offering a PNG here would produce a "download the brochure" link to a
 * picture.
 */
export const pickableDocuments = cache(async () => {
  const assets = await prisma.mediaAsset.findMany({
    where: { deletedAt: null, kind: "DOCUMENT" },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      storageKey: true,
      originalName: true,
      title: true,
      sizeBytes: true,
    },
  });

  return assets.map((asset) => ({
    id: asset.id,
    url: publicUrlForKey(asset.storageKey),
    name: asset.title || asset.originalName,
    fileName: asset.originalName,
    sizeBytes: asset.sizeBytes,
  }));
});

export type DocumentOption = Awaited<
  ReturnType<typeof pickableDocuments>
>[number];

/**
 * Products that may be linked as related.
 *
 * Deleted products are excluded and so is the product itself — a product
 * listed as related to itself is never what anyone meant.
 */
export async function relatableProducts(excludeId: string) {
  const rows = await prisma.product.findMany({
    where: { deletedAt: null, id: { not: excludeId } },
    orderBy: { name: "asc" },
    take: 500,
    select: {
      id: true,
      name: true,
      modelNumber: true,
      category: { select: { name: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.modelNumber ? `${row.name} (${row.modelNumber})` : row.name,
    group: row.category.name,
  }));
}

/** The application ids a product currently carries. */
export async function productApplicationLinks(productId: string) {
  const rows = await prisma.productApplication.findMany({
    where: { productId },
    select: { applicationId: true },
  });
  return rows.map((row) => row.applicationId);
}

export async function applicationChoices() {
  return prisma.application.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
}

/** The template a product's category defines, if it has one. */
export async function specTemplateFor(categoryId: string) {
  return prisma.specTemplate.findUnique({
    where: { categoryId },
    select: {
      id: true,
      name: true,
      groups: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          label: true,
          fields: {
            orderBy: { order: "asc" },
            select: { id: true, label: true, unit: true },
          },
        },
      },
    },
  });
}

/**
 * How much sits behind each tab, so the tab strip can say so.
 *
 * One query rather than five: the counts are only there to save a click, and
 * they should not cost more than the panel they describe.
 */
export async function productInfoCounts(productId: string) {
  const [product, faqs] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      select: {
        _count: {
          select: {
            specGroups: true,
            documents: true,
            applications: true,
            relatedFrom: true,
          },
        },
      },
    }),
    prisma.faq.count({
      where: { entityType: "Product", entityId: productId },
    }),
  ]);

  return {
    specs: product?._count.specGroups ?? 0,
    documents: product?._count.documents ?? 0,
    applications: product?._count.applications ?? 0,
    related: product?._count.relatedFrom ?? 0,
    faqs,
  };
}
