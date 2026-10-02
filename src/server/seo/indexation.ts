import { prisma } from "@/server/db";
import { getSiteSettings } from "@/server/settings/service";
import { internalTargetPath, normalisePath } from "@/lib/seo/redirect-paths";
import { appUrl } from "@/lib/site-config";
import { categoryPath } from "@/server/categories/service";
import { livePathOwner } from "./redirects";

/**
 * What search engines are being offered, and what is held back and why.
 *
 * Read-only and computed on demand: every number here comes from the same
 * rules the sitemap and the pages' robots tags apply, so the report cannot
 * drift from what is actually served.
 */

export type ExcludedPage = {
  path: string;
  reason: string;
  fixHref: string;
  fixLabel: string;
};

export type AttentionItem = {
  label: string;
  href: string;
  detail?: string;
};

export type AttentionGroup = {
  key: string;
  title: string;
  why: string;
  total: number;
  items: AttentionItem[];
};

const SAMPLE = 20;
const MAX_REDIRECT_CHECKS = 300;

function canonicalElsewhere(path: string, canonical: string): boolean {
  if (canonical.startsWith("/")) return normalisePath(canonical) !== path;
  try {
    const url = new URL(canonical);
    return (
      url.host !== new URL(appUrl()).host ||
      normalisePath(url.pathname) !== path
    );
  } catch {
    return true;
  }
}

