import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { isSystemPath, targetKind } from "@/lib/seo/redirect-paths";

/** Leaves preview, back to the public version of the page. */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("path") ?? "/";
  const path =
    targetKind(raw) === "internal" && !isSystemPath(raw.split(/[?#]/)[0])
      ? raw
      : "/";
  (await draftMode()).disable();
  return NextResponse.redirect(new URL(path, request.nextUrl.origin));
}
