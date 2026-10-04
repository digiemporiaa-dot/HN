import { prisma } from "@/server/db";
import { internalTargetPath, normalisePath } from "@/lib/seo/redirect-paths";
import { invalidateRedirectCache } from "./redirect-cache";
import { resolveNotFound } from "./not-found-log";

/** Pages that exist whatever is in the database. */
const STATIC_ROUTES = new Set([
  "/products",
  "/categories",
  "/brands",
  "/specialties",
  "/solutions",
  "/applications",
  "/locations",
  "/contact",
  "/rfq",
]);

const MAX_HOPS = 10;

/**
 * What lives publicly at a path today, if anything.
 *
 * A redirect runs before the page, so one saved for a live address would hide
 * that page. Manual redirects from live addresses are refused for that reason;
 * the editor unpublishes or renames the page first, and the rename makes the
 * redirect itself.
 */
export async function livePathOwner(path: string): Promise<string | null> {
  if (path === "/" || STATIC_ROUTES.has(path)) return "a built-in page";

  const segments = path.split("/").filter(Boolean);
  const [first, second, third] = segments;
  const published = { status: "PUBLISHED" as const };

  if (segments.length === 1) {
    const page = await prisma.page.findFirst({
      where: { slug: first, deletedAt: null, ...published },
      select: { title: true },
    });
    return page ? `the page “${page.title}”` : null;
  }

  if (segments.length === 2) {
    switch (first) {
      case "products": {
        const row = await prisma.product.findFirst({
          where: { slug: second, deletedAt: null, ...published },
          select: { name: true },
        });
        return row ? `the product “${row.name}”` : null;
      }
      case "categories": {
        const row = await prisma.category.findFirst({
          where: {
            slug: second,
            parentId: null,
            deletedAt: null,
            ...published,
          },
          select: { name: true },
        });
        return row ? `the category “${row.name}”` : null;
      }
      case "brands": {
        const row = await prisma.brand.findFirst({
          where: { slug: second, ...published },
          select: { name: true },
        });
        return row ? `the brand “${row.name}”` : null;
      }
      case "specialties": {
        const row = await prisma.specialty.findFirst({
          where: { slug: second, ...published },
          select: { name: true },
        });
        return row ? `the specialty “${row.name}”` : null;
      }
      case "solutions": {
        const row = await prisma.solution.findFirst({
          where: { slug: second, ...published },
          select: { name: true },
        });
        return row ? `the solution “${row.name}”` : null;
      }
      case "applications": {
        const row = await prisma.application.findFirst({
          where: { slug: second },
          select: { name: true },
        });
        return row ? `the application “${row.name}”` : null;
      }
      case "locations": {
        const row = await prisma.city.findFirst({
          where: { slug: second, deletedAt: null, ...published },
          select: { name: true },
        });
        return row ? `the city page “${row.name}”` : null;
      }
    }
  }

  if (segments.length === 3 && first === "categories") {
    const row = await prisma.category.findFirst({
      where: {
        slug: third,
        deletedAt: null,
        ...published,
        parent: { slug: second },
      },
      select: { name: true },
    });
    return row ? `the category “${row.name}”` : null;
  }

  return null;
}

/**
 * Follows a target through existing redirects to where it finally lands.
 *
 * Returns null when the chain comes back to `fromPath` — a loop no visitor
 * could ever leave — and otherwise the final target, so a new redirect points
 * straight at the end rather than adding a hop.
 */
export async function finalTarget(
  fromPath: string,
  toPath: string,
): Promise<string | null> {
  let target = toPath;
  for (let hop = 0; hop < MAX_HOPS; hop += 1) {
    const path = internalTargetPath(target);
    if (path === null) return target;
    if (path === fromPath) return null;
    const next = await prisma.redirect.findFirst({
      where: { fromPath: path, active: true },
      select: { toPath: true },
    });
    if (!next) return target;
    target = next.toPath;
  }
  return null;
}

/**
 * Points every redirect that led to `fromPath` straight at `target`, so
 * adding a redirect never leaves an older one going through it.
 */
export async function repointChains(fromPath: string, target: string) {
  // Any target that normalises to `fromPath` starts with it, ignoring case;
  // the exact comparison below settles the rest.
  const leading = await prisma.redirect.findMany({
    where: {
      NOT: { fromPath },
      toPath: { startsWith: fromPath, mode: "insensitive" },
    },
    select: { id: true, fromPath: true, toPath: true },
  });
  const ids = leading
    .filter((row) => internalTargetPath(row.toPath) === fromPath)
    .filter((row) => internalTargetPath(target) !== row.fromPath)
    .map((row) => row.id);
  if (ids.length > 0) {
    await prisma.redirect.updateMany({
      where: { id: { in: ids } },
      data: { toPath: target },
    });
  }
  return ids.length;
}

/**
 * Keeps the redirect table in step with a published address.
 *
 * Called whenever something with a public page is saved. `before` is the
 * address it was published at, `after` the address it is published at now;
 * either is null when it was not, or is no longer, public.
 *
 * - A published page takes its address back from any redirect, so an old
 *   redirect can never hide a page that has since been given that address.
 * - A published page that moved leaves a permanent redirect behind, because
 *   its old address may be in search results, bookmarks and quotations.
 */
export async function syncPublicPath(change: {
  before: string | null;
  after: string | null;
  actorId?: string | null;
}): Promise<void> {
  const before = change.before ? normalisePath(change.before) : null;
  const after = change.after ? normalisePath(change.after) : null;
  let changed = false;

  if (after) {
    const freed = await prisma.redirect.deleteMany({
      where: { fromPath: after },
    });
    changed ||= freed.count > 0;
  }

  if (before && after && before !== after) {
    const target = change.after!;
    await prisma.redirect.upsert({
      where: { fromPath: before },
      update: {
        toPath: target,
        type: "PERMANENT",
        active: true,
        source: "AUTOMATIC",
      },
      create: {
        fromPath: before,
        toPath: target,
        type: "PERMANENT",
        source: "AUTOMATIC",
        note: "Created when the page's address changed.",
        createdById: change.actorId ?? null,
      },
    });
    await repointChains(before, target);
    changed = true;
  }

  // An address that is published again, or now redirects, is no longer
  // missing.
  if (before) await resolveNotFound(before);
  if (after) await resolveNotFound(after);

  if (changed) invalidateRedirectCache();
}
