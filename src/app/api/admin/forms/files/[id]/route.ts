import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requirePermission } from "@/server/permissions";
import { readFileStream, statFile } from "@/server/storage/files";

/**
 * Serves a file a visitor attached to a built form.
 *
 * Behind the admin's own permission check, and served as an attachment with a
 * content type this application decided rather than one the uploader supplied.
 * A stranger's file is never rendered in the browser: a PDF that opens inline
 * is a document with a script engine, and an image that turns out to be
 * something else is worse. Downloading it is the only thing on offer.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requirePermission("FORMS", "VIEW");

  const { id } = await params;
  const file = await prisma.formSubmissionFile.findUnique({
    where: { id },
    select: {
      storageKey: true,
      originalName: true,
    },
  });
  if (!file) return new NextResponse("Not found", { status: 404 });

  try {
    const { absolutePath, size } = await statFile(file.storageKey);
    const stream = readFileStream(absolutePath);

    // Everything that could break a header, or suggest a second extension, is
    // taken out of the name the uploader chose.
    const safeName =
      file.originalName.replace(/[^A-Za-z0-9 ._-]/g, "").trim() || "attachment";

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        // Deliberately not the sniffed type: an attachment is downloaded, so
        // the browser has no reason to be told what to do with it, and being
        // told nothing useful is the point.
        "Content-Type": "application/octet-stream",
        "Content-Length": String(size),
        "Content-Disposition": `attachment; filename="${safeName}"`,
        // Stops a browser guessing a type from the bytes and rendering it.
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
