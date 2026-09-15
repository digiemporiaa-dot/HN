import { prisma } from "@/server/db";

export const APPLICATION_LIST_SELECT = {
  id: true,
  slug: true,
  name: true,
  order: true,
  updatedAt: true,
  _count: { select: { products: true } },
} as const;

export type ApplicationRow = {
  id: string;
  slug: string;
  name: string;
  order: number;
  updatedAt: Date;
  _count: { products: number };
};

export async function findApplication(id: string) {
  return prisma.application.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      updatedAt: true,
      _count: { select: { products: true } },
    },
  });
}

/** The public path for an application. */
export function applicationPath(slug: string): string {
  return `/applications/${slug}`;
}
