import { NextResponse } from "next/server";

import { livePublicCtaConfigs, type PublicCtaPayload } from "@/server/cta/service";

export const dynamic = "force-dynamic";

/**
 * The live call-to-action configurations, in their public shape only.
 *
 * Served per request rather than baked into cached pages, so switching a
 * configuration on or off takes effect without rebuilding anything. Like the
 * popup list, a short per-instance memory cache keeps busy pages off the
 * database. The server re-resolves on every submission, so a stale copy here
 * can only show yesterday's wording, never skip a gate.
 */
const TTL_MS = 15_000;
let cached: { at: number; payload: PublicCtaPayload } | null = null;
const EMPTY: PublicCtaPayload = { configs: [], forms: {} };

export async function GET() {
  const now = Date.now();
  if (!cached || now - cached.at > TTL_MS) {
    try {
      cached = { at: now, payload: await livePublicCtaConfigs() };
    } catch {
      // Buttons fall back to their built-in behaviour: never an error page.
      return respond(EMPTY, "no-store");
    }
  }
  return respond(cached.payload);
}

function respond(payload: PublicCtaPayload, cache = "public, max-age=15") {
  return NextResponse.json(payload, {
    headers: { "Cache-Control": cache, "X-Robots-Tag": "noindex" },
  });
}
