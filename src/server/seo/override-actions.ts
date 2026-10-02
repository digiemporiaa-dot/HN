"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { clearUsage, recordUsage } from "@/server/media/service";
import {
  isSystemPath,
  normalisePath,
  targetKind,
} from "@/lib/seo/redirect-paths";
import { DESCRIPTION_MAX, TITLE_MAX } from "@/lib/seo/overrides";
import { livePathOwner } from "./redirects";

export type OverrideActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

type Input = {
  path: string;
  title: string | null;
  titleAbsolute: boolean;
  description: string | null;
  canonical: string | null;
  noindex: boolean;
  ogImageId: string | null;
  note: string | null;
};

function refused(
  fieldErrors: Record<string, string>,
  error = "The override could not be saved. Check the highlighted fields.",
): OverrideActionState {
  return { error, fieldErrors };
}

function readForm(formData: FormData): {
  input?: Input;
  fieldErrors?: Record<string, string>;
} {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const rawPath = text("path");
  const title = text("title");
  const description = text("description").replace(/\s+/g, " ");
  const canonical = text("canonical");
  const ogImageId = text("ogImageId");
  const note = text("note");

  const fieldErrors: Record<string, string> = {};
  const path = normalisePath(rawPath);
  if (!rawPath) fieldErrors.path = "Enter the address this applies to";
  else if (path.length > 500) fieldErrors.path = "That address is too long";
  else if (/[\s<>"]/.test(path))
    fieldErrors.path = "Addresses cannot contain spaces";
  else if (isSystemPath(path)) {
    fieldErrors.path =
      "That address belongs to the application, not the public site";
  }
  if (title.length > TITLE_MAX) {
    fieldErrors.title = `Keep the title to ${TITLE_MAX} characters; search engines cut it off after about 60`;
  }
  if (description.length > DESCRIPTION_MAX) {
    fieldErrors.description = `Keep the description to ${DESCRIPTION_MAX} characters; search engines cut it off after about 155`;
  }
  if (canonical && !targetKind(canonical)) {
    fieldErrors.canonical =
      "Use a path on this site, like /products/name, or a full https:// address";
  }
  if (note.length > 300)
    fieldErrors.note = "Keep the note under 300 characters";

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const input: Input = {
    path,
    title: title || null,
    titleAbsolute: formData.get("titleAbsolute") === "on" && Boolean(title),
    description: description || null,
    canonical: canonical || null,
    noindex: formData.get("noindex") === "on",
    ogImageId: ogImageId || null,
    note: note || null,
  };

  if (
    !input.title &&
    !input.description &&
    !input.canonical &&
    !input.noindex &&
    !input.ogImageId
  ) {
    return {
      fieldErrors: {
        title:
          "Set at least one thing to override — a title, a description, a canonical, an image or noindex",
      },
    };
  }

  return { input };
}

/**
 * Checks that depend on the database: the address is not redirected away (an
 * override there would never be seen), the image is a real raster image, and
 * a change to indexation is made by someone allowed to make it.
 */
async function vet(
  input: Input,
  previous: { noindex: boolean } | null,
): Promise<OverrideActionState | null> {
  const redirected = await prisma.redirect.findFirst({
    where: { fromPath: input.path, active: true },
    select: { toPath: true },
  });
  if (redirected) {
    return refused({
      path: `That address redirects to ${redirected.toPath}, so nobody would ever see this. Set it on ${redirected.toPath} instead.`,
    });
  }

  if (input.ogImageId) {
    const asset = await prisma.mediaAsset.findFirst({
      where: { id: input.ogImageId, deletedAt: null, kind: "IMAGE" },
      select: { id: true },
    });
    if (!asset) {
      return refused({
        ogImageId:
          "Choose a photo or raster image; social networks do not show SVGs",
      });
    }
  }

  // Whether search engines may index a page is a publishing decision, as it
  // is for city pages: it takes SEO:PUBLISH, whichever way it is switched.
  if (input.noindex !== (previous?.noindex ?? false)) {
    const { can } = await currentPermissions();
    if (!can("SEO", "PUBLISH")) {
      return refused({
        noindex:
          "Changing whether a page is indexed needs the SEO publish permission",
      });
    }
  }

  return null;
}

async function notice(path: string): Promise<string> {
  const live = await livePathOwner(path);
  return live
    ? ""
    : ` Nothing is published at ${path} yet; the override applies once something is.`;
}

async function syncImage(id: string, ogImageId: string | null) {
  await clearUsage({
    entityType: "SeoOverride",
    entityId: id,
    field: "ogImage",
  });
  if (ogImageId) {
    await recordUsage({
      assetId: ogImageId,
      entityType: "SeoOverride",
      entityId: id,
      field: "ogImage",
    });
  }
}

function revalidate(paths: string[]): void {
  revalidatePath("/admin/seo/metadata");
  revalidatePath("/admin/seo/metadata/[id]", "page");
  revalidatePath("/sitemap.xml");
  for (const path of paths) revalidatePath(path);
}

export async function createOverrideAction(
  _previous: OverrideActionState,
  formData: FormData,
): Promise<OverrideActionState> {
  const actor = await requirePermission("SEO", "EDIT");

  const { input, fieldErrors } = readForm(formData);
  if (!input) return refused(fieldErrors ?? {});

  const existing = await prisma.seoOverride.findUnique({
    where: { path: input.path },
    select: { id: true },
  });
  if (existing) {
    return refused({
      path: "That address already has an override. Edit that one instead.",
    });
  }

  const refusal = await vet(input, null);
  if (refusal) return refusal;

  const created = await prisma.seoOverride.create({
    data: { ...input, updatedById: actor.id },
    select: { id: true },
  });
  await syncImage(created.id, input.ogImageId);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "SEO_OVERRIDE_CREATED",
    module: "SEO",
    entityType: "SeoOverride",
    entityId: created.id,
    summary: `Metadata override for ${input.path}`,
    metadata: { noindex: input.noindex, canonical: input.canonical },
  });

  revalidate([input.path]);
  const warn = await notice(input.path);
  redirect(
    `/admin/seo/metadata/${created.id}?saved=created${warn ? "&unpublished=1" : ""}`,
  );
}

