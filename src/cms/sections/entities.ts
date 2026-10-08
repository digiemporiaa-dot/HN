import { prisma } from "@/server/db";
import { publicUrlForKey } from "@/server/storage/paths";
import { brandPath } from "@/server/brands/service";
import { categoryPath } from "@/server/categories/service";
import { productPath } from "@/server/products/service";
import { specialtyPath } from "@/server/specialties/service";
import { solutionPath } from "@/server/solutions/service";
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
  kind: EntityKind;
  name: string;
  href: string;
  summary: string;
  /** A second line — a model number, a parent category. */
  meta: string;
  /** A short label above the name — a product's category. */
  label: string;
  /** Published products behind the record, where that is meaningful. */
  count: number | null;
  /** Articles: when it was published (ISO) and by whom. */
  date: string | null;
  author: string | null;
  image: ResolvedMedia | null;
  documents: EntityDocument[];
};

const LIVE_PRODUCTS = {
  where: { deletedAt: null, status: "PUBLISHED" as const },
};
const LIVE_LINKED = {
  where: { product: { deletedAt: null, status: "PUBLISHED" as const } },
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
  const blank = {
    label: "",
    count: null,
    date: null,
    author: null,
    documents: [] as EntityDocument[],
  };

  const productIds = byKind.get("product");
  const categoryIds = byKind.get("category");
  const subcategoryIds = byKind.get("subcategory");
  const brandIds = byKind.get("brand");
  const specialtyIds = byKind.get("specialty");
  const solutionIds = byKind.get("solution");
  const applicationIds = byKind.get("application");
  const postIds = byKind.get("post");

  const [
    products,
    categories,
    brands,
    specialties,
    documents,
    solutions,
    applications,
    posts,
  ] = await Promise.all([
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
              brand: { select: { name: true, status: true } },
              category: { select: { name: true } },
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
              _count: { select: { products: LIVE_PRODUCTS } },
              children: {
                where: { deletedAt: null, status: "PUBLISHED" },
                select: { _count: { select: { products: LIVE_PRODUCTS } } },
              },
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
              _count: { select: { products: LIVE_LINKED } },
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

      solutionIds?.size
        ? prisma.solution.findMany({
            where: { id: { in: [...solutionIds] }, status: "PUBLISHED" },
            select: {
              id: true,
              name: true,
              slug: true,
              shortDescription: true,
              image: { select: { storageKey: true, altText: true } },
              _count: { select: { products: LIVE_LINKED } },
            },
          })
        : [],

      // An application is public while a published product carries it.
      applicationIds?.size
        ? prisma.application.findMany({
            where: {
              id: { in: [...applicationIds] },
              products: { some: LIVE_LINKED.where },
            },
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              image: { select: { storageKey: true, altText: true } },
              _count: { select: { products: LIVE_LINKED } },
            },
          })
        : [],

      postIds?.size
        ? prisma.blogPost.findMany({
            where: {
              id: { in: [...postIds] },
              status: "PUBLISHED",
              deletedAt: null,
            },
            select: {
              id: true,
              title: true,
              slug: true,
              excerpt: true,
              authorName: true,
              publishedAt: true,
              cover: {
                select: { storageKey: true, altText: true, deletedAt: true },
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
    // A draft brand is not named publicly, here as on every card.
    const brandName =
      product.brand?.status === "PUBLISHED" ? product.brand.name : null;
    resolved.set(key("product", product.id), {
      ...blank,
      id: product.id,
      kind: "product",
      name: product.name,
      href: productPath(product.slug),
      summary: product.shortDescription ?? "",
      meta: [brandName, product.modelNumber].filter(Boolean).join(" · "),
      label: product.category.name,
      image: image(product.primaryImage, product.name),
      documents: documentsByProduct.get(product.id) ?? [],
    });
  }

  for (const category of categories) {
    const kind: EntityKind = category.depth === 0 ? "category" : "subcategory";
    resolved.set(key(kind, category.id), {
      ...blank,
      id: category.id,
      kind,
      name: category.name,
      href: categoryPath(category.slug, category.parent?.slug),
      summary: category.shortDescription ?? "",
      meta: category.parent?.name ?? "",
      count:
        category._count.products +
        category.children.reduce((sum, child) => sum + child._count.products, 0),
      image: image(category.image, category.name),
    });
  }

  for (const brand of brands) {
    resolved.set(key("brand", brand.id), {
      ...blank,
      id: brand.id,
      kind: "brand",
      name: brand.name,
      href: brandPath(brand.slug),
      summary: brand.shortDescription ?? "",
      meta: "",
      image: image(brand.logo, brand.name),
    });
  }

  for (const specialty of specialties) {
    resolved.set(key("specialty", specialty.id), {
      ...blank,
      id: specialty.id,
      kind: "specialty",
      name: specialty.name,
      href: specialtyPath(specialty.slug),
      summary: specialty.shortDescription ?? "",
      meta: "",
      count: specialty._count.products,
      image: image(specialty.image, specialty.name),
    });
  }

  for (const solution of solutions) {
    resolved.set(key("solution", solution.id), {
      ...blank,
      id: solution.id,
      kind: "solution",
      name: solution.name,
      href: solutionPath(solution.slug),
      summary: solution.shortDescription ?? "",
      meta: "",
      count: solution._count.products,
      image: image(solution.image, solution.name),
    });
  }

  for (const application of applications) {
    resolved.set(key("application", application.id), {
      ...blank,
      id: application.id,
      kind: "application",
      name: application.name,
      href: `/applications/${application.slug}`,
      summary: application.description ?? "",
      meta: "",
      count: application._count.products,
      image: image(application.image, application.name),
    });
  }

  for (const post of posts) {
    resolved.set(key("post", post.id), {
      ...blank,
      id: post.id,
      kind: "post",
      name: post.title,
      href: `/blog/${post.slug}`,
      summary: post.excerpt ?? "",
      meta: "",
      date: post.publishedAt?.toISOString() ?? null,
      author: post.authorName,
      image:
        post.cover && !post.cover.deletedAt ? image(post.cover, post.title) : null,
    });
  }

  return resolved;
}

export function entityKey(kind: EntityKind, id: string): string {
  return `${kind}:${id}`;
}

/**
 * The newest published articles, for an article grid an editor left empty —
 * "show the latest" is what an empty selection there means.
 */
export async function latestPosts(take = 3): Promise<ResolvedEntity[]> {
  const ids = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
    take,
    select: { id: true },
  });
  if (ids.length === 0) return [];
  const resolved = await resolveEntities([
    { kind: "post", ids: ids.map((row) => row.id), withDocuments: false },
  ]);
  return ids.flatMap((row) => {
    const found = resolved.get(entityKey("post", row.id));
    return found ? [found] : [];
  });
}
