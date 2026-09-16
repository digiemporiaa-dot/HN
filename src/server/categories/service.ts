import { cache } from "react";

import { prisma } from "@/server/db";

/**
 * The deepest level the catalogue routes can express.
 *
 * `/categories/[category]/[subcategory]` is two segments, so a third level
 * would have no public URL. The self-relation leaves room to raise this when
 * the routes grow; nothing else needs to change.
 */
export const MAX_CATEGORY_DEPTH = 1;

export const CATEGORY_LEVEL_LABEL = ["Category", "Subcategory"] as const;

const LIST_SELECT = {
  id: true,
  slug: true,
  name: true,
  parentId: true,
  depth: true,
  order: true,
  status: true,
  featured: true,
  updatedAt: true,
  _count: { select: { children: true } },
} as const;

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  depth: number;
  order: number;
  status: string;
  featured: boolean;
  updatedAt: Date;
  _count: { children: number };
};

/**
 * Parents of every listed row, resolved in one query.
 *
 * The subcategory screen shows which category each row belongs to; looking that
 * up per row would issue one query per line of the table.
 */
export async function parentNamesFor(
  rows: Array<{ parentId: string | null }>,
): Promise<Map<string, string>> {
  const ids = [
    ...new Set(rows.flatMap((row) => (row.parentId ? [row.parentId] : []))),
  ];
  if (ids.length === 0) return new Map();

  const parents = await prisma.category.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });

  return new Map(parents.map((parent) => [parent.id, parent.name]));
}

/** Categories that may parent a subcategory, for the picker. */
export const selectableParents = cache(async () => {
  return prisma.category.findMany({
    where: { deletedAt: null, depth: 0 },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
});

export async function findCategory(id: string) {
  return prisma.category.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      slug: true,
      name: true,
      parentId: true,
      depth: true,
      order: true,
      shortDescription: true,
      description: true,
      procurementInfo: true,
      imageId: true,
      bannerId: true,
      featured: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
      parent: { select: { id: true, name: true, slug: true } },
      children: {
        where: { deletedAt: null },
        orderBy: { order: "asc" },
        select: LIST_SELECT,
      },
    },
  });
}

/**
 * The public path for a category.
 *
 * Built from the stored slugs rather than an id, because the URL is the
 * contract with search engines and must survive renames of everything else.
 */
export function categoryPath(
  slug: string,
  parentSlug?: string | null,
): string {
  return parentSlug ? `/categories/${parentSlug}/${slug}` : `/categories/${slug}`;
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

export { LIST_SELECT as CATEGORY_LIST_SELECT };
