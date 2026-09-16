import { NextResponse } from "next/server";

import { contentTypeForExtension } from "@/server/storage/config";
import { readFileStream, statFile } from "@/server/storage/files";
import { isGatedStorageKey } from "@/server/leads/service";
import {
  extensionOf,
  isValidStorageKey,
  StoragePathError,
} from "@/server/storage/paths";

/**
 * Serves files from the persistent volume.
 *
 * Uploads deliberately do not live in /public: routing them through the
 * application keeps deletion, path containment and future access rules under
 * our control rather than the web server's.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const storageKey = segments.join("/");

  // The shape check runs first: a key that is not one we generated cannot
  // correspond to a file we stored, whatever the filesystem says.
  if (!isValidStorageKey(storageKey)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const contentType = contentTypeForExtension(extensionOf(storageKey));
  if (!contentType) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Gated documents are not served here at any price. A brochure traded for an
  // enquiry would otherwise be reachable by anyone who learned its storage key,
  // which would make the gate a matter of not linking to the file rather than a
  // control. Only documents are checked: images are most of the traffic and can
  // never be gated.
  if (
    contentType === "application/pdf" &&
    (await isGatedStorageKey(storageKey))
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const { absolutePath, size, modifiedAt } = await statFile(storageKey);
    const stream = readFileStream(absolutePath);

    const headers = new Headers({
      "Content-Type": contentType,
      "Content-Length": String(size),
      "Last-Modified": modifiedAt.toUTCString(),
      // Storage keys are random and never reused, so a stored file is
      // immutable for its whole life.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    });

    if (contentType === "image/svg+xml") {
      // SVG is executable in a browsing context. Uploads are screened for
      // scripts, but these headers make the served file inert regardless.
      headers.set(
        "Content-Security-Policy",
        "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      );
    }

    if (contentType === "application/pdf") {
      headers.set("Content-Disposition", "inline");
    }

    return new NextResponse(stream as unknown as ReadableStream, { headers });
  } catch (error) {
    if (error instanceof StoragePathError) {
      return new NextResponse("Not found", { status: 404 });
    }
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new NextResponse("Not found", { status: 404 });
    }

    console.error("Failed to serve media file", {
      storageKey,
      error: error instanceof Error ? error.message : "unknown",
    });
    return new NextResponse("Unable to serve file", { status: 500 });
  }
}
