import { prisma } from "@/server/db";

/** Where a city's page lives. One segment: the slug is unique across India. */
export function cityPath(slug: string): string {
  return `/locations/${slug}`;
}

export async function listStates() {
  return prisma.state.findMany({
    orderBy: [{ kind: "asc" }, { order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      code: true,
      kind: true,
      active: true,
      updatedAt: true,
      _count: { select: { cities: { where: { deletedAt: null } } } },
    },
  });
}

/** States a new city may be filed under. Inactive ones are hidden, not deleted. */
export async function activeStates() {
  return prisma.state.findMany({
    where: { active: true },
    orderBy: [{ name: "asc" }],
    select: { id: true, name: true, kind: true },
  });
}

export async function findState(id: string) {
  return prisma.state.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      code: true,
      kind: true,
      active: true,
      updatedAt: true,
      cities: {
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true, status: true },
      },
    },
  });
}

export const CITY_LIST_SELECT = {
  id: true,
  name: true,
  slug: true,
  status: true,
  indexable: true,
  updatedAt: true,
  state: { select: { name: true } },
  _count: { select: { sections: true } },
} as const;

export type CityRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  indexable: boolean;
  updatedAt: Date;
  state: { name: string };
  _count: { sections: number };
};

export async function findCity(id: string) {
  return prisma.city.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      stateId: true,
      state: { select: { id: true, name: true, active: true } },
      headline: true,
      heroImageId: true,
      intro: true,
      content: true,
      coverage: true,
      ctaHeading: true,
      ctaBody: true,
      ctaLabel: true,
      seoTitle: true,
      seoDescription: true,
      indexable: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
      categories: { orderBy: { order: "asc" }, select: { categoryId: true } },
      products: { orderBy: { order: "asc" }, select: { productId: true } },
      specialties: {
        orderBy: { order: "asc" },
        select: { specialtyId: true },
      },
      sections: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          order: true,
          enabled: true,
          anchorId: true,
          content: true,
          design: true,
          updatedAt: true,
        },
      },
    },
  });
}
