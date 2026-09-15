import { prisma } from "@/server/db";

export const SPECIALTY_LIST_SELECT = {
  id: true,
  slug: true,
  name: true,
  status: true,
  featured: true,
  order: true,
  updatedAt: true,
  image: { select: { storageKey: true } },
  _count: { select: { categories: true } },
} as const;

export type SpecialtyRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  featured: boolean;
  order: number;
  updatedAt: Date;
  image: { storageKey: string } | null;
  _count: { categories: number };
};

export async function findSpecialty(id: string) {
  return prisma.specialty.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      shortDescription: true,
      description: true,
      imageId: true,
      bannerId: true,
      featured: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
      categories: { select: { categoryId: true } },
    },
  });
}

export function specialtyPath(slug: string): string {
  return `/specialties/${slug}`;
}
