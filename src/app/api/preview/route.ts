import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentStaff } from "@/server/auth/guards";
import { isSystemPath, targetKind } from "@/lib/seo/redirect-paths";

/**
 * Enters preview and opens a public address.
 *
 * Only signed-in staff are let in, and only to a path on this site. Being in
 * preview does not by itself show anything unpublished: each page still
 * checks that the viewer may see that kind of content.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("path") ?? "/";
  const path =
    targetKind(raw) === "internal" && !isSystemPath(raw.split(/[?#]/)[0])
      ? raw
      : "/";

  const staff = await getCurrentStaff();
  if (!staff) {
    const login = new URL("/login", request.nextUrl.origin);
    login.searchParams.set(
      "callbackUrl",
      request.nextUrl.pathname + request.nextUrl.search,
    );
    return NextResponse.redirect(login);
  }

  (await draftMode()).enable();
  return NextResponse.redirect(new URL(path, request.nextUrl.origin));
}
