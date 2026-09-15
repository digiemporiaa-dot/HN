/**
 * Turns a human name into a URL slug.
 *
 * One implementation rather than one per entity: a page, a category and a brand
 * all need the same transformation, and three copies would drift until the same
 * name produced different URLs depending on which screen you typed it into.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
