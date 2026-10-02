import NextAuth from "next-auth";
import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from "next/server";

import { authConfig } from "@/server/auth/config";
import { lookupRedirect, recordRedirectHit } from "@/server/seo/redirect-cache";

const adminGate = NextAuth(authConfig).auth as unknown as (
  request: NextRequest,
  event: NextFetchEvent,
) => Promise<Response | undefined>;

/**
 * Two jobs, split by path.
 *
 * /admin: a fast redirect for unauthenticated visitors. It only inspects the
 * session cookie — the real authorisation decision is made server-side against
 * the database in every admin layout and action.
 *
 * Everything else public: the redirect table, so an address that has moved
 * still leads somewhere. It runs before any page, prerendered or not, which is
 * what lets a redirect replace an address that still exists.
 *
 * Node rather than the edge runtime, because the redirect table lives in the
 * database.
 */
export default async function middleware(
  request: NextRequest,
  event: NextFetchEvent,
) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return adminGate(request, event);
  }

  const hit = await lookupRedirect(pathname);
  if (!hit) return NextResponse.next();

  // A path on this site keeps the visitor's query string unless the target
  // sets its own: campaign parameters on an old link should survive the move.
  const destination = hit.toPath.startsWith("/")
    ? new URL(
        hit.toPath.includes("?") || !search
          ? hit.toPath
          : `${hit.toPath}${search}`,
        request.nextUrl.origin,
      )
    : new URL(hit.toPath);

  recordRedirectHit(hit.id);
  return NextResponse.redirect(destination, hit.permanent ? 301 : 302);
}

export const config = {
  runtime: "nodejs",
  // Next's own assets and the API are never redirected, and are skipped
  // before the table is consulted at all.
  matcher: ["/((?!_next/|api/).*)"],
};
