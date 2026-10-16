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

const LIMITS = {
  categories: 10,
  products: 9,
  specialties: 8,
  brands: 12,
  solutions: 6,
};

const LIVE_PRODUCT = { deletedAt: null, status: "PUBLISHED" as const };

/**
 * A homepage assembled from what the site already knows.
 *
 * Used twice: rendered at / until an editor publishes a homepage of their own,
 * and written as the first draft when they set one up, so what they start
 * editing is exactly what visitors were already seeing.
 *
 * Every word comes from the settings or the catalogue, or is a plain
 * description of what the site does. The only figures are counts read from
 * the catalogue itself; a number, a client, a certification or a review is an
 * editor's to add, from the facts. A grid with nothing published to show is
 * left out rather than shown empty.
 */
export async function starterHomeSections(): Promise<StarterSection[]> {
  const [
    settings,
    categories,
    products,
    specialties,
    brands,
    solutions,
    counts,
  ] = await Promise.all([
    getSiteSettings(),
    prisma.category.findMany({
      where: { deletedAt: null, status: "PUBLISHED", depth: 0 },
      orderBy: [{ featured: "desc" }, { order: "asc" }, { name: "asc" }],
      take: LIMITS.categories,
      select: { id: true },
    }),
    prisma.product.findMany({
      where: LIVE_PRODUCT,
      orderBy: [{ featured: "desc" }, { order: "asc" }, { name: "asc" }],
      take: LIMITS.products,
      select: { id: true, name: true, slug: true, shortDescription: true, primaryImageId: true },
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
    prisma.solution.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ featured: "desc" }, { order: "asc" }, { name: "asc" }],
      take: LIMITS.solutions,
      select: { id: true },
    }),
    Promise.all([
      prisma.category.count({ where: { deletedAt: null, status: "PUBLISHED" } }),
      prisma.product.count({ where: LIVE_PRODUCT }),
      prisma.specialty.count({ where: { status: "PUBLISHED" } }),
      prisma.city.count({ where: { deletedAt: null, status: "PUBLISHED" } }),
    ]),
  ]);

  const ids = (rows: Array<{ id: string }>) => rows.map((row) => row.id);
  const [categoryCount, productCount, specialtyCount, cityCount] = counts;

  const figures = [
    categoryCount > 0 ? { value: String(categoryCount), label: "Product categories", detail: "From instruments to endoscopy systems" } : null,
    productCount > 0 ? { value: String(productCount), label: "Products in the catalogue", detail: "Each quoted to your requirement" } : null,
    specialtyCount > 0 ? { value: String(specialtyCount), label: "Specialties", detail: "Where our instruments are used" } : null,
    cityCount > 0 ? { value: String(cityCount), label: "Cities with local pages", detail: "Supply and service across India" } : null,
  ].filter((row): row is { value: string; label: string; detail: string } => row !== null);

  // The bento takes the first six products, the featured trio the next three.
  const bento = products.slice(0, 6);
  const featured = products.length > 6 ? products.slice(6, 9) : products.slice(0, 3);
  // Floating cards beside the hero: products that have a picture.
  const cards = products
    .filter((product) => product.primaryImageId)
    .slice(-3)
    .map((product) => ({
      title: product.name,
      detail: product.shortDescription?.split(/[.,]/)[0]?.slice(0, 80) ?? "",
      image: product.primaryImageId ?? "",
      href: `/products/${product.slug}`,
    }));

  const sections = [
    section(
      "HERO",
      {
        overline: "Surgical & laparoscopy instruments",
        heading: "**Surgical** instruments, / made for **precision**",
        subheading:
          settings.description ??
          "Open and laparoscopy instruments, endoscopy systems and sterilization trays for hospitals and surgeons.",
        primaryLabel: "Explore the catalogue",
        primaryHref: "/products",
        secondaryLabel: "Request a quote",
        secondaryHref: "/rfq",
        points: cards,
        statValue: productCount > 0 ? String(productCount) : "",
        statLabel: productCount > 0 ? "Products in the catalogue" : "",
        statDetail: productCount > 0
          ? "Each one quoted to your requirement, singly or as a complete set."
          : "",
      },
      { layout: "editorial", background: "default", spacing: "compact", container: "wide" },
    ),
    brands.length > 0
      ? section(
          "LOGO_STRIP",
          { heading: "Brands in our catalogue", items: ids(brands) },
          { background: "default", spacing: "compact", layout: "standard", container: "wide" },
        )
      : null,
    categories.length > 0
      ? section(
          "CATEGORY_GRID",
          {
            overline: "Our range",
            heading: "Explore by **category**.",
            intro: "",
            items: ids(categories),
            ctaLabel: "All categories",
            ctaHref: "/categories",
          },
          { layout: "standard", background: "pearl", spacing: "large", container: "wide" },
        )
      : null,
    figures.length >= 3
      ? section(
          "STATISTICS",
          {
            overline: `Why ${settings.companyName}`,
            heading:
              "Every instrument in the catalogue carries its own code, so an order is **a list of codes** — quoted to your requirement.",
            intro: "",
            note: "Figures are counted from the live catalogue.",
            ctaLabel: "Talk to our team",
            ctaHref: "/contact",
            items: figures.slice(0, 3),
          },
          { layout: "bento", background: "default", spacing: "xl", container: "wide" },
        )
      : null,
    bento.length > 0
      ? section(
          "PRODUCT_GRID",
          {
            overline: "",
            heading: "Engineered for **precision**.",
            items: ids(bento),
            ctaLabel: "View all products",
            ctaHref: "/products",
          },
          { layout: "bento", background: "grey", spacing: "large", container: "wide" },
        )
      : null,
    section(
      "CTA",
      {
        overline: "",
        heading: "Precision, in service of **surgery**.",
        body: "From a single instrument to a complete laparoscopy set, ordered by catalogue code.",
        primaryLabel: "Explore the catalogue",
        primaryHref: "/products",
        secondaryLabel: "",
        secondaryHref: "",
      },
      { layout: "full", background: "default", spacing: "large", container: "wide" },
    ),
    solutions.length > 0
      ? section(
          "SOLUTION_GRID",
          {
            overline: "Solutions",
            heading: "Designed around **clinical needs**.",
            intro: "",
            items: ids(solutions),
            ctaLabel: "All solutions",
            ctaHref: "/solutions",
          },
          { layout: "bento", background: "default", spacing: "large", container: "wide" },
        )
      : null,
    featured.length > 0
      ? section(
          "PRODUCT_GRID",
          {
            overline: "Featured",
            heading: "Featured **instruments**.",
            items: ids(featured),
            ctaLabel: "",
            ctaHref: "",
          },
          { layout: "editorial", background: "default", spacing: "xl", container: "wide" },
        )
      : null,
    specialties.length > 0
      ? section(
          "SPECIALTY_GRID",
          {
            overline: "Specialties",
            heading: "Instruments for every **specialty**.",
            intro: "Browse the instruments typically specified for each specialty.",
            items: ids(specialties),
            ctaLabel: "All specialties",
            ctaHref: "/specialties",
          },
          { columns: "4", background: "pearl", spacing: "large", container: "wide" },
        )
      : null,
    section(
      "PROCESS_STEPS",
      {
        overline: "How we work",
        heading: "From requirement to **installation**.",
        intro: "",
        items: [
          { title: "Choose", body: "Pick the instruments and their codes from the catalogue." },
          { title: "Send", body: "Send the codes and quantities through the quotation form, by phone or by email." },
          { title: "Quote", body: "We confirm the configuration and send you a quotation." },
          { title: "Deliver", body: "Your instruments are packed and dispatched." },
        ],
      },
      { background: "default", spacing: "large", container: "wide" },
    ),
    cityCount > 0
      ? section(
          "RELATED_LOCATIONS",
          {
            overline: "Pan-India",
            heading: "Surgical instruments, / closer to **you**.",
            intro:
              "Supplying hospitals and surgeons across India with instruments and complete sets.",
            ctaLabel: "All locations",
            ctaHref: "/locations",
          },
          { background: "grid", spacing: "large", container: "wide" },
        )
      : null,
    section(
      "POST_GRID",
      {
        overline: "Insights",
        heading: "Guidance for **better** procurement.",
        items: [],
        ctaLabel: "All articles",
        ctaHref: "/blog",
      },
      { layout: "editorial", background: "pearl", spacing: "large", container: "wide" },
    ),
    section(
      "CTA",
      {
        overline: "Start a conversation",
        heading: "Send us your **code list**.",
        body: "A single instrument, replacement inserts or a complete set — tell us the codes and quantities and we will prepare your quotation.",
        primaryLabel: "Request a quote",
        primaryHref: "/rfq",
        secondaryLabel: "Talk to our team",
        secondaryHref: "/contact",
      },
      { background: "dark", align: "left", spacing: "xl", container: "wide" },
    ),
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
