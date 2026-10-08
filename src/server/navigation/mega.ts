import { cache } from "react";

import { prisma } from "@/server/db";
import { publicUrlForKey } from "@/server/storage/paths";
import { categoryPath } from "@/server/categories/service";
import { specialtyPath } from "@/server/specialties/service";
import { solutionPath } from "@/server/solutions/service";

export type MegaLink = {
  name: string;
  href: string;
  summary: string | null;
  image: { url: string; alt: string } | null;
  count?: number;
};

export type MegaCategory = MegaLink & { children: MegaLink[] };

export type MegaMenuData = {
  categories: MegaCategory[];
  specialties: MegaLink[];
  solutions: MegaLink[];
};

const IMAGE = { select: { storageKey: true, altText: true } } as const;

const image = (
  asset: { storageKey: string; altText: string | null } | null,
  fallbackAlt: string,
) =>
  asset
    ? { url: publicUrlForKey(asset.storageKey), alt: asset.altText ?? fallbackAlt }
    : null;

const LIVE_PRODUCTS = {
  where: { deletedAt: null, status: "PUBLISHED" as const },
};

/**
 * What the header's mega menus list, straight from the published catalogue.
 *
 * The CMS menu decides which top-level entries exist and where they lead; this
 * fills an entry that has no children of its own, so a menu of plain links
 * ("Products", "Specialties") still opens onto the real catalogue, and stays
 * current as categories are published or withdrawn without anyone editing the
 * menu. Fail-soft: a header must render even when the catalogue cannot load.
 */
export const getMegaMenuData = cache(async (): Promise<MegaMenuData> => {
  try {
    const [categories, specialties, solutions] = await Promise.all([
      prisma.category.findMany({
        where: { deletedAt: null, status: "PUBLISHED", depth: 0 },
        orderBy: [{ featured: "desc" }, { order: "asc" }, { name: "asc" }],
        take: 12,
        select: {
          name: true,
          slug: true,
          shortDescription: true,
          image: IMAGE,
          _count: { select: { products: LIVE_PRODUCTS } },
          children: {
            where: { deletedAt: null, status: "PUBLISHED" },
            orderBy: [{ order: "asc" }, { name: "asc" }],
            take: 6,
            select: {
              name: true,
              slug: true,
              _count: { select: { products: LIVE_PRODUCTS } },
            },
          },
        },
      }),
      prisma.specialty.findMany({
        where: { status: "PUBLISHED" },
        orderBy: [{ featured: "desc" }, { order: "asc" }, { name: "asc" }],
        take: 10,
        select: { name: true, slug: true, shortDescription: true, image: IMAGE },
      }),
      prisma.solution.findMany({
        where: { status: "PUBLISHED" },
        orderBy: [{ featured: "desc" }, { order: "asc" }, { name: "asc" }],
        take: 6,
        select: { name: true, slug: true, shortDescription: true, image: IMAGE },
      }),
    ]);

    return {
      categories: categories.map((row) => ({
        name: row.name,
        href: categoryPath(row.slug),
        summary: row.shortDescription,
        image: image(row.image, row.name),
        count:
          row._count.products +
          row.children.reduce((sum, child) => sum + child._count.products, 0),
        children: row.children.map((child) => ({
          name: child.name,
          href: categoryPath(child.slug, row.slug),
          summary: null,
          image: null,
          count: child._count.products,
        })),
      })),
      specialties: specialties.map((row) => ({
        name: row.name,
        href: specialtyPath(row.slug),
        summary: row.shortDescription,
        image: image(row.image, row.name),
      })),
      solutions: solutions.map((row) => ({
        name: row.name,
        href: solutionPath(row.slug),
        summary: row.shortDescription,
        image: image(row.image, row.name),
      })),
    };
  } catch (error) {
    console.error(
      "Mega menu data unavailable",
      error instanceof Error ? error.message : "unknown",
    );
    return { categories: [], specialties: [], solutions: [] };
  }
});
