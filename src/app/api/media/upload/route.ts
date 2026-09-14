import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { getCurrentStaff } from "@/server/auth/guards";
import { getEffectivePermissions } from "@/server/permissions";
import { permissionKey } from "@/server/permissions/catalogue";
import { storeFile } from "@/server/storage/files";
import { MAX_UPLOAD_BYTES } from "@/server/storage/config";
import {
  defaultFolderId,
  ensureRootFolders,
  storageFolderForLogicalFolder,
} from "@/server/media/service";

/**
 * Multipart upload endpoint.
 *
 * A route handler rather than a server action because only this gives the
 * browser upload progress — a server action resolves as one opaque call, which
 * is a poor experience for a 20MB brochure on a hospital's connection.
 */
export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const permissions = await getEffectivePermissions(staff.id);
  const allowed =
    permissions.has("*") || permissions.has(permissionKey("MEDIA", "CREATE"));
  if (!allowed) {
    return NextResponse.json(
      { error: "You do not have permission to upload media." },
      { status: 403 },
    );
  }

  // Reject oversized bodies before reading them into memory.
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_UPLOAD_BYTES * 1.1) {
    return NextResponse.json(
      { error: "That file is larger than the maximum permitted size." },
      { status: 413 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Malformed upload." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was provided." }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "That file is larger than the maximum permitted size." },
      { status: 413 },
    );
  }

  const rawFolderId = formData.get("folderId");
  let folderId =
    typeof rawFolderId === "string" && rawFolderId ? rawFolderId : null;

  // With no folder chosen the file would otherwise be unfiled, and therefore
  // absent from every folder view.
  if (!folderId) {
    await ensureRootFolders();
    folderId = await defaultFolderId();
  }

  if (folderId) {
    const folder = await prisma.mediaFolder.findUnique({
      where: { id: folderId },
      select: { id: true },
    });
    if (!folder) {
      return NextResponse.json(
        { error: "That folder no longer exists." },
        { status: 400 },
      );
    }
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const storageFolder = await storageFolderForLogicalFolder(folderId);

  // Validation lives in the storage layer: the declared type is ignored and
  // the actual bytes decide whether this is something we accept.
  const stored = await storeFile({
    bytes,
    filename: file.name,
    folder: storageFolder,
  });

  if (!stored.ok) {
    return NextResponse.json({ error: stored.reason }, { status: 422 });
  }

  const asset = await prisma.mediaAsset.create({
    data: {
      folderId,
      storageKey: stored.file.storageKey,
      originalName: file.name.slice(0, 255),
      mimeType: stored.file.mimeType,
      kind: stored.file.kind,
      sizeBytes: stored.file.sizeBytes,
      width: stored.file.width,
      height: stored.file.height,
      uploadedById: staff.id,
    },
    select: { id: true, storageKey: true, originalName: true },
  });

  await recordAuditEvent({
    actorId: staff.id,
    actorEmail: staff.email,
    action: "MEDIA_UPLOADED",
    module: "MEDIA",
    entityType: "MediaAsset",
    entityId: asset.id,
    summary: `Uploaded ${asset.originalName}`,
    metadata: {
      storageKey: asset.storageKey,
      mimeType: stored.file.mimeType,
      sizeBytes: stored.file.sizeBytes,
    },
  });

  return NextResponse.json({ id: asset.id, storageKey: asset.storageKey });
}
