import { cache } from "react";

import { prisma } from "@/server/db";
import { getSiteSettings } from "@/server/settings/service";

export type LegalLink = { label: string; href: string };

/**
 * The legal pages the settings point at, but only those that exist.
 *
 * The settings default to /privacy and /terms before anybody has written
 * either, and a consent checkbox that links to a 404 is worse than one that
 * links nowhere: it tells a hospital's procurement team that the policy they
 * are agreeing to is missing. An internal one-segment path counts only when a
 * published CMS page lives there; an external address is trusted as entered.
 */
export const legalLinks = cache(
  async (): Promise<{
    privacy: LegalLink | null;
    terms: LegalLink | null;
    cookies: LegalLink | null;
  }> => {
    const settings = await getSiteSettings();
    const wanted = [
      ["privacy", "Privacy policy", settings.legal.privacyUrl],
      ["terms", "Terms of use", settings.legal.termsUrl],
      ["cookies", "Cookie policy", settings.legal.cookiesUrl],
    ] as const;

    const pageSlug = (href: string) => {
      const match = /^\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(href);
      return match ? match[1] : null;
    };

    const slugs = wanted
      .map(([, , href]) => (href ? pageSlug(href.trim()) : null))
      .filter((slug): slug is string => slug !== null);

    const published = new Set(
      slugs.length === 0
        ? []
        : (
            await prisma.page
              .findMany({
                where: {
                  slug: { in: slugs },
                  status: "PUBLISHED",
                  deletedAt: null,
                },
                select: { slug: true },
              })
              .catch(() => [])
          ).map((row) => row.slug),
    );

    const resolve = (label: string, raw: string | null): LegalLink | null => {
      const href = raw?.trim();
      if (!href) return null;
      if (/^https?:\/\//i.test(href)) return { label, href };
      const slug = pageSlug(href);
      if (slug) return published.has(slug) ? { label, href: `/${slug}` } : null;
      // Anything else — a relative path with no slash, a javascript: URL — is
      // not a link we can vouch for.
      return null;
    };

    return {
      privacy: resolve(wanted[0][1], wanted[0][2]),
      terms: resolve(wanted[1][1], wanted[1][2]),
      cookies: resolve(wanted[2][1], wanted[2][2]),
    };
  },
);

/**
 * Whether a page slug is one the legal settings point at.
 *
 * Those pages are linked from every page — the footer and every enquiry
 * form's consent line — so publishing, unpublishing or deleting one has to
 * refresh the whole site rather than just its own address.
 */
export async function isLegalPageSlug(slug: string): Promise<boolean> {
  const settings = await getSiteSettings();
  return [
    settings.legal.privacyUrl,
    settings.legal.termsUrl,
    settings.legal.cookiesUrl,
  ].some((href) => href?.trim().replace(/\/$/, "") === `/${slug}`);
}
