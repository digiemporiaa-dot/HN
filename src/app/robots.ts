import type { MetadataRoute } from "next";

import { appUrl } from "@/lib/site-config";
import { getSiteSettings } from "@/server/settings/service";

/**
 * Paths no crawler should follow.
 *
 * The administration area and the authentication routes are behind a login, so
 * a crawler would only ever collect redirects from them; /api serves files and
 * form endpoints rather than pages.
 */
const PRIVATE_PATHS = [
  "/admin",
  "/api/",
  "/login",
  "/logout",
  "/access-denied",
  "/change-password",
  "/design-system",
];

export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSiteSettings().catch(() => null);

  // Staging and pre-launch. robots.txt is a request rather than a control, so
  // the same setting also puts a noindex tag on every page.
  if (settings?.seo.noindex) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE_PATHS }],
    sitemap: new URL("/sitemap.xml", appUrl()).toString(),
    host: appUrl(),
  };
}
