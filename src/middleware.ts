import NextAuth from "next-auth";
import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from "next/server";

import { isStaffPath, publicPolicy, staffPolicy } from "@/lib/security/csp";
import { authConfig } from "@/server/auth/config";
import { lookupRedirect, recordRedirectHit } from "@/server/seo/redirect-cache";
import { countKnownMissing } from "@/server/seo/not-found-log";

const { auth: withSession } = NextAuth(authConfig);

/**
 * Staff screens: a fresh nonce per response. Next.js reads it from the
 * request's Content-Security-Policy header and stamps it on every script it
 * renders; the same policy goes back to the browser.
 */
function staffResponse(request: NextRequest): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = staffPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("content-security-policy", policy);
  requestHeaders.set("x-nonce", nonce);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

const adminGate = withSession((request) => {
  // A fast redirect for visitors without a session; the authorisation
  // decision itself is made against the database on every admin route.
  if (!request.auth?.user) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = "/login";
    signIn.search = "";
    signIn.searchParams.set("callbackUrl", request.nextUrl.href);
    return NextResponse.redirect(signIn);
  }
  return staffResponse(request);
}) as unknown as (
  request: NextRequest,
  event: NextFetchEvent,
) => Promise<Response>;

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
 * Both halves also get their Content-Security-Policy here (see
 * src/lib/security/csp.ts): a per-request nonce for staff screens, an
 * allow-list for cached public pages.
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

  if (isStaffPath(pathname)) {
    return staffResponse(request);
  }

  const hit = await lookupRedirect(pathname);
  if (!hit) {
    // A request for an address already logged as missing is counted here,
    // because a prerendered route serves its cached 404 without running any
    // of our code.
    await countKnownMissing(pathname);
    const response = NextResponse.next();
    response.headers.set("Content-Security-Policy", publicPolicy());
    return response;
  }

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
