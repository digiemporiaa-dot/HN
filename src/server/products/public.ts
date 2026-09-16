import { prisma } from "@/server/db";
import { publicUrlForKey } from "@/server/storage/paths";
import { MAX_RFQ_LINES } from "@/lib/validation/rfq";

/**
 * Reads for the public catalogue.
 *
 * Kept apart from the admin service because the rules differ in one way that
 * matters: everything here is filtered to what a visitor may see, and the
 * filters are part of the query rather than something a caller remembers to
 * apply.
 */

const PUBLIC_IMAGE = { select: { storageKey: true, altText: true } } as const;

export type PublicImage = { url: string; alt: string };

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

/**
 * One product, with everything its page shows.
 *
 * Drafts are returned too: whether the visitor is allowed to see one is a
 * question for the route, which can tell a signed-in editor previewing their
 * work from a member of the public who should get a 404.
 */
export async function publicProduct(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, deletedAt: null },
    select: {
      id: true,
      slug: true,
      name: true,
      modelNumber: true,
      shortDescription: true,
      description: true,
      status: true,
      updatedAt: true,
      primaryImage: PUBLIC_IMAGE,
      images: {
        orderBy: { order: "asc" },
        select: { media: PUBLIC_IMAGE },
      },
      category: {
        select: {
          name: true,
          slug: true,
          status: true,
          parent: { select: { name: true, slug: true, status: true } },
        },
      },
      brand: { select: { name: true, slug: true, status: true } },
      specialties: {
        select: {
          specialty: { select: { name: true, slug: true, status: true } },
        },
      },
      solutions: {
        select: {
          solution: { select: { name: true, slug: true, status: true } },
        },
      },
      applications: {
        select: { application: { select: { name: true, slug: true } } },
      },
      specGroups: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          label: true,
          items: {
            orderBy: { order: "asc" },
            select: { id: true, label: true, value: true, unit: true },
          },
        },
      },
      documents: {
        where: { media: { deletedAt: null } },
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          kind: true,
          gated: true,
          media: { select: { storageKey: true, sizeBytes: true } },
        },
      },
      relatedFrom: {
        orderBy: { order: "asc" },
        select: {
          related: {
            select: {
              id: true,
              name: true,
              slug: true,
              modelNumber: true,
              shortDescription: true,
              status: true,
              deletedAt: true,
              primaryImage: PUBLIC_IMAGE,
              category: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!product) return null;

  const faqs = await prisma.faq.findMany({
    where: { entityType: "Product", entityId: product.id },
    orderBy: { order: "asc" },
    select: { id: true, question: true, answer: true },
  });

  const gallery = [
    ...(product.primaryImage
      ? [toImage(product.primaryImage, product.name)!]
      : []),
    ...product.images.flatMap((row) => {
      const image = toImage(row.media, product.name);
      return image ? [image] : [];
    }),
  ];

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    modelNumber: product.modelNumber,
    shortDescription: product.shortDescription,
    description: product.description,
    status: product.status,
    updatedAt: product.updatedAt,
    gallery,
    category: product.category,
    brand: product.brand,
    // Only published taxonomy is linked: a draft specialty has no page to
    // link to, and naming it would advertise something not yet public.
    specialties: product.specialties
      .map((row) => row.specialty)
      .filter((row) => row.status === "PUBLISHED"),
    solutions: product.solutions
      .map((row) => row.solution)
      .filter((row) => row.status === "PUBLISHED"),
    applications: product.applications.map((row) => row.application),
    specGroups: product.specGroups,
    // A gated document is listed by name and size but carries no href. Its
    // file is reachable only through a grant issued after an enquiry, and the
    // media route refuses it outright, so there is nothing here to leak.
    documents: product.documents.map((row) => ({
      id: row.id,
      title: row.title,
      kind: row.kind,
      gated: row.gated,
      href: row.gated ? null : publicUrlForKey(row.media.storageKey),
      sizeBytes: row.media.sizeBytes,
    })),
    related: product.relatedFrom
      .map((row) => row.related)
      .filter((row) => row.deletedAt === null && row.status === "PUBLISHED")
      .map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        modelNumber: row.modelNumber,
        shortDescription: row.shortDescription,
        categoryName: row.category.name,
        image: toImage(row.primaryImage, row.name),
      })),
    faqs,
  };
}

export type PublicProduct = NonNullable<
  Awaited<ReturnType<typeof publicProduct>>
>;

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  modelNumber: string | null;
  shortDescription: string | null;
  categoryName: string;
  brandName: string | null;
  image: PublicImage | null;
};

export type CatalogueFilters = {
  query?: string;
  categorySlug?: string;
  brandSlug?: string;
  specialtySlug?: string;
  solutionSlug?: string;
  applicationSlug?: string;
  page: number;
  pageSize: number;
};

/**
 * The catalogue index.
 *
 * Filters are given as slugs rather than ids so the URL a visitor copies says
 * what it selects, and an id that leaks into a link does not have to be a
 * meaningful part of the contract.
 */
