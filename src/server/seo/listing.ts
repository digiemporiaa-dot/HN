import type { Metadata } from "next";

import { readPageParam, readStringParam } from "@/lib/utils/query";

type Query = Record<string, string | string[] | undefined>;

/**
 * Indexation rules for a paginated, filterable list.
 *
 * - A search or filter result is a view of the same list, not a page of its
 *   own: it stays crawlable (links followed) but is kept out of the index,
 *   and names the unfiltered list as canonical. Otherwise every combination
 *   of filters is a near-duplicate page competing with the category pages
 *   that cover the same products.
 * - Page 2 onwards names itself as canonical. Pointing it at page 1 would
 *   tell search engines the products on later pages are not worth finding.
 *
 * A page that already asks not to be indexed — a draft preview — keeps that.
 */
export function listingMetadata(
  base: Metadata,
  path: string,
  query: Query,
  filterParams: string[] = [],
): Metadata {
  const filtered = filterParams.some((name) => readStringParam(query[name]));
  const page = readPageParam(query.page);

  if (filtered) {
    return {
      ...base,
      alternates: { ...base.alternates, canonical: path },
      ...(base.robots ? {} : { robots: { index: false, follow: true } }),
    };
  }

  if (page > 1) {
    return {
      ...base,
      alternates: { ...base.alternates, canonical: `${path}?page=${page}` },
    };
  }

  return base;
}
