import { prisma } from "@/server/db";
import { publicUrlForKey } from "@/server/storage/paths";
import { categoryPath } from "@/server/categories/service";
import type { ProductCardData, PublicImage } from "@/server/products/public";
import type { StoredSection } from "@/cms/render-page";
import { cityPath } from "./service";

/**
 * Public reads for the city pages.
 *
 * A city page is a set of links into the catalogue plus words somebody wrote
 * about that city. Everything it links to is filtered here to what a visitor
 * may see, so a category withdrawn after it was featured on a city simply
 * stops appearing rather than leading to a 404.
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

const PUBLISHED_PRODUCTS = {
  where: { deletedAt: null, status: "PUBLISHED" as const },
};

/**
 * One city, with everything its page shows.
 *
 * Drafts are returned too, for the same reason products and categories are:
 * the route decides whether the visitor is an editor previewing their work or
 * someone who should get a 404.
 */
export async function publicCity(slug: string) {
  const row = await prisma.city.findFirst({
    where: { slug, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      headline: true,
      intro: true,
      content: true,
      coverage: true,
      ctaHeading: true,
      ctaBody: true,
      ctaLabel: true,
      seoTitle: true,
      seoDescription: true,
      indexable: true,
      status: true,
      updatedAt: true,
      heroImage: {
        select: { storageKey: true, altText: true, deletedAt: true },
      },
      state: { select: { name: true, slug: true } },
      categories: {
        orderBy: { order: "asc" },
        select: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              shortDescription: true,
              status: true,
              deletedAt: true,
              image: IMAGE,
              parent: { select: { slug: true } },
              _count: { select: { products: PUBLISHED_PRODUCTS } },
              children: {
                where: { deletedAt: null, status: "PUBLISHED" },
                select: {
                  _count: { select: { products: PUBLISHED_PRODUCTS } },
                },
              },
            },
          },
        },
      },
      products: {
        orderBy: { order: "asc" },
        select: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              modelNumber: true,
              shortDescription: true,
              status: true,
              deletedAt: true,
              primaryImage: IMAGE,
              category: { select: { name: true } },
              brand: { select: { name: true, status: true } },
            },
          },
        },
      },
      specialties: {
        orderBy: { order: "asc" },
        select: {
          specialty: {
            select: {
              id: true,
              name: true,
              slug: true,
              shortDescription: true,
              status: true,
              image: IMAGE,
            },
          },
        },
      },
      sections: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          order: true,
          enabled: true,
          anchorId: true,
          content: true,
          design: true,
        },
      },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    path: cityPath(row.slug),
    headline: row.headline,
    intro: row.intro,
    content: row.content,
    coverage: row.coverage,
    ctaHeading: row.ctaHeading,
    ctaBody: row.ctaBody,
    ctaLabel: row.ctaLabel,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    indexable: row.indexable,
    status: row.status,
    updatedAt: row.updatedAt,
    // A hero picked from the library and later deleted there is no hero: the
    // page falls back to its typographic version instead of a broken image.
    heroImage:
      row.heroImage && !row.heroImage.deletedAt
        ? toImage(row.heroImage, row.name)
        : null,
    state: row.state,
    categories: row.categories
      .map((link) => link.category)
      .filter((row) => row.status === "PUBLISHED" && row.deletedAt === null)
      .map((category) => ({
        id: category.id,
        name: category.name,
        href: categoryPath(category.slug, category.parent?.slug),
        summary: category.shortDescription,
        image: toImage(category.image, category.name),
        productCount:
          category._count.products +
          category.children.reduce(
            (sum, child) => sum + child._count.products,
            0,
          ),
      })),
    products: row.products
      .map((link) => link.product)
      .filter((row) => row.status === "PUBLISHED" && row.deletedAt === null)
      .map(
        (product): ProductCardData => ({
          id: product.id,
          name: product.name,
          slug: product.slug,
          modelNumber: product.modelNumber,
          shortDescription: product.shortDescription,
          categoryName: product.category.name,
          // A draft brand's name stays off public cards, as everywhere else.
          brandName:
            product.brand?.status === "PUBLISHED" ? product.brand.name : null,
          image: toImage(product.primaryImage, product.name),
        }),
      ),
    specialties: row.specialties
      .map((link) => link.specialty)
      .filter((specialty) => specialty.status === "PUBLISHED")
      .map((specialty) => ({
        id: specialty.id,
        name: specialty.name,
        href: `/specialties/${specialty.slug}`,
        summary: specialty.shortDescription,
        image: toImage(specialty.image, specialty.name),
      })),
    sections: row.sections as StoredSection[],
  };
}

export type PublicCity = NonNullable<Awaited<ReturnType<typeof publicCity>>>;

/** The default heading, for a city whose editor has not written one. */
export function cityHeadline(city: { name: string; headline: string | null }) {
  return city.headline?.trim() || `Medical equipment supply in ${city.name}`;
}

/**
 * Published cities grouped by state, for the locations index.
 *
 * States with no published city are left out: an index of thirty-six states
 * with three of them clickable reads as a site that is mostly unfinished.
 */
export async function locationsIndex() {
  const states = await prisma.state.findMany({
    where: { cities: { some: { status: "PUBLISHED", deletedAt: null } } },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      kind: true,
      cities: {
        where: { status: "PUBLISHED", deletedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true, headline: true },
      },
    },
  });

  return states.map((state) => ({
    id: state.id,
    name: state.name,
    kind: state.kind,
    cities: state.cities.map((city) => ({
      id: city.id,
      name: city.name,
      href: cityPath(city.slug),
      headline: city.headline,
    })),
  }));
}

/**
 * Slugs to prerender. Published cities only, whether indexable or not: a page
 * kept out of search is still a page a visitor can be sent to.
 */
export async function publishedCitySlugs(): Promise<string[]> {
  try {
    const rows = await prisma.city.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      select: { slug: true },
    });
    return rows.map((row) => row.slug);
  } catch (error) {
    // Built without a database, as on Coolify: render on demand instead.
    console.warn(
      "Skipping city page prerendering: database unavailable at build time",
      error instanceof Error ? error.message : "unknown",
    );
    return [];
  }
}
