import { cache } from "react";
import type { Metadata } from "next";

import { prisma } from "@/server/db";
import { publicUrlForKey } from "@/server/storage/paths";
import { normalisePath } from "@/lib/seo/redirect-paths";
import { appUrl } from "@/lib/site-config";

export type SeoOverrideValues = {
  title: string | null;
  titleAbsolute: boolean;
  description: string | null;
  canonical: string | null;
  noindex: boolean;
  ogImageUrl: string | null;
};

/**
 * The override for one public address, if an SEO editor has written one.
 *
 * Read once per request, and never fatal: a page whose metadata cannot be
 * looked up still renders with its own.
 */
export const seoOverrideFor = cache(
  async (path: string): Promise<SeoOverrideValues | null> => {
    try {
      const row = await prisma.seoOverride.findUnique({
        where: { path: normalisePath(path) },
        select: {
          title: true,
          titleAbsolute: true,
          description: true,
          canonical: true,
          noindex: true,
          ogImage: { select: { storageKey: true, deletedAt: true } },
        },
      });
      if (!row) return null;
      return {
        title: row.title,
        titleAbsolute: row.titleAbsolute,
        description: row.description,
        canonical: row.canonical,
        noindex: row.noindex,
        ogImageUrl:
          row.ogImage && !row.ogImage.deletedAt
            ? publicUrlForKey(row.ogImage.storageKey)
            : null,
      };
    } catch (error) {
      console.error(
        "SEO override lookup failed",
        error instanceof Error ? error.message : "unknown",
      );
      return null;
    }
  },
);

/** Whether metadata already asks not to be indexed. */
function alreadyNoindex(robots: Metadata["robots"]): boolean {
  if (!robots) return false;
  if (typeof robots === "string") return /noindex/i.test(robots);
  return robots.index === false;
}

/**
 * A page's own metadata with the SEO team's override laid over it.
 *
 * Each field replaces the page's only when the override sets it. `noindex`
 * can only be added: a draft, a preview or a city that is switched off for
 * search stays out of the index whatever an override says, because the page
 * knows things about itself the override cannot.
 */
export async function withSeoOverride(
  path: string,
  base: Metadata,
): Promise<Metadata> {
  const override = await seoOverrideFor(path);
  if (!override) return base;

  const title = override.title
    ? override.titleAbsolute
      ? { absolute: override.title }
      : override.title
    : base.title;
  const description = override.description ?? base.description;
  const ogTitle = override.title ?? undefined;

  return {
    ...base,
    title,
    description,
    alternates: {
      ...base.alternates,
      ...(override.canonical ? { canonical: override.canonical } : {}),
    },
    openGraph: {
      ...(base.openGraph ?? {}),
      ...(ogTitle ? { title: ogTitle } : {}),
      ...(override.description ? { description: override.description } : {}),
      ...(override.ogImageUrl
        ? { images: [{ url: override.ogImageUrl }] }
        : {}),
    } as Metadata["openGraph"],
    ...(override.noindex && !alreadyNoindex(base.robots)
      ? { robots: { index: false, follow: true } }
      : {}),
  };
}

/**
 * Addresses the sitemap should leave out: those an override asks not to be
 * indexed, and those whose canonical is somewhere else.
 */
export async function sitemapExclusions(): Promise<Set<string>> {
  const rows = await prisma.seoOverride.findMany({
    where: { OR: [{ noindex: true }, { canonical: { not: null } }] },
    select: { path: true, noindex: true, canonical: true },
  });
  return new Set(
    rows
      .filter(
        (row) =>
          row.noindex ||
          (row.canonical !== null && canonicalPath(row.canonical) !== row.path),
      )
      .map((row) => row.path),
  );
}

/**
 * The path a canonical names on this site, for comparison. An absolute URL on
 * this site's own host counts as its path; one elsewhere never matches.
 */
function canonicalPath(canonical: string): string | null {
  if (canonical.startsWith("/")) return normalisePath(canonical);
  try {
    const url = new URL(canonical);
    return url.host === new URL(appUrl()).host
      ? normalisePath(url.pathname)
      : null;
  } catch {
    return null;
  }
}
