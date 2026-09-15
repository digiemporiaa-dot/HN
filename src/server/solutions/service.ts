import { prisma } from "@/server/db";

export const SOLUTION_LIST_SELECT = {
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

export type SolutionRow = {
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

export async function findSolution(id: string) {
  return prisma.solution.findUnique({
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

export function solutionPath(slug: string): string {
  return `/solutions/${slug}`;
}
