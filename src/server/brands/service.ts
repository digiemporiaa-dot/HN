import { prisma } from "@/server/db";

export const BRAND_LIST_SELECT = {
  id: true,
  slug: true,
  name: true,
  status: true,
  featured: true,
  order: true,
  updatedAt: true,
  logo: { select: { storageKey: true } },
  _count: { select: { categories: true } },
} as const;

export type BrandRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  featured: boolean;
  order: number;
  updatedAt: Date;
  logo: { storageKey: string } | null;
  _count: { categories: number };
};

export async function findBrand(id: string) {
  return prisma.brand.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      shortDescription: true,
      description: true,
      websiteUrl: true,
      logoId: true,
      bannerId: true,
      featured: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
      categories: { select: { categoryId: true } },
    },
  });
}

export type CategoryChoice = {
  id: string;
  name: string;
  depth: number;
  parentName: string | null;
};

/**
 * Every category a brand may be linked to, ordered as the catalogue reads.
 *
 * Both levels are offered: a brand may supply a whole category, or only one
 * subcategory within it, and forcing the broader claim would overstate what the
 * company actually sells.
 */
export async function linkableCategories(): Promise<CategoryChoice[]> {
  const rows = await prisma.category.findMany({
    where: { deletedAt: null },
    orderBy: [{ depth: "asc" }, { order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      depth: true,
      order: true,
      parentId: true,
      parent: { select: { name: true, order: true } },
    },
  });

  // Sorted so each parent is immediately followed by its own children, which is
  // how the picker groups them.
  const parents = rows.filter((row) => row.depth === 0);
  const childrenByParent = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!row.parentId) continue;
    const list = childrenByParent.get(row.parentId) ?? [];
    list.push(row);
    childrenByParent.set(row.parentId, list);
  }

  return parents.flatMap((parent) => [
    { id: parent.id, name: parent.name, depth: 0, parentName: null },
    ...(childrenByParent.get(parent.id) ?? []).map((child) => ({
      id: child.id,
      name: child.name,
      depth: 1,
      parentName: parent.name,
    })),
  ]);
}

export function brandPath(slug: string): string {
  return `/brands/${slug}`;
}
