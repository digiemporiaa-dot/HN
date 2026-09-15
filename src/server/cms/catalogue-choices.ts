import { cache } from "react";

import { prisma } from "@/server/db";
import type { EntityKind } from "@/cms/sections/entity-kinds";

export type EntityChoice = {
  id: string;
  name: string;
  /** A second line in the picker — a category, a model number. */
  group: string;
  /** Shown so an editor knows a draft will not appear on the public page. */
  status: string;
};

export type CatalogueChoices = Record<EntityKind, EntityChoice[]>;

const LIMIT = 500;

/**
 * Everything an editor can point a section at.
 *
 * Drafts are offered and labelled rather than hidden: building a landing page
 * for a range that is not published yet is normal, and an editor who cannot see
 * the product at all has no way to tell whether they forgot to add it or it is
 * simply not live.
 */
export const catalogueChoices = cache(async (): Promise<CatalogueChoices> => {
  const [products, categories, brands, specialties] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      take: LIMIT,
      select: {
        id: true,
        name: true,
        status: true,
        modelNumber: true,
        category: { select: { name: true } },
      },
    }),
    prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ depth: "asc" }, { order: "asc" }, { name: "asc" }],
      take: LIMIT,
      select: {
        id: true,
        name: true,
        status: true,
        depth: true,
        parent: { select: { name: true } },
      },
    }),
    prisma.brand.findMany({
      orderBy: { name: "asc" },
      take: LIMIT,
      select: { id: true, name: true, status: true },
    }),
    prisma.specialty.findMany({
      orderBy: { name: "asc" },
      take: LIMIT,
      select: { id: true, name: true, status: true },
    }),
  ]);

  return {
    product: products.map((row) => ({
      id: row.id,
      name: row.name,
      group: [row.category.name, row.modelNumber].filter(Boolean).join(" · "),
      status: row.status,
    })),
    category: categories
      .filter((row) => row.depth === 0)
      .map((row) => ({
        id: row.id,
        name: row.name,
        group: "",
        status: row.status,
      })),
    subcategory: categories
      .filter((row) => row.depth > 0)
      .map((row) => ({
        id: row.id,
        name: row.name,
        group: row.parent?.name ?? "",
        status: row.status,
      })),
    brand: brands.map((row) => ({
      id: row.id,
      name: row.name,
      group: "",
      status: row.status,
    })),
    specialty: specialties.map((row) => ({
      id: row.id,
      name: row.name,
      group: "",
      status: row.status,
    })),
  };
});
