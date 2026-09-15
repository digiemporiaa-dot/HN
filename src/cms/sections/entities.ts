import { prisma } from "@/server/db";
import { publicUrlForKey } from "@/server/storage/paths";
import { brandPath } from "@/server/brands/service";
import { categoryPath } from "@/server/categories/service";
import { productPath } from "@/server/products/service";
import { specialtyPath } from "@/server/specialties/service";
import type { ResolvedMedia } from "@/cms/render-page";
import type { EntityKind } from "./entity-kinds";

export type EntityDocument = {
  title: string;
  kind: string;
  href: string;
  sizeBytes: number;
};

/**
 * One shape for every catalogue record a section can show.
 *
 * Products, categories and brands differ in what they mean but not in what a
 * card needs from them, so the renderers take this rather than five nearly
 * identical types.
 */
export type ResolvedEntity = {
  id: string;
  name: string;
  href: string;
  summary: string;
  /** A second line — a model number, a parent category. */
  meta: string;
  image: ResolvedMedia | null;
  documents: EntityDocument[];
};

const image = (
  asset: { storageKey: string; altText: string | null } | null,
  fallbackAlt: string,
): ResolvedMedia | null =>
  asset
    ? {
        url: publicUrlForKey(asset.storageKey),
        alt: asset.altText ?? fallbackAlt,
      }
    : null;

export type EntityRequest = {
  kind: EntityKind;
  ids: string[];
  withDocuments: boolean;
};

/**
 * Loads every catalogue record the page asks for, one query per kind.
 *
 * Unpublished and deleted records are simply absent from the result, so a
 * product pulled off the site disappears from every page that featured it
 * without anyone having to remember which pages those were. Drafts never leak
 * through a section that happens to name them.
 */
export async function resolveEntities(
  requests: EntityRequest[],
): Promise<Map<string, ResolvedEntity>> {
  const byKind = new Map<EntityKind, Set<string>>();
  const documentsFor = new Set<string>();

  for (const request of requests) {
    const bucket = byKind.get(request.kind) ?? new Set<string>();
    for (const id of request.ids) {
      bucket.add(id);
      if (request.withDocuments) documentsFor.add(id);
    }
    byKind.set(request.kind, bucket);
  }

  const resolved = new Map<string, ResolvedEntity>();
  const key = (kind: EntityKind, id: string) => `${kind}:${id}`;

  const productIds = byKind.get("product");
  const categoryIds = byKind.get("category");
  const subcategoryIds = byKind.get("subcategory");
  const brandIds = byKind.get("brand");
  const specialtyIds = byKind.get("specialty");

  const [products, categories, brands, specialties, documents] =
    await Promise.all([
      productIds?.size
        ? prisma.product.findMany({
            where: {
              id: { in: [...productIds] },
              deletedAt: null,
              status: "PUBLISHED",
            },
            select: {
              id: true,
              name: true,
              slug: true,
              modelNumber: true,
              shortDescription: true,
              primaryImage: { select: { storageKey: true, altText: true } },
              brand: { select: { name: true } },
            },
          })
        : [],

      // Categories and subcategories are one table; the two kinds differ only
      // in which rows the editor is offered and how the link is built.
      categoryIds?.size || subcategoryIds?.size
        ? prisma.category.findMany({
            where: {
              id: { in: [...(categoryIds ?? []), ...(subcategoryIds ?? [])] },
              deletedAt: null,
              status: "PUBLISHED",
            },
            select: {
              id: true,
              name: true,
              slug: true,
              depth: true,
              shortDescription: true,
              image: { select: { storageKey: true, altText: true } },
              parent: { select: { slug: true, name: true } },
            },
          })
        : [],

      brandIds?.size
        ? prisma.brand.findMany({
            where: { id: { in: [...brandIds] }, status: "PUBLISHED" },
            select: {
              id: true,
              name: true,
              slug: true,
              shortDescription: true,
              logo: { select: { storageKey: true, altText: true } },
            },
          })
        : [],

      specialtyIds?.size
        ? prisma.specialty.findMany({
            where: { id: { in: [...specialtyIds] }, status: "PUBLISHED" },
            select: {
              id: true,
              name: true,
              slug: true,
              shortDescription: true,
              image: { select: { storageKey: true, altText: true } },
            },
          })
        : [],

      documentsFor.size
        ? prisma.productDocument.findMany({
            // Gated documents are withheld: the gate is a download route that
            // does not exist yet, and listing a file the site cannot actually
            // protect would hand it out rather than trade it for an enquiry.
            where: { productId: { in: [...documentsFor] }, gated: false },
            orderBy: { order: "asc" },
            select: {
              productId: true,
              title: true,
              kind: true,
              media: {
                select: { storageKey: true, sizeBytes: true, deletedAt: true },
              },
            },
          })
        : [],
    ]);

  const documentsByProduct = new Map<string, EntityDocument[]>();
  for (const row of documents) {
    if (row.media.deletedAt) continue;
    const list = documentsByProduct.get(row.productId) ?? [];
    list.push({
      title: row.title,
      kind: row.kind,
      href: publicUrlForKey(row.media.storageKey),
      sizeBytes: row.media.sizeBytes,
    });
    documentsByProduct.set(row.productId, list);
  }

  for (const product of products) {
    resolved.set(key("product", product.id), {
      id: product.id,
      name: product.name,
      href: productPath(product.slug),
      summary: product.shortDescription ?? "",
      meta: product.modelNumber ?? product.brand?.name ?? "",
      image: image(product.primaryImage, product.name),
      documents: documentsByProduct.get(product.id) ?? [],
    });
  }

  for (const category of categories) {
    const kind: EntityKind = category.depth === 0 ? "category" : "subcategory";
    resolved.set(key(kind, category.id), {
      id: category.id,
      name: category.name,
      href: categoryPath(category.slug, category.parent?.slug),
      summary: category.shortDescription ?? "",
      meta: category.parent?.name ?? "",
      image: image(category.image, category.name),
      documents: [],
    });
  }

  for (const brand of brands) {
    resolved.set(key("brand", brand.id), {
      id: brand.id,
      name: brand.name,
      href: brandPath(brand.slug),
      summary: brand.shortDescription ?? "",
      meta: "",
      image: image(brand.logo, brand.name),
      documents: [],
    });
  }

  for (const specialty of specialties) {
    resolved.set(key("specialty", specialty.id), {
      id: specialty.id,
      name: specialty.name,
      href: specialtyPath(specialty.slug),
      summary: specialty.shortDescription ?? "",
      meta: "",
      image: image(specialty.image, specialty.name),
      documents: [],
    });
  }

  return resolved;
}

export function entityKey(kind: EntityKind, id: string): string {
  return `${kind}:${id}`;
}
