export type QueryValues = Record<string, string | number | undefined | null>;

/**
 * Builds a URL preserving the current query string, with overrides applied.
 * A null or undefined value removes the parameter, which keeps links clean
 * rather than accumulating empty params as filters are cleared.
 */
export function buildQueryHref(
  basePath: string,
  current: Record<string, string | string[] | undefined>,
  overrides: QueryValues = {},
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(current)) {
    if (value === undefined) continue;
    const single = Array.isArray(value) ? value[0] : value;
    if (single) params.set(key, single);
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/** Reads a positive integer parameter, falling back when absent or malformed. */
export function readPageParam(
  value: string | string[] | undefined,
  fallback = 1,
): number {
  const single = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(single ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function readStringParam(
  value: string | string[] | undefined,
): string | undefined {
  const single = Array.isArray(value) ? value[0] : value;
  return single?.trim() || undefined;
}
