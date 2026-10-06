import { prisma } from "@/server/db";
import { publicUrlForKey } from "@/server/storage/paths";

export type PostCardData = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  authorName: string | null;
  featured: boolean;
  publishedAt: Date | null;
  cover: { url: string; alt: string } | null;
};

const CARD_SELECT = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  authorName: true,
  featured: true,
  publishedAt: true,
  cover: {
    select: { storageKey: true, altText: true, deletedAt: true },
  },
} as const;

type CardRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  authorName: string | null;
  featured: boolean;
  publishedAt: Date | null;
  cover: {
    storageKey: string;
    altText: string | null;
    deletedAt: Date | null;
  } | null;
};

function toCard(row: CardRow): PostCardData {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    authorName: row.authorName,
    featured: row.featured,
    publishedAt: row.publishedAt,
    // A deleted image is not shown; an image without alt text is decorative
    // here, because the title beside it already says what the card is.
    cover:
      row.cover && !row.cover.deletedAt
        ? {
            url: publicUrlForKey(row.cover.storageKey),
            alt: row.cover.altText ?? "",
          }
        : null,
  };
}

const LIVE = { status: "PUBLISHED" as const, deletedAt: null };

/** Published posts, pinned ones first, then newest. */
export async function publicPostListing(page: number, pageSize: number) {
  const [total, rows] = await Promise.all([
    prisma.blogPost.count({ where: LIVE }),
    prisma.blogPost.findMany({
      where: LIVE,
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: CARD_SELECT,
    }),
  ]);
  return { total, posts: rows.map(toCard) };
}

/** A post by its address, published or not; the page decides who may see it. */
export async function publicPost(slug: string) {
  const row = await prisma.blogPost.findFirst({
    where: { slug, deletedAt: null },
    select: {
      ...CARD_SELECT,
      status: true,
      updatedAt: true,
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
        },
      },
    },
  });
  if (!row) return null;
  return {
    ...toCard(row),
    status: row.status,
    updatedAt: row.updatedAt,
    sections: row.sections,
  };
}

export async function publishedPostSlugs(): Promise<string[]> {
  try {
    const rows = await prisma.blogPost.findMany({
      where: LIVE,
      select: { slug: true },
    });
    return rows.map((row) => row.slug);
  } catch {
    // Built without a database: posts render on first request instead.
    return [];
  }
}

/** The latest other posts, for the end of an article. */
export async function morePosts(excludeId: string, take = 3) {
  const rows = await prisma.blogPost.findMany({
    where: { ...LIVE, id: { not: excludeId } },
    orderBy: { publishedAt: "desc" },
    take,
    select: CARD_SELECT,
  });
  return rows.map(toCard);
}
