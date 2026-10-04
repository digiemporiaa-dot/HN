import { revalidatePath } from "next/cache";

/**
 * Every prerendered public route whose pages show catalogue records.
 *
 * Patterns name the route as it is laid out on disk, route group included:
 * that is the form Next matches a dynamic segment by, and a pattern without
 * the group silently matches nothing. The category and taxonomy routes are
 * rendered per request and need no invalidation.
 */
const CATALOGUE_ROUTES = [
  "/(site)/products/[slug]",
  "/(site)/locations/[slug]",
  // CMS pages: their product, category and brand grids show catalogue cards.
  "/(site)/[...slug]",
] as const;

const CATALOGUE_INDEXES = [
  "/",
  "/products",
  "/categories",
  "/brands",
  "/specialties",
  "/solutions",
  "/applications",
  "/sitemap.xml",
] as const;

/**
 * Marks the public catalogue stale after any catalogue change.
 *
 * The public pages are prerendered, and a product appears on far more of them
 * than its own: its category, its brand, every specialty and solution it is
 * filed under, city pages and CMS grids that feature it, and the indexes. A
 * save cannot cheaply know all of those, so the routes are invalidated by
 * pattern. Nothing is rebuilt here — each page is regenerated the next time
 * someone asks for it — so the cost of a save stays flat however large the
 * catalogue grows.
 */
export function revalidateCatalogue(): void {
  for (const route of CATALOGUE_ROUTES) revalidatePath(route, "page");
  for (const path of CATALOGUE_INDEXES) revalidatePath(path);
}
