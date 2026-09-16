import { prisma } from "@/server/db";
import { publicUrlForKey } from "@/server/storage/paths";
import type { PublicImage } from "@/server/products/public";

/**
 * Public reads for the taxonomy landing pages.
 *
 * Brands, specialties and solutions are three different ideas that happen to
 * carry the same fields, so one shape is loaded for all three and the pages
 * differ only in their words. Categories are not folded in: they nest, they
 * own their products outright, and their URL has two levels.
 */

const IMAGE = { select: { storageKey: true, altText: true } } as const;

const toImage = (
  asset: { storageKey: string; altText: string | null } | null | undefined,
  fallbackAlt: string,
): PublicImage | null =>
  asset
    ? {
        url: publicUrlForKey(asset.storageKey),
        alt: asset.altText ?? fallbackAlt,
      }
    : null;

export type TaxonomyRecord = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  image: PublicImage | null;
  banner: PublicImage | null;
  status: string;
  /** Categories this record is linked to, already filtered to published ones. */
  categories: Array<{ name: string; slug: string; parentSlug: string | null }>;
  websiteUrl?: string | null;
};

type LinkRow = {
  category: {
    name: string;
    slug: string;
    status: string;
    deletedAt: Date | null;
    parent: { slug: string } | null;
  };
};

const linkedCategories = (rows: LinkRow[]) =>
  rows
    .map((row) => row.category)
    .filter((row) => row.status === "PUBLISHED" && row.deletedAt === null)
    .map((row) => ({
      name: row.name,
      slug: row.slug,
      parentSlug: row.parent?.slug ?? null,
    }));

const CATEGORY_LINK = {
  select: {
    category: {
      select: {
        name: true,
        slug: true,
        status: true,
        deletedAt: true,
        parent: { select: { slug: true } },
      },
    },
  },
} as const;

export async function publicBrand(
  slug: string,
): Promise<TaxonomyRecord | null> {
  const row = await prisma.brand.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      description: true,
      websiteUrl: true,
      status: true,
      logo: IMAGE,
      banner: IMAGE,
      categories: CATEGORY_LINK,
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.shortDescription,
    description: row.description,
    image: toImage(row.logo, row.name),
    banner: toImage(row.banner, row.name),
    status: row.status,
    websiteUrl: row.websiteUrl,
    categories: linkedCategories(row.categories),
  };
}

export async function publicSpecialty(
  slug: string,
): Promise<TaxonomyRecord | null> {
  const row = await prisma.specialty.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      description: true,
      status: true,
      image: IMAGE,
      banner: IMAGE,
      categories: CATEGORY_LINK,
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.shortDescription,
    description: row.description,
    image: toImage(row.image, row.name),
    banner: toImage(row.banner, row.name),
    status: row.status,
    categories: linkedCategories(row.categories),
  };
}

export async function publicSolution(
  slug: string,
): Promise<TaxonomyRecord | null> {
  const row = await prisma.solution.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      description: true,
      status: true,
      image: IMAGE,
      banner: IMAGE,
      categories: CATEGORY_LINK,
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.shortDescription,
    description: row.description,
    image: toImage(row.image, row.name),
    banner: toImage(row.banner, row.name),
    status: row.status,
    categories: linkedCategories(row.categories),
  };
}

/**
 * An application has no publishing lifecycle of its own — it is a label rather
 * than a page with a draft state — so it is always public once it exists.
 */
export async function publicApplication(
  slug: string,
): Promise<TaxonomyRecord | null> {
  const row = await prisma.application.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, description: true },
  });
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: null,
    description: row.description,
    image: null,
    banner: null,
    status: "PUBLISHED",
    categories: [],
  };
}

/**
 * A category, addressed by one or two slugs.
 *
 * Two segments must be a real parent-and-child pair. Accepting any child under
 * any parent would give every subcategory as many URLs as there are
 * categories, which is the kind of duplication that quietly costs a site its
 * rankings.
 */
export async function publicCategory(segments: string[]) {
  if (segments.length < 1 || segments.length > 2) return null;

  const [first, second] = segments;
  const slug = second ?? first;

  const row = await prisma.category.findFirst({
    where: { slug, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      depth: true,
      shortDescription: true,
      description: true,
      status: true,
      image: IMAGE,
      banner: IMAGE,
      parent: {
        select: { name: true, slug: true, status: true, deletedAt: true },
      },
      children: {
        where: { deletedAt: null, status: "PUBLISHED" },
        orderBy: [{ order: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          shortDescription: true,
          image: IMAGE,
          _count: {
            select: {
              products: { where: { deletedAt: null, status: "PUBLISHED" } },
            },
          },
        },
      },
      brands: {
        select: {
          brand: { select: { name: true, slug: true, status: true } },
        },
      },
    },
  });
  if (!row) return null;

  // The path must match the record: a top-level category has one segment, a
  // subcategory has its own parent's slug in front of it.
  const expected = row.parent ? [row.parent.slug, row.slug] : [row.slug];
  if (expected.join("/") !== segments.join("/")) return null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    depth: row.depth,
    shortDescription: row.shortDescription,
    description: row.description,
    status: row.status,
    image: toImage(row.image, row.name),
    banner: toImage(row.banner, row.name),
    parent:
      row.parent && row.parent.status === "PUBLISHED" && !row.parent.deletedAt
        ? { name: row.parent.name, slug: row.parent.slug }
        : null,
    children: row.children.map((child) => ({
      id: child.id,
      name: child.name,
      slug: child.slug,
      shortDescription: child.shortDescription,
      image: toImage(child.image, child.name),
      productCount: child._count.products,
    })),
    brands: row.brands
      .map((link) => link.brand)
      .filter((brand) => brand.status === "PUBLISHED"),
  };
}

