import { NextResponse } from "next/server";

import { contentTypeForExtension } from "@/server/storage/config";
import { readFileStream, statFile } from "@/server/storage/files";
import { extensionOf, StoragePathError } from "@/server/storage/paths";
import { prisma } from "@/server/db";
import { resolveGrant } from "@/server/leads/service";

/**
 * Serves a gated document to whoever holds its grant.
 *
 * The token is the whole of the authorisation: 32 random bytes, tied to one
 * document and one enquiry, and expiring. There is no other way to a gated
 * file — the ordinary media route refuses them — so this is the one place the
 * rule is enforced.
 *
 * Every failure is the same 404. A token that has expired, one that was never
 * issued, and one for a file that has since been deleted are indistinguishable
 * from outside, so nothing here can be used to discover which tokens exist.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 20 || token.length > 128) {
    return new NextResponse("Not found", { status: 404 });
  }

  const grant = await resolveGrant(token);
  if (!grant) return new NextResponse("Not found", { status: 404 });

  const storageKey = grant.document.media.storageKey;
  const contentType = contentTypeForExtension(extensionOf(storageKey));
  if (!contentType) return new NextResponse("Not found", { status: 404 });

  try {
    const { absolutePath, size } = await statFile(storageKey);
    const stream = readFileStream(absolutePath);

    // Recorded for the sales team: whether the brochure they traded for an
    // enquiry was ever actually opened is the first thing they will ask.
    await prisma.documentGrant.update({
      where: { id: grant.id },
      data: { downloadCount: { increment: 1 }, lastDownloadedAt: new Date() },
    });

    const safeTitle =
      grant.document.title.replace(/[^A-Za-z0-9 ._-]/g, "").trim() ||
      "document";

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(size),
        // A filename the recipient will recognise, with everything that could
        // break a header quoted out of it.
        "Content-Disposition": `attachment; filename="${safeTitle}.${extensionOf(storageKey)}"`,
        // Tied to one person; never stored by a shared cache.
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (!(error instanceof StoragePathError)) {
      console.error("Gated document could not be served", {
        grantId: grant.id,
        message: error instanceof Error ? error.message : "unknown",
      });
    }
    return new NextResponse("Not found", { status: 404 });
  }
}
