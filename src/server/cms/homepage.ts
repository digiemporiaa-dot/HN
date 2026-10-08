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
  categories: 9,
  products: 8,
  specialties: 8,
  brands: 12,
  solutions: 6,
  applications: 6,
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
    applications,
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
      where: { ...LIVE_PRODUCT, featured: true },
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
    prisma.solution.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ featured: "desc" }, { order: "asc" }, { name: "asc" }],
      take: LIMITS.solutions,
      select: { id: true },
    }),
    prisma.application.findMany({
      where: { products: { some: { product: LIVE_PRODUCT } } },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      take: LIMITS.applications,
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
    categoryCount > 0 ? { value: String(categoryCount), label: "Equipment categories", detail: "From critical care to hospital furniture" } : null,
    productCount > 0 ? { value: String(productCount), label: "Products in the catalogue", detail: "Each quoted to your requirement" } : null,
    specialtyCount > 0 ? { value: String(specialtyCount), label: "Clinical specialties", detail: "Departments we equip" } : null,
    cityCount > 0 ? { value: String(cityCount), label: "Cities with local pages", detail: "Supply and service across India" } : null,
  ].filter((row): row is { value: string; label: string; detail: string } => row !== null);

  const sections = [
    section(
      "HERO",
      {
        overline: settings.companyName,
        heading: "Advanced Medical Technology. Built Around Better Care.",
        subheading:
          "Equipment and healthcare infrastructure solutions for hospitals, clinics, diagnostic centres and healthcare institutions across India.",
        primaryLabel: "Explore equipment",
        primaryHref: "/products",
        secondaryLabel: "Request a consultation",
        secondaryHref: "/contact",
        note: "For hospitals, clinics, diagnostic centres and healthcare institutions.",
        points: [
          { title: "Multi-category portfolio", detail: "Critical care to hospital furniture" },
          { title: "Procurement assistance", detail: "Specifications, quotations, documents" },
          { title: "Installation & support", detail: "Commissioning and after-sales care" },
          { title: "Pan-India supply", detail: "Single items to complete projects" },
        ],
      },
      { layout: "full", background: "dark", spacing: "xl" },
    ),
    brands.length > 0
      ? section(
          "LOGO_STRIP",
          { heading: "Brands we supply", items: ids(brands) },
          { background: "white", spacing: "compact", layout: "full" },
        )
      : null,
    categories.length > 0
      ? section(
          "CATEGORY_GRID",
          {
            overline: "Equipment categories",
            heading: "Explore the complete equipment portfolio.",
            intro:
              "From bedside monitoring to fully equipped operating theatres — every category we supply, install and support.",
            items: ids(categories),
            ctaLabel: "All categories",
            ctaHref: "/categories",
          },
          { layout: "bento", background: "default", spacing: "large" },
        )
      : null,
    solutions.length > 0
      ? section(
          "SOLUTION_GRID",
          {
            overline: "Healthcare solutions",
            heading: "Infrastructure for every clinical environment.",
            intro:
              "Planned equipment packages for new facilities, department upgrades and specialist units.",
            items: ids(solutions),
            ctaLabel: "All solutions",
            ctaHref: "/solutions",
          },
          { layout: "editorial", background: "dark", spacing: "large" },
        )
      : null,
    products.length > 0
      ? section(
          "PRODUCT_GRID",
          {
            overline: "Featured equipment",
            heading: "Selected technology for modern care.",
            items: ids(products),
            ctaLabel: "View all products",
            ctaHref: "/products",
          },
          { background: "pearl", columns: "4", spacing: "large" },
        )
      : null,
    specialties.length > 0
      ? section(
          "SPECIALTY_GRID",
          {
            overline: "Explore by specialty",
            heading: "Equipment matched to each department.",
            intro:
              "Browse the equipment typically specified for each clinical department.",
            items: ids(specialties),
            ctaLabel: "All specialties",
            ctaHref: "/specialties",
          },
          { columns: "4", spacing: "large" },
        )
      : null,
    section(
      "ICON_CARDS",
      {
        overline: `Why ${settings.companyName}`,
        heading: "Reliable technology. Professional procurement. Long-term support.",
        intro:
          "A single partner for specifying, sourcing, installing and supporting medical equipment — from one device to an entire facility.",
        ctaLabel: "Talk to our team",
        ctaHref: "/contact",
        items: [
          { title: "Multi-category equipment portfolio", body: "Monitoring, critical care, operation theatre, diagnostics, neonatal care and hospital furniture from one supplier.", icon: "portfolio", linkLabel: "", linkHref: "" },
          { title: "Pan-India supply capability", body: "Delivery and coordination for hospitals and clinics in metros and regional centres alike.", icon: "coverage", linkLabel: "", linkHref: "" },
          { title: "Procurement assistance", body: "Help comparing configurations, preparing specifications and building quotations for tenders.", icon: "procurement", linkLabel: "", linkHref: "" },
          { title: "Installation & support", body: "Installation, commissioning and user orientation, with after-sales service coordination.", icon: "installation", linkLabel: "", linkHref: "" },
          { title: "Documentation & product guidance", body: "Brochures, datasheets and product information to support clinical and purchase decisions.", icon: "documents", linkLabel: "", linkHref: "" },
        ],
      },
      { layout: "split", background: "gradient", spacing: "large" },
    ),
    section(
      "PROCESS_STEPS",
      {
        overline: "How we work",
        heading: "A clear path from requirement to installation.",
        intro: "",
        items: [
          { title: "Discover", body: "Share the department, the clinical need and the timeline." },
          { title: "Consult", body: "Our team reviews configurations and options with you." },
          { title: "Select", body: "Finalise the equipment list and specifications." },
          { title: "Quote", body: "Receive a detailed quotation for your requirement." },
          { title: "Deliver", body: "Coordinated delivery, installation and commissioning." },
          { title: "Support", body: "Ongoing service coordination after handover." },
        ],
      },
      { background: "default", spacing: "large" },
    ),
    figures.length >= 3
      ? section(
          "STATISTICS",
          {
            overline: "At a glance",
            heading: "A catalogue built for healthcare institutions.",
            intro: "",
            note: "Figures are counted from the live catalogue.",
            items: figures,
          },
          { background: "dark", columns: figures.length === 3 ? "3" : "4", spacing: "large" },
        )
      : null,
    applications.length > 0
      ? section(
          "APPLICATION_GRID",
          {
            overline: "Clinical environments",
            heading: "Where our equipment works.",
            intro: "Explore equipment by the environment it is designed for.",
            items: ids(applications),
            ctaLabel: "All applications",
            ctaHref: "/applications",
          },
          { background: "pearl", spacing: "large" },
        )
      : null,
    section(
      "POST_GRID",
      {
        overline: "Insights",
        heading: "Guidance for equipment planning and procurement.",
        items: [],
        ctaLabel: "All articles",
        ctaHref: "/blog",
      },
      { layout: "editorial", spacing: "large" },
    ),
    cityCount > 0
      ? section(
          "RELATED_LOCATIONS",
          {
            overline: "Pan-India coverage",
            heading: "Supplying healthcare institutions across India.",
            intro:
              "Local pages for the cities we serve, with the equipment hospitals there most often ask us about.",
            ctaLabel: "All locations",
            ctaHref: "/locations",
          },
          { background: "grid", spacing: "large" },
        )
      : null,
    section(
      "CTA",
      {
        overline: "Start a conversation",
        heading: "Planning a new healthcare facility?",
        body: "Talk to our medical equipment team about your procurement requirements — from a single device to a complete department.",
        primaryLabel: "Request a quote",
        primaryHref: "/rfq",
        secondaryLabel: "Talk to our team",
        secondaryHref: "/contact",
      },
      { background: "default", align: "left", spacing: "large" },
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