export type PublicCategory = NonNullable<
  Awaited<ReturnType<typeof publicCategory>>
>;

export type TaxonomyCard = {
  id: string;
  name: string;
  slug: string;
  href: string;
  summary: string | null;
  image: PublicImage | null;
  productCount: number;
};

const publishedProducts = {
  where: { deletedAt: null, status: "PUBLISHED" as const },
};

/** Top-level categories for the categories index. */
export async function categoryIndex(): Promise<TaxonomyCard[]> {
  const rows = await prisma.category.findMany({
    where: { deletedAt: null, status: "PUBLISHED", depth: 0 },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      image: IMAGE,
      _count: { select: { products: publishedProducts } },
      children: {
        where: { deletedAt: null, status: "PUBLISHED" },
        select: { _count: { select: { products: publishedProducts } } },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    href: `/categories/${row.slug}`,
    summary: row.shortDescription,
    image: toImage(row.image, row.name),
    // A parent's count includes what sits in its subcategories, because that is
    // what a visitor finds when they open it.
    productCount:
      row._count.products +
      row.children.reduce((sum, child) => sum + child._count.products, 0),
  }));
}

export async function brandIndex(): Promise<TaxonomyCard[]> {
  const rows = await prisma.brand.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ featured: "desc" }, { order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      logo: IMAGE,
      _count: { select: { products: publishedProducts } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    href: `/brands/${row.slug}`,
    summary: row.shortDescription,
    image: toImage(row.logo, row.name),
    productCount: row._count.products,
  }));
}

async function linkedIndex(
  model: "specialty" | "solution",
): Promise<TaxonomyCard[]> {
  const delegate = model === "specialty" ? prisma.specialty : prisma.solution;
  const rows = await (delegate as typeof prisma.specialty).findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ featured: "desc" }, { order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      image: IMAGE,
      _count: {
        select: {
          products: {
            where: { product: { deletedAt: null, status: "PUBLISHED" } },
          },
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    href: `/${model === "specialty" ? "specialties" : "solutions"}/${row.slug}`,
    summary: row.shortDescription,
    image: toImage(row.image, row.name),
    productCount: row._count.products,
  }));
}

export const specialtyIndex = () => linkedIndex("specialty");
export const solutionIndex = () => linkedIndex("solution");

export async function applicationIndex(): Promise<TaxonomyCard[]> {
  const rows = await prisma.application.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      _count: {
        select: {
          products: {
            where: { product: { deletedAt: null, status: "PUBLISHED" } },
          },
        },
      },
    },
  });

  return rows
    .filter((row) => row._count.products > 0)
    .map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      href: `/applications/${row.slug}`,
      summary: row.description,
      image: null,
      productCount: row._count.products,
    }));
}

/**
 * Slugs to prerender, fail-soft for builds that have no database.
 */
async function slugsOf(
  load: () => Promise<Array<{ slug: string }>>,
  label: string,
): Promise<string[]> {
  try {
    return (await load()).map((row) => row.slug);
  } catch (error) {
    console.warn(
      `Skipping ${label} prerendering: database unavailable at build time`,
      error instanceof Error ? error.message : "unknown",
    );
    return [];
  }
}

export const publishedBrandSlugs = () =>
  slugsOf(
    () =>
      prisma.brand.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true },
        take: 1000,
      }),
    "brand",
  );

export const publishedSpecialtySlugs = () =>
  slugsOf(
    () =>
      prisma.specialty.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true },
        take: 1000,
      }),
    "specialty",
  );

export const publishedSolutionSlugs = () =>
  slugsOf(
    () =>
      prisma.solution.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true },
        take: 1000,
      }),
    "solution",
  );

export const applicationSlugs = () =>
  slugsOf(
    () => prisma.application.findMany({ select: { slug: true }, take: 1000 }),
    "application",
  );

/** Every published category as its URL segments, for prerendering. */
export async function publishedCategoryPaths(): Promise<string[][]> {
  try {
    const rows = await prisma.category.findMany({
      where: { deletedAt: null, status: "PUBLISHED" },
      select: { slug: true, parent: { select: { slug: true } } },
      take: 2000,
    });
    return rows.map((row) =>
      row.parent ? [row.parent.slug, row.slug] : [row.slug],
    );
  } catch (error) {
    console.warn(
      "Skipping category prerendering: database unavailable at build time",
      error instanceof Error ? error.message : "unknown",
    );
    return [];
  }
}
