import type { MetadataRoute } from "next";

import { appUrl } from "@/lib/site-config";
import { prisma } from "@/server/db";
import { getSiteSettings } from "@/server/settings/service";

/**
 * The sitemap.
 *
 * Rebuilt hourly rather than on every request: it is a file for crawlers, not
 * a page, and a catalogue does not change often enough to justify half a dozen
 * queries per hit.
 */
export const revalidate = 3600;

type Entry = MetadataRoute.Sitemap[number];

const entry = (
  path: string,
  lastModified?: Date,
  priority?: number,
): Entry => ({
  url: new URL(path, appUrl()).toString(),
  ...(lastModified ? { lastModified } : {}),
  ...(priority !== undefined ? { priority } : {}),
});

/** The pages that exist whatever is in the database. */
const STATIC_ENTRIES: Entry[] = [
  entry("/", undefined, 1),
  entry("/products", undefined, 0.9),
  entry("/categories", undefined, 0.8),
  entry("/brands", undefined, 0.6),
  entry("/specialties", undefined, 0.6),
  entry("/solutions", undefined, 0.6),
  entry("/applications", undefined, 0.5),
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSiteSettings().catch(() => null);

  // A site asking not to be indexed should not hand crawlers a map of itself.
  if (settings?.seo.noindex) return [];

  try {
    const [
      pages,
      products,
      categories,
      brands,
      specialties,
      solutions,
      applications,
    ] = await Promise.all([
      prisma.page.findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        select: { slug: true, updatedAt: true },
      }),
      prisma.product.findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        select: { slug: true, updatedAt: true },
        take: 20000,
      }),
      prisma.category.findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        select: {
          slug: true,
          updatedAt: true,
          parent: { select: { slug: true } },
        },
        take: 5000,
      }),
      prisma.brand.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, updatedAt: true },
        take: 5000,
      }),
      prisma.specialty.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, updatedAt: true },
        take: 5000,
      }),
      prisma.solution.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, updatedAt: true },
        take: 5000,
      }),
      prisma.application.findMany({
        // Only applications something is actually filed under: a label with
        // no products behind it is a page with nothing on it.
        where: {
          products: {
            some: { product: { status: "PUBLISHED", deletedAt: null } },
          },
        },
        select: { slug: true, updatedAt: true },
        take: 5000,
      }),
    ]);

    return [
      ...STATIC_ENTRIES,
      ...pages.map((row) => entry(`/${row.slug}`, row.updatedAt, 0.7)),
      ...products.map((row) =>
        entry(`/products/${row.slug}`, row.updatedAt, 0.8),
      ),
      ...categories.map((row) =>
        entry(
          row.parent
            ? `/categories/${row.parent.slug}/${row.slug}`
            : `/categories/${row.slug}`,
          row.updatedAt,
          0.7,
        ),
      ),
      ...brands.map((row) => entry(`/brands/${row.slug}`, row.updatedAt, 0.6)),
      ...specialties.map((row) =>
        entry(`/specialties/${row.slug}`, row.updatedAt, 0.6),
      ),
      ...solutions.map((row) =>
        entry(`/solutions/${row.slug}`, row.updatedAt, 0.6),
      ),
      ...applications.map((row) =>
        entry(`/applications/${row.slug}`, row.updatedAt, 0.5),
      ),
    ];
  } catch (error) {
    // A sitemap listing the handful of pages that always exist is worth more
    // than a 500 that tells a crawler the whole file is broken.
    console.error(
      "Sitemap fell back to static entries: database unavailable",
      error instanceof Error ? error.message : "unknown",
    );
    return STATIC_ENTRIES;
  }
}
