import { prisma } from "@/server/db";
import { isSystemPath, normalisePath } from "@/lib/seo/redirect-paths";

/**
 * Past this many distinct addresses only existing rows are counted. A
 * crawler walking random URLs should not be able to grow the table without
 * bound; the addresses that matter were logged long before it fills.
 */
const MAX_ROWS = 10_000;

/**
 * Addresses only ever requested by vulnerability scanners. Logged, so their
 * volume is visible, but dismissed from the start so they do not bury the
 * paths real visitors are missing.
 */
const PROBE =
  /(wp-admin|wp-login|wp-content|wp-includes|xmlrpc\.php|phpmyadmin|\/\.env|\/\.git|\/cgi-bin|\.aspx?$|\/vendor\/phpunit)/i;

function referrerOf(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString().slice(0, 500);
  } catch {
    return null;
  }
}

/**
 * Records the first "not found" for a path. Never throws: a 404 page must
 * render.
 *
 * Only the first sighting is written here. A prerendered route caches its 404,
 * so later requests never reach this code; they are counted by the middleware
 * instead, against the cached list below, which sees every request.
 */
export async function recordNotFound(
  rawPath: string | null,
  rawReferrer: string | null,
): Promise<void> {
  if (!rawPath) return;
  const path = normalisePath(rawPath);
  if (path === "/" || path.length > 500 || isSystemPath(path)) return;

  try {
    const known = await prisma.notFoundHit.findUnique({
      where: { path },
      select: { id: true },
    });
    if (known) return;
    if ((await prisma.notFoundHit.count()) >= MAX_ROWS) return;
    await prisma.notFoundHit.create({
      data: {
        path,
        lastReferrer: referrerOf(rawReferrer),
        ignored: PROBE.test(path),
      },
    });
    invalidateMissingCache();
  } catch {
    // Two requests for the same new path at once: one insert wins.
  }
}

/* ------------------------------------------------- counting in middleware -- */

const TTL_MS = 30_000;
type MissingCache = { map: Map<string, string>; loadedAt: number };
const holder = globalThis as unknown as { __hnMissing?: MissingCache };

async function missingTable(): Promise<Map<string, string>> {
  const cache = holder.__hnMissing;
  if (cache && Date.now() - cache.loadedAt < TTL_MS) return cache.map;
  try {
    const rows = await prisma.notFoundHit.findMany({
      select: { id: true, path: true },
    });
    const map = new Map(rows.map((row) => [row.path, row.id]));
    holder.__hnMissing = { map, loadedAt: Date.now() };
    return map;
  } catch {
    const stale = cache?.map ?? new Map<string, string>();
    holder.__hnMissing = { map: stale, loadedAt: Date.now() };
    return stale;
  }
}

export function invalidateMissingCache(): void {
  holder.__hnMissing = undefined;
}

/**
 * Counts a request for an address already known to be missing. Called by the
 * middleware for every public request; costs a map lookup unless it matches,
 * and the count is written after the response has gone.
 */
export async function countKnownMissing(rawPath: string): Promise<void> {
  const map = await missingTable();
  if (map.size === 0) return;
  const id = map.get(normalisePath(rawPath));
  if (!id) return;
  void prisma.notFoundHit
    .update({
      where: { id },
      data: { hits: { increment: 1 }, lastSeenAt: new Date() },
    })
    .catch(() => {});
}

/** Forgets a path once it has an answer — a redirect or a published page. */
export async function resolveNotFound(path: string): Promise<void> {
  const removed = await prisma.notFoundHit
    .deleteMany({ where: { path: normalisePath(path) } })
    .catch(() => ({ count: 0 }));
  if (removed.count > 0) invalidateMissingCache();
}