export async function updateOverrideAction(
  _previous: OverrideActionState,
  formData: FormData,
): Promise<OverrideActionState> {
  const actor = await requirePermission("SEO", "EDIT");

  const id = String(formData.get("overrideId") ?? "");
  const existing = await prisma.seoOverride.findUnique({
    where: { id },
    select: { id: true, path: true, noindex: true },
  });
  if (!existing) return { error: "That override no longer exists." };

  const { input, fieldErrors } = readForm(formData);
  if (!input) return refused(fieldErrors ?? {});

  if (input.path !== existing.path) {
    const clash = await prisma.seoOverride.findUnique({
      where: { path: input.path },
      select: { id: true },
    });
    if (clash) {
      return refused({
        path: "That address already has an override. Edit that one instead.",
      });
    }
  }

  const refusal = await vet(input, existing);
  if (refusal) return refusal;

  await prisma.seoOverride.update({
    where: { id: existing.id },
    data: { ...input, updatedById: actor.id },
  });
  await syncImage(existing.id, input.ogImageId);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "SEO_OVERRIDE_UPDATED",
    module: "SEO",
    entityType: "SeoOverride",
    entityId: existing.id,
    summary: `Metadata override for ${input.path}`,
    metadata: {
      noindex: { from: existing.noindex, to: input.noindex },
      canonical: input.canonical,
      ...(existing.path !== input.path ? { movedFrom: existing.path } : {}),
    },
  });

  revalidate([existing.path, input.path]);
  return { success: `Override saved.${await notice(input.path)}` };
}

export async function deleteOverrideAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("SEO", "EDIT");

  const id = String(formData.get("overrideId") ?? "");
  const existing = await prisma.seoOverride.findUnique({
    where: { id },
    select: { id: true, path: true, noindex: true },
  });
  if (!existing) redirect("/admin/seo/metadata");

  // Deleting a noindex override puts the page back into the index, which is
  // the same publishing decision as switching it off.
  if (existing.noindex) await requirePermission("SEO", "PUBLISH");

  await prisma.seoOverride.delete({ where: { id: existing.id } });
  await clearUsage({
    entityType: "SeoOverride",
    entityId: existing.id,
    field: "ogImage",
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "SEO_OVERRIDE_DELETED",
    module: "SEO",
    entityType: "SeoOverride",
    entityId: existing.id,
    summary: `Removed the metadata override for ${existing.path}`,
  });

  revalidate([existing.path]);
  redirect("/admin/seo/metadata?deleted=1");
}
