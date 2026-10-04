import { notFound } from "next/navigation";

import { recordNotFound } from "./not-found-log";

/**
 * A public route's "not found", logged.
 *
 * Called where a route decides an address has nothing behind it, rather than
 * from the 404 page itself: the framework renders that page as a fallback in
 * every response's tree, so logging there would count pages that exist. The
 * address comes from the route's own parameters, not the request headers,
 * because a prerendered route cannot read headers without failing.
 */
export async function missingPage(path: string): Promise<never> {
  await recordNotFound(path, null);
  notFound();
}