export async function publicProductListing(filters: CatalogueFilters) {
  const where = {
    deletedAt: null,
    status: "PUBLISHED" as const,
    ...(filters.categorySlug
      ? {
          category: {
            // A parent category includes everything filed under its children.
            OR: [
              { slug: filters.categorySlug },
              { parent: { slug: filters.categorySlug } },
            ],
          },
        }
      : {}),
    ...(filters.brandSlug ? { brand: { slug: filters.brandSlug } } : {}),
    ...(filters.specialtySlug
      ? {
          specialties: { some: { specialty: { slug: filters.specialtySlug } } },
        }
      : {}),
    ...(filters.solutionSlug
      ? { solutions: { some: { solution: { slug: filters.solutionSlug } } } }
      : {}),
    ...(filters.applicationSlug
      ? {
          applications: {
            some: { application: { slug: filters.applicationSlug } },
          },
        }
      : {}),
    ...(filters.query
      ? {
          OR: [
            { name: { contains: filters.query, mode: "insensitive" as const } },
            {
              modelNumber: {
                contains: filters.query,
                mode: "insensitive" as const,
              },
            },
            {
              shortDescription: {
                contains: filters.query,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [{ featured: "desc" }, { order: "asc" }, { name: "asc" }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        modelNumber: true,
        shortDescription: true,
        primaryImage: PUBLIC_IMAGE,
        category: { select: { name: true } },
        brand: { select: { name: true, status: true } },
      },
    }),
  ]);

  return {
    total,
    products: rows.map(
      (row): ProductCardData => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        modelNumber: row.modelNumber,
        shortDescription: row.shortDescription,
        categoryName: row.category.name,
        // Draft means not visible publicly, and that has to include the name
        // appearing on someone else's card.
        brandName:
          row.brand?.status === "PUBLISHED" ? (row.brand?.name ?? null) : null,
        image: toImage(row.primaryImage, row.name),
      }),
    ),
  };
}

/**
 * The filter options the index offers.
 *
 * Only taxonomy that actually has published products behind it is listed — a
 * filter that can only ever return nothing is worse than no filter.
 */
export async function catalogueFacets() {
  const published = {
    some: { deletedAt: null, status: "PUBLISHED" as const },
  };

  const [categories, brands, specialties] = await Promise.all([
    prisma.category.findMany({
      where: { deletedAt: null, status: "PUBLISHED", depth: 0 },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        name: true,
        slug: true,
        children: {
          where: { deletedAt: null, status: "PUBLISHED", products: published },
          orderBy: [{ order: "asc" }, { name: "asc" }],
          select: { name: true, slug: true },
        },
        _count: {
          select: {
            products: { where: { deletedAt: null, status: "PUBLISHED" } },
          },
        },
      },
    }),
    prisma.brand.findMany({
      where: { status: "PUBLISHED", products: published },
      orderBy: { name: "asc" },
      select: { name: true, slug: true },
    }),
    prisma.specialty.findMany({
      where: {
        status: "PUBLISHED",
        products: {
          some: { product: { deletedAt: null, status: "PUBLISHED" } },
        },
      },
      orderBy: { name: "asc" },
      select: { name: true, slug: true },
    }),
  ]);

  return {
    categories: categories.filter(
      (row) => row._count.products > 0 || row.children.length > 0,
    ),
    brands,
    specialties,
  };
}

/**
 * Slugs to prerender.
 *
 * Fail-soft on purpose: the image is built where no database is reachable, and
 * an unlisted slug renders on demand and is cached from then on.
 */
export async function publishedProductSlugs(): Promise<string[]> {
  try {
    const rows = await prisma.product.findMany({
      where: { deletedAt: null, status: "PUBLISHED" },
      select: { slug: true },
      take: 2000,
    });
    return rows.map((row) => row.slug);
  } catch (error) {
    console.warn(
      "Skipping product prerendering: database unavailable at build time",
      error instanceof Error ? error.message : "unknown",
    );
    return [];
  }
}

export type QuoteLineProduct = {
  id: string;
  name: string;
  slug: string;
  modelNumber: string | null;
  categoryName: string;
  brandName: string | null;
  image: PublicImage | null;
};

/**
 * The products behind a quotation basket, resolved from their ids.
 *
 * The basket lives in the visitor's browser and so holds nothing but ids: every
 * name, model number and picture shown on the quotation page is read here. A
 * basket carrying an id that has since been unpublished or deleted simply comes
 * back short, and the page drops that line rather than showing a product the
 * catalogue no longer offers.
 */
export async function quoteLineProducts(
  ids: string[],
): Promise<QuoteLineProduct[]> {
  const wanted = [...new Set(ids)].slice(0, MAX_RFQ_LINES);
  if (wanted.length === 0) return [];

  const rows = await prisma.product.findMany({
    where: { id: { in: wanted }, deletedAt: null, status: "PUBLISHED" },
    select: {
      id: true,
      name: true,
      slug: true,
      modelNumber: true,
      category: { select: { name: true } },
      brand: { select: { name: true, status: true } },
      primaryImage: { select: { storageKey: true, altText: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    modelNumber: row.modelNumber,
    categoryName: row.category.name,
    // Draft brands stay unnamed here for the same reason they do on a card.
    brandName: row.brand?.status === "PUBLISHED" ? row.brand.name : null,
    image: toImage(row.primaryImage, row.name),
  }));
}
