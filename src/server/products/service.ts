import { prisma } from "@/server/db";

export const PRODUCT_LIST_SELECT = {
  id: true,
  slug: true,
  name: true,
  modelNumber: true,
  status: true,
  featured: true,
  updatedAt: true,
  primaryImage: { select: { storageKey: true } },
  category: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } },
} as const;

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  modelNumber: string | null;
  status: string;
  featured: boolean;
  updatedAt: Date;
  primaryImage: { storageKey: string } | null;
  category: { id: string; name: string };
  brand: { id: string; name: string } | null;
};

export async function findProduct(id: string) {
  return prisma.product.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      slug: true,
      name: true,
      modelNumber: true,
      shortDescription: true,
      description: true,
      categoryId: true,
      brandId: true,
      primaryImageId: true,
      featured: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
      images: { orderBy: { order: "asc" }, select: { mediaId: true } },
      specialties: { select: { specialtyId: true } },
      solutions: { select: { solutionId: true } },
      category: { select: { name: true, slug: true } },
    },
  });
}

export type NamedChoice = { id: string; name: string };

/**
 * The taxonomy a product can be filed under, in one round trip.
 *
 * The edit screen needs all four lists at once, and issuing them separately
 * would make the form's cost grow with how many taxonomies exist rather than
 * with how much data there is.
 */
export async function productTaxonomies() {
  const [categories, brands, specialties, solutions] = await Promise.all([
    prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ depth: "asc" }, { order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        depth: true,
        parentId: true,
        parent: { select: { name: true } },
      },
    }),
    prisma.brand.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.specialty.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.solution.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return {
    // Parent then children, so the select reads as the catalogue does.
    categories: categories
      .filter((row) => row.depth === 0)
      .flatMap((parent) => [
        { id: parent.id, name: parent.name, depth: 0 },
        ...categories
          .filter((row) => row.parentId === parent.id)
          .map((child) => ({ id: child.id, name: child.name, depth: 1 })),
      ]),
    brands,
    specialties,
    solutions,
  };
}

/** The public path for a product. */
export function productPath(slug: string): string {
  return `/products/${slug}`;
}
