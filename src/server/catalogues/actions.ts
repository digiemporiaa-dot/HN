"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import { fieldErrorsFrom } from "@/lib/validation/field-errors";
import { catalogueIdSchema, catalogueSchema } from "@/lib/validation/catalogues";
import { clearUsage, recordUsage } from "@/server/media/service";
import { CATALOGUES_PATH } from "./service";

/**
 * Catalogues are product literature, so they are managed under the Products
 * permission rather than a resource of their own: whoever may edit the
 * catalogue may edit its PDFs.
 */

export type CatalogueActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

function revalidateCatalogues(): void {
  revalidatePath(CATALOGUES_PATH);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/catalogues");
  revalidatePath("/admin/catalogues/[id]", "page");
}

function readForm(formData: FormData) {
  return {
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    fileId: formData.get("fileId") ?? "",
    coverId: formData.get("coverId") ?? "",
    gated: formData.get("gated") === "on",
    status: formData.get("status") ?? "DRAFT",
  };
}

/**
 * The posted file and cover, checked against the library: the file must be a
 * live PDF and the cover a live image, so a stale or edited form cannot point
 * a catalogue at something else.
 */
async function checkMedia(fileId: string, coverId: string): Promise<Record<string, string> | null> {
  const [file, cover] = await Promise.all([
    prisma.mediaAsset.findFirst({
      where: { id: fileId, deletedAt: null, kind: "DOCUMENT", mimeType: "application/pdf" },
      select: { id: true },
    }),
    coverId
      ? prisma.mediaAsset.findFirst({
          where: { id: coverId, deletedAt: null, kind: { in: ["IMAGE", "VECTOR"] } },
          select: { id: true },
        })
      : Promise.resolve({ id: "" }),
  ]);
  const errors: Record<string, string> = {};
  if (!file) errors.fileId = "Choose a PDF from the media library, or upload one.";
  if (!cover) errors.coverId = "That image is no longer in the media library.";
  return Object.keys(errors).length ? errors : null;
}

async function syncUsage(catalogueId: string, fileId: string, coverId: string): Promise<void> {
  await clearUsage({ entityType: "Catalogue", entityId: catalogueId, field: "file" });
  await clearUsage({ entityType: "Catalogue", entityId: catalogueId, field: "cover" });
  await recordUsage({ assetId: fileId, entityType: "Catalogue", entityId: catalogueId, field: "file" });
  if (coverId) await recordUsage({ assetId: coverId, entityType: "Catalogue", entityId: catalogueId, field: "cover" });
}

export async function createCatalogueAction(
  _previous: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const actor = await requirePermission("PRODUCTS", "CREATE");

  const parsed = catalogueSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const mediaErrors = await checkMedia(parsed.data.fileId, parsed.data.coverId);
  if (mediaErrors) return { fieldErrors: mediaErrors };

  if (parsed.data.status === "PUBLISHED") await requirePermission("PRODUCTS", "PUBLISH");

  const last = await prisma.catalogue.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
  const catalogue = await prisma.catalogue.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      fileId: parsed.data.fileId,
      coverId: parsed.data.coverId || null,
      gated: parsed.data.gated,
      order: (last?.order ?? -1) + 1,
      status: parsed.data.status,
      publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null,
    },
    select: { id: true, title: true },
  });
  await syncUsage(catalogue.id, parsed.data.fileId, parsed.data.coverId);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "CATALOGUE_CREATED",
    module: "PRODUCTS",
    entityType: "Catalogue",
    entityId: catalogue.id,
    summary: `Created catalogue ${catalogue.title}`,
    metadata: { status: parsed.data.status, gated: parsed.data.gated },
  });

  revalidateCatalogues();
  redirect(`/admin/catalogues/${catalogue.id}`);
}

export async function updateCatalogueAction(
  _previous: CatalogueActionState,
  formData: FormData,
): Promise<CatalogueActionState> {
  const actor = await requirePermission("PRODUCTS", "EDIT");

  const id = catalogueIdSchema.safeParse({ catalogueId: formData.get("catalogueId") });
  if (!id.success) return { error: "That catalogue no longer exists." };
  const current = await prisma.catalogue.findFirst({
    where: { id: id.data.catalogueId, deletedAt: null },
    select: { id: true, status: true, publishedAt: true },
  });
  if (!current) return { error: "That catalogue no longer exists." };

  const parsed = catalogueSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const mediaErrors = await checkMedia(parsed.data.fileId, parsed.data.coverId);
  if (mediaErrors) return { fieldErrors: mediaErrors };

  // Publishing is a separate permission from editing.
  if (parsed.data.status === "PUBLISHED" && current.status !== "PUBLISHED") {
    await requirePermission("PRODUCTS", "PUBLISH");
  }

  await prisma.catalogue.update({
    where: { id: current.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      fileId: parsed.data.fileId,
      coverId: parsed.data.coverId || null,
      gated: parsed.data.gated,
      status: parsed.data.status,
      publishedAt: parsed.data.status === "PUBLISHED" ? (current.publishedAt ?? new Date()) : null,
    },
  });
  await syncUsage(current.id, parsed.data.fileId, parsed.data.coverId);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: current.status !== parsed.data.status ? "CATALOGUE_STATUS_CHANGED" : "CATALOGUE_UPDATED",
    module: "PRODUCTS",
    entityType: "Catalogue",
    entityId: current.id,
    summary: `${parsed.data.title} — ${parsed.data.status}`,
    metadata: { from: current.status, to: parsed.data.status, gated: parsed.data.gated },
  });

  revalidateCatalogues();
  return { success: "Catalogue saved." };
}

export async function deleteCatalogueAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("PRODUCTS", "DELETE");

  const parsed = catalogueIdSchema.safeParse({ catalogueId: formData.get("catalogueId") });
  if (!parsed.success) redirect("/admin/catalogues");
  const catalogue = await prisma.catalogue.findFirst({
    where: { id: parsed.data.catalogueId, deletedAt: null },
    select: { id: true, title: true },
  });
  if (!catalogue) redirect("/admin/catalogues");

  // Soft deleted, so leads that downloaded it keep a record of what they got.
  // Still gated afterwards: the file stays off the public media route.
  await prisma.catalogue.update({
    where: { id: catalogue.id },
    data: { deletedAt: new Date(), status: "ARCHIVED", publishedAt: null },
  });
  await clearUsage({ entityType: "Catalogue", entityId: catalogue.id, field: "file" });
  await clearUsage({ entityType: "Catalogue", entityId: catalogue.id, field: "cover" });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "CATALOGUE_DELETED",
    module: "PRODUCTS",
    entityType: "Catalogue",
    entityId: catalogue.id,
    summary: `Deleted catalogue ${catalogue.title}`,
  });

  revalidateCatalogues();
  redirect("/admin/catalogues");
}
