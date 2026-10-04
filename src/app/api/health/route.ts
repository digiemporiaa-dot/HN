import { existsSync } from "node:fs";
import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { ensureStorageReady } from "@/server/storage/files";

export const dynamic = "force-dynamic";

/**
 * Whether this instance can serve the site.
 *
 * Used by the container healthcheck, so a deploy whose database is
 * unreachable, whose media volume is not mounted writable, or whose pages are
 * still being warmed never receives traffic. The answer names which check
 * failed and nothing else — no versions, hosts or error text.
 */
export async function GET() {
  const [database, storage] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    ensureStorageReady()
      .then(() => true)
      .catch(() => false),
  ]);

  // Set by the container entrypoint: the instance is not ready until the
  // pages prerendered at build time have been replaced with real ones.
  const readyFile = process.env.HN_READY_FILE;
  const warmed = !readyFile || existsSync(readyFile);

  const ok = database && storage && warmed;
  return NextResponse.json(
    {
      status: ok ? "ok" : "unavailable",
      checks: { database, storage, warmed },
    },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