export async function indexationReport() {
  const published = { status: "PUBLISHED" as const };
  const live = { ...published, deletedAt: null };

  const [
    settings,
    overrides,
    hiddenCities,
    counts,
    productsNoDescription,
    productsNoImage,
    categoriesNoDescription,
    redirects,
  ] = await Promise.all([
    getSiteSettings(),
    prisma.seoOverride.findMany({
      where: { OR: [{ noindex: true }, { canonical: { not: null } }] },
      select: { id: true, path: true, noindex: true, canonical: true },
      orderBy: { path: "asc" },
    }),
    prisma.city.findMany({
      where: { ...live, indexable: false },
      select: { id: true, slug: true, name: true },
      orderBy: { name: "asc" },
    }),
    Promise.all([
      prisma.product.count({ where: live }),
      prisma.category.count({ where: live }),
      prisma.brand.count({ where: published }),
      prisma.specialty.count({ where: published }),
      prisma.solution.count({ where: published }),
      prisma.application.count({
        where: {
          products: { some: { product: live } },
        },
      }),
      prisma.page.findMany({
        where: { ...live, slug: { not: "home" } },
        select: { slug: true },
      }),
      prisma.city.count({ where: live }),
    ]),
    prisma.product.findMany({
      where: {
        ...live,
        OR: [{ shortDescription: null }, { shortDescription: "" }],
      },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { ...live, primaryImageId: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 1000,
    }),
    prisma.category.findMany({
      where: {
        ...live,
        OR: [{ shortDescription: null }, { shortDescription: "" }],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        parent: { select: { slug: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.redirect.findMany({
      where: { active: true },
      select: { id: true, fromPath: true, toPath: true },
      orderBy: { updatedAt: "desc" },
      take: MAX_REDIRECT_CHECKS,
    }),
  ]);

  const [
    products,
    categories,
    brands,
    specialties,
    solutions,
    applications,
    pages,
    publishedCities,
  ] = counts;

  /* ----------------------------------------------- held out of the index -- */
  const excluded: ExcludedPage[] = [
    ...overrides.flatMap((row): ExcludedPage[] =>
      row.noindex
        ? [
            {
              path: row.path,
              reason: "Marked noindex in page metadata",
              fixHref: `/admin/seo/metadata/${row.id}`,
              fixLabel: "Edit override",
            },
          ]
        : row.canonical && canonicalElsewhere(row.path, row.canonical)
          ? [
              {
                path: row.path,
                reason: `Canonical points to ${row.canonical}`,
                fixHref: `/admin/seo/metadata/${row.id}`,
                fixLabel: "Edit override",
              },
            ]
          : [],
    ),
    ...hiddenCities.map((city) => ({
      path: `/locations/${city.slug}`,
      reason: "City page switched off for search",
      fixHref: `/admin/locations/cities/${city.id}`,
      fixLabel: "Edit city",
    })),
  ].sort((a, b) => a.path.localeCompare(b.path));

  const excludedPaths = new Set(excluded.map((row) => row.path));
  const excludedUnder = (prefix: string) =>
    [...excludedPaths].filter((path) => path.startsWith(prefix)).length;

  const types = [
    { label: "Products", total: products, out: excludedUnder("/products/") },
    {
      label: "Categories",
      total: categories,
      out: excludedUnder("/categories/"),
    },
    { label: "Brands", total: brands, out: excludedUnder("/brands/") },
    {
      label: "Specialties",
      total: specialties,
      out: excludedUnder("/specialties/"),
    },
    { label: "Solutions", total: solutions, out: excludedUnder("/solutions/") },
    {
      label: "Applications",
      total: applications,
      out: excludedUnder("/applications/"),
    },
    {
      label: "Pages",
      total: pages.length,
      out: pages.filter((page) => excludedPaths.has(`/${page.slug}`)).length,
    },
    {
      label: "City pages",
      total: publishedCities,
      out: excludedUnder("/locations/"),
    },
  ].map((row) => ({
    ...row,
    // Counted by address, so an override and a city switch holding the same
    // page out count it once.
    out: Math.min(row.total, row.out),
    in: Math.max(0, row.total - Math.min(row.total, row.out)),
  }));

  /* --------------------------------------------------- needs attention -- */
  const brokenRedirects: AttentionItem[] = [];
  for (const row of redirects) {
    const target = internalTargetPath(row.toPath);
    if (target === null) continue;
    if (!(await livePathOwner(target))) {
      brokenRedirects.push({
        label: `${row.fromPath} → ${row.toPath}`,
        href: `/admin/seo/redirects/${row.id}`,
        detail: "Nothing is published at the destination",
      });
    }
  }

  const orphanOverrides: AttentionItem[] = [];
  for (const row of await prisma.seoOverride.findMany({
    select: { id: true, path: true },
    orderBy: { path: "asc" },
    take: MAX_REDIRECT_CHECKS,
  })) {
    if (!(await livePathOwner(row.path))) {
      orphanOverrides.push({
        label: row.path,
        href: `/admin/seo/metadata/${row.id}`,
        detail: "Nothing is published at this address",
      });
    }
  }

  const attention: AttentionGroup[] = [
    {
      key: "redirects",
      title: "Redirects that lead nowhere",
      why: "A visitor following one lands on a missing page. Point it at a page that exists, or delete it.",
      total: brokenRedirects.length,
      items: brokenRedirects.slice(0, SAMPLE),
    },
    {
      key: "product-descriptions",
      title: "Products without a short description",
      why: "Search engines show a generic sentence for these instead of something written about the product.",
      total: productsNoDescription.length,
      items: productsNoDescription.slice(0, SAMPLE).map((row) => ({
        label: row.name,
        href: `/admin/products/${row.id}`,
        detail: `/products/${row.slug}`,
      })),
    },
    {
      key: "product-images",
      title: "Products without a main image",
      why: "Nothing to show in image results or when the page is shared.",
      total: productsNoImage.length,
      items: productsNoImage.slice(0, SAMPLE).map((row) => ({
        label: row.name,
        href: `/admin/products/${row.id}`,
      })),
    },
    {
      key: "category-descriptions",
      title: "Categories without a short description",
      why: "The category page falls back to a generic description in search results.",
      total: categoriesNoDescription.length,
      items: categoriesNoDescription.slice(0, SAMPLE).map((row) => ({
        label: row.name,
        href: `/admin/categories/${row.id}`,
        detail: categoryPath(row.slug, row.parent?.slug),
      })),
    },
    {
      key: "orphan-overrides",
      title: "Metadata for addresses with nothing published",
      why: "Kept for when something is published there; otherwise safe to delete.",
      total: orphanOverrides.length,
      items: orphanOverrides.slice(0, SAMPLE),
    },
  ];

  return {
    siteNoindex: settings.seo.noindex,
    types,
    excluded,
    attention,
    redirectsChecked: redirects.length,
    redirectCheckCapped: redirects.length === MAX_REDIRECT_CHECKS,
  };
}

export type IndexationReport = Awaited<ReturnType<typeof indexationReport>>;
