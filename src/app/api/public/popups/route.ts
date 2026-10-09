import { draftMode } from "next/headers";
import { NextResponse } from "next/server";

import { livePopups, type PublicPopup } from "@/server/popups/service";

export const dynamic = "force-dynamic";

/**
 * The popups a visitor could be shown now, in their public shape only.
 *
 * Served per request rather than baked into the cached pages, so switching a
 * popup on or off, or a schedule starting, takes effect without rebuilding
 * every page. A few seconds of memory cache keeps a busy page from asking the
 * database on every view; it is per instance and short on purpose.
 *
 * Nothing is shown during preview: staff checking a draft page should see
 * the page.
 */
const TTL_MS = 15_000;
let cached: { at: number; popups: PublicPopup[] } | null = null;

export async function GET() {
  const { isEnabled } = await draftMode();
  if (isEnabled) return respond([]);

  const now = Date.now();
  if (!cached || now - cached.at > TTL_MS) {
    try {
      cached = { at: now, popups: await livePopups(new Date(now)) };
    } catch {
      // A popup is never worth an error page: no popups is the safe answer.
      return respond([], "no-store");
    }
  }
  return respond(cached.popups);
}

function respond(popups: PublicPopup[], cache = "public, max-age=15") {
  return NextResponse.json(
    { popups },
    { headers: { "Cache-Control": cache, "X-Robots-Tag": "noindex" } },
  );
}
