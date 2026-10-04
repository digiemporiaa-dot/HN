import { readFile } from "node:fs/promises";
import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Discards every prerendered page, once, at container start.
 *
 * The image is built without a database, so its prerendered pages describe an
 * empty site. The entrypoint calls this before the instance reports healthy,
 * then requests the main pages so they are regenerated from the real database
 * before any visitor arrives.
 *
 * Authorised by a one-time token the entrypoint writes to a file only this
 * container can read, and deletes as soon as warm-up is done. Without that
 * file the route does not exist, so it is not something the public can call.
 */
export async function POST(request: NextRequest) {
  const tokenFile = process.env.HN_WARM_TOKEN_FILE;
  if (!tokenFile) return new NextResponse(null, { status: 404 });

  const expected = await readFile(tokenFile, "utf8")
    .then((value) => value.trim())
    .catch(() => "");
  const offered = request.headers.get("x-warm-token")?.trim() ?? "";
  if (
    !expected ||
    offered.length !== expected.length ||
    !timingSafeEqual(Buffer.from(offered), Buffer.from(expected))
  ) {
    return new NextResponse(null, { status: 404 });
  }

  revalidatePath("/", "layout");
  return new NextResponse(null, { status: 204 });
}
