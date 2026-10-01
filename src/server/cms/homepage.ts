import { prisma } from "@/server/db";
import { getSiteSettings } from "@/server/settings/service";
import { defaultsFor } from "@/cms/sections/definitions";
import type { StoredSection } from "@/cms/render-page";

/**
 * The homepage.
 *
 * An ordinary CMS page with a reserved slug, so it is edited with the same
 * section editor as every other page and needs no second system. The slug is
 * reserved, which means no editor can create it through the pages form and
 * the catch-all route never serves it at /home: it exists only at /.
 */
export const HOME_SLUG = "home";

export const isHomeSlug = (slug: string) => slug === HOME_SLUG;

/** Where a page lives publicly — the root for the homepage, /slug otherwise. */
export const pagePublicPath = (slug: string) =>
  isHomeSlug(slug) ? "/" : `/${slug}`;

const SECTION_SELECT = {
  orderBy: { order: "asc" as const },
  select: {
    id: true,
    type: true,
    order: true,
    enabled: true,
    anchorId: true,
    content: true,
    design: true,
  },
};

/** The homepage record, whatever its status. Null until somebody sets it up. */
export async function homePageRecord() {
  return prisma.page.findUnique({
    where: { slug: HOME_SLUG },
    select: {
      id: true,
      title: true,
      status: true,
      deletedAt: true,
      updatedAt: true,
      sections: SECTION_SELECT,
    },
  });
}

/**
 * The published homepage's sections, or null when the public should see the
 * starter instead: not set up, not published, or published with every section
 * switched off — an empty root page is never the right answer.
 */
export async function publishedHomeSections(): Promise<StoredSection[] | null> {
  const page = await prisma.page.findFirst({
    where: { slug: HOME_SLUG, status: "PUBLISHED", deletedAt: null },
    select: { sections: SECTION_SELECT },
  });
  if (!page || !page.sections.some((section) => section.enabled)) return null;
  return page.sections as StoredSection[];
}

type StarterSection = {
  type: string;
  content: Record<string, unknown>;
  design: Record<string, unknown>;
};

function section(
  type: string,
  content: Record<string, unknown>,
  design: Record<string, unknown> = {},
): StarterSection | null {
  const defaults = defaultsFor(type);
  if (!defaults) return null;
  return {
    type,
    content: { ...defaults.content, ...content },
    design: { ...defaults.design, ...design },
  };
}

const LIMITS = { categories: 8, products: 8, specialties: 6, brands: 12 };

/**
 * A homepage assembled from what the site already knows.
 *
 * Used twice: rendered at / until an editor publishes a homepage of their own,
 * and written as the first draft when they set one up, so what they start
 * editing is exactly what visitors were already seeing.
 *
 * Every word comes from the settings or the catalogue, or is a plain
 * description of what the site does. Nothing here claims a number, a client, a
 * certification or a review: those are an editor's to add, from the facts.
 * A grid with nothing published to show is left out rather than shown empty.
 */
export async function starterHomeSections(): Promise<StarterSection[]> {
  const [settings, categories, products, specialties, brands] =
    await Promise.all([
      getSiteSettings(),
      prisma.category.findMany({
        where: { deletedAt: null, status: "PUBLISHED", depth: 0 },
        orderBy: [{ featured: "desc" }, { order: "asc" }, { name: "asc" }],
        take: LIMITS.categories,
        select: { id: true },
      }),
      prisma.product.findMany({
        where: { deletedAt: null, status: "PUBLISHED", featured: true },
        orderBy: [{ order: "asc" }, { name: "asc" }],
        take: LIMITS.products,
        select: { id: true },
      }),
      prisma.specialty.findMany({
        where: { status: "PUBLISHED" },
        orderBy: [{ featured: "desc" }, { order: "asc" }, { name: "asc" }],
        take: LIMITS.specialties,
        select: { id: true },
      }),
      prisma.brand.findMany({
        where: { status: "PUBLISHED" },
        orderBy: [{ featured: "desc" }, { order: "asc" }, { name: "asc" }],
        take: LIMITS.brands,
        select: { id: true },
      }),
    ]);

  const ids = (rows: Array<{ id: string }>) => rows.map((row) => row.id);

  const sections = [
    section("HERO", {
      overline: settings.companyName,
      heading:
        settings.tagline ??
        "Medical, surgical and hospital equipment for healthcare institutions",
      subheading:
        settings.description ??
        "Supply, installation and service of equipment for hospitals, clinics and diagnostic centres, quoted to requirement.",
      primaryLabel: "Browse the catalogue",
      primaryHref: "/products",
      secondaryLabel: "Explore categories",
      secondaryHref: "/categories",
    }),
    categories.length > 0
      ? section("CATEGORY_GRID", {
          overline: "Catalogue",
          heading: "Equipment by category",
          intro: "Every range we supply, install and service.",
          items: ids(categories),
          ctaLabel: "All categories",
          ctaHref: "/categories",
        })
      : null,
    products.length > 0
      ? section(
          "PRODUCT_GRID",
          {
            overline: "Featured",
            heading: "Featured equipment",
            items: ids(products),
            ctaLabel: "View all products",
            ctaHref: "/products",
          },
          { background: "light" },
        )
      : null,
    specialties.length > 0
      ? section("SPECIALTY_GRID", {
          overline: "Specialties",
          heading: "Departments we equip",
          items: ids(specialties),
          ctaLabel: "All specialties",
          ctaHref: "/specialties",
        })
      : null,
    brands.length > 0
      ? section(
          "BRAND_GRID",
          {
            overline: "Brands",
            heading: "Manufacturers we supply",
            items: ids(brands),
            ctaLabel: "All brands",
            ctaHref: "/brands",
          },
          { background: "light" },
        )
      : null,
    section("CTA", {
      heading: "Planning a new department or an upgrade?",
      body: "Build a list from the catalogue and send it in one request. Everything is quoted to requirement.",
      primaryLabel: "Browse the catalogue",
      primaryHref: "/products",
      secondaryLabel: "Browse by specialty",
      secondaryHref: "/specialties",
    }),
  ];

  return sections.filter((row): row is StarterSection => row !== null);
}

/** The starter, shaped as rendered sections, for / before a homepage exists. */
export async function starterHomeForRender(): Promise<StoredSection[]> {
  const sections = await starterHomeSections();
  return sections.map((row, index) => ({
    id: `starter-${index}`,
    type: row.type,
    order: index,
    enabled: true,
    anchorId: null,
    content: row.content,
    design: row.design,
  }));
}
