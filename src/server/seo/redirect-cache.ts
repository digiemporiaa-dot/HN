import { prisma } from "@/server/db";
import { normalisePath } from "@/lib/seo/redirect-paths";

/**
 * The active redirects, held in memory for the middleware.
 *
 * Every public request is checked against this table, so it cannot cost a
 * query each time. It is loaded whole and kept for a short while; a save in
 * the admin clears it in this process, and the interval bounds how long any
 * other process can serve a stale copy.
 */
const TTL_MS = 30_000;

type Entry = { id: string; toPath: string; permanent: boolean };

type Cache = {
  map: Map<string, Entry>;
  loadedAt: number;
  loading?: Promise<Map<string, Entry>>;
};

const holder = globalThis as unknown as { __hnRedirects?: Cache };

async function load(): Promise<Map<string, Entry>> {
  const rows = await prisma.redirect.findMany({
    where: { active: true },
    select: { id: true, fromPath: true, toPath: true, type: true },
  });
  return new Map(
    rows.map((row) => [
      row.fromPath,
      { id: row.id, toPath: row.toPath, permanent: row.type === "PERMANENT" },
    ]),
  );
}

async function table(): Promise<Map<string, Entry>> {
  const cache = holder.__hnRedirects;
  if (cache && Date.now() - cache.loadedAt < TTL_MS) return cache.map;
  if (cache?.loading) return cache.loading;

  const loading = load()
    .then((map) => {
      holder.__hnRedirects = { map, loadedAt: Date.now() };
      return map;
    })
    .catch((error) => {
      // A database hiccup must not take the site down with it: keep serving
      // the last good table, or none, and try again on the next request.
      console.error(
        "Redirect table could not be loaded",
        error instanceof Error ? error.message : "unknown",
      );
      const stale = cache?.map ?? new Map<string, Entry>();
      holder.__hnRedirects = {
        map: stale,
        loadedAt: Date.now() - TTL_MS + 5_000,
      };
      return stale;
    });

  holder.__hnRedirects = {
    map: cache?.map ?? new Map(),
    loadedAt: cache?.loadedAt ?? 0,
    loading,
  };
  return loading;
}

export async function lookupRedirect(pathname: string): Promise<Entry | null> {
  const map = await table();
  if (map.size === 0) return null;
  return map.get(normalisePath(pathname)) ?? null;
}

export function invalidateRedirectCache(): void {
  holder.__hnRedirects = undefined;
}

/** Counted after the response has gone; a lost count is not worth a delay. */
export function recordRedirectHit(id: string): void {
  void prisma.redirect
    .update({
      where: { id },
      data: { hits: { increment: 1 }, lastHitAt: new Date() },
    })
    .catch(() => {});
}
