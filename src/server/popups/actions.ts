"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import { clearUsage, recordUsage } from "@/server/media/service";
import { fieldErrorsFrom } from "@/lib/validation/field-errors";
import { popupSchema, readPopupForm, type PopupInput } from "@/lib/validation/popups";
import { popupState } from "@/lib/popups/rules";
import { checkPopupLinks } from "./service";

export type PopupActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

export type PopupToggleResult =
  | { ok: true; active: boolean; state: ReturnType<typeof popupState> }
  | { ok: false; active: boolean; error: string };

/**
 * Popups are fetched by the browser from /api/public/popups, which is
 * rendered per request, so no public page needs revalidating: only the
 * admin screens.
 */
function revalidatePopups(): void {
  revalidatePath("/admin/popups");
  revalidatePath("/admin/popups/[id]", "page");
}

function popupData(input: PopupInput) {
  return {
    name: input.name,
    type: input.type,
    eyebrow: input.eyebrow || null,
    heading: input.heading,
    description: input.description || null,
    imageId: input.imageId || null,
    productId: input.productId || null,
    formId: input.formId || null,
    ctaLabel: input.ctaLabel || null,
    ctaHref: input.ctaHref || null,
    trigger: input.trigger,
    delaySeconds: input.delaySeconds,
    scrollPercent: input.scrollPercent,
    device: input.device,
    frequencyDays: input.frequencyDays,
    priority: input.priority,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    targetMode: input.targetMode,
    targetRules: input.targetRules as Prisma.InputJsonValue,
  } satisfies Prisma.PopupUncheckedUpdateInput;
}

async function syncImageUsage(popupId: string, imageId: string | null): Promise<void> {
  await clearUsage({ entityType: "Popup", entityId: popupId, field: "image" });
  if (imageId) {
    await recordUsage({ assetId: imageId, entityType: "Popup", entityId: popupId, field: "image" });
  }
}

async function validate(formData: FormData) {
  const parsed = popupSchema.safeParse(readPopupForm(formData));
  if (!parsed.success) {
    return { ok: false as const, state: { fieldErrors: fieldErrorsFrom(parsed.error) } };
  }
  const linkErrors = await checkPopupLinks({
    imageId: parsed.data.imageId || null,
    productId: parsed.data.productId || null,
    formId: parsed.data.formId || null,
  });
  if (Object.keys(linkErrors).length > 0) {
    return { ok: false as const, state: { fieldErrors: linkErrors } };
  }
  return { ok: true as const, data: parsed.data };
}

/** New popups always start switched off, whatever was posted. */
export async function createPopupAction(
  _previous: PopupActionState,
  formData: FormData,
): Promise<PopupActionState> {
  const actor = await requirePermission("POPUPS", "CREATE");

  const result = await validate(formData);
  if (!result.ok) return result.state;

  const popup = await prisma.popup.create({
    data: { ...popupData(result.data), active: false },
    select: { id: true, name: true },
  });
  await syncImageUsage(popup.id, result.data.imageId || null);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "POPUP_CREATED",
    module: "POPUPS",
    entityType: "Popup",
    entityId: popup.id,
    summary: `Created popup ${popup.name}`,
  });

  revalidatePopups();
  redirect(`/admin/popups/${popup.id}?created=1`);
}

export async function updatePopupAction(
  _previous: PopupActionState,
  formData: FormData,
): Promise<PopupActionState> {
  const actor = await requirePermission("POPUPS", "EDIT");

  const popupId = String(formData.get("popupId") ?? "");
  const existing = await prisma.popup.findFirst({
    where: { id: popupId, deletedAt: null },
    select: { id: true, active: true },
  });
  if (!existing) return { error: "That popup no longer exists." };

  const result = await validate(formData);
  if (!result.ok) return result.state;

  // `active` is not in the data: editing never switches a popup on or off.
  const popup = await prisma.popup.update({
    where: { id: existing.id },
    data: popupData(result.data),
    select: { id: true, name: true },
  });
  await syncImageUsage(popup.id, result.data.imageId || null);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "POPUP_UPDATED",
    module: "POPUPS",
    entityType: "Popup",
    entityId: popup.id,
    summary: `Updated popup ${popup.name}`,
    metadata: { active: existing.active },
  });

  revalidatePopups();
  return { success: "Popup saved." };
}

/**
 * Switches a popup on or off. Its own permission, because switching on is
 * what puts it in front of visitors. Returns the state actually stored, so the
 * switch shows the truth even when the request is refused.
 */
export async function setPopupActiveAction(
  popupId: string,
  active: boolean,
): Promise<PopupToggleResult> {
  const actor = await requirePermission("POPUPS", "PUBLISH");

  const popup = await prisma.popup.findFirst({
    where: { id: String(popupId), deletedAt: null },
    select: {
      id: true,
      name: true,
      type: true,
      active: true,
      imageId: true,
      productId: true,
      formId: true,
      startsAt: true,
      endsAt: true,
    },
  });
  if (!popup) return { ok: false, active: false, error: "That popup no longer exists." };

  const wanted = active === true;
  if (wanted) {
    // What it depends on is checked again now: a form or product may have
    // been unpublished since the popup was saved.
    if (popup.type === "ENQUIRY" && !popup.formId) {
      return { ok: false, active: popup.active, error: "Choose a published form before switching this popup on." };
    }
    if (popup.type === "PRODUCT_SPOTLIGHT" && !popup.productId) {
      return { ok: false, active: popup.active, error: "Choose a published product before switching this popup on." };
    }
    const errors = await checkPopupLinks(popup);
    const first = Object.values(errors)[0];
    if (first) {
      return { ok: false, active: popup.active, error: `${first}. Fix it in the editor, then switch the popup on.` };
    }
  }

  const updated =
    popup.active === wanted
      ? popup
      : await prisma.popup.update({
          where: { id: popup.id },
          data: { active: wanted },
          select: { id: true, name: true, active: true, startsAt: true, endsAt: true },
        });

  if (popup.active !== wanted) {
    await recordAuditEvent({
      actorId: actor.id,
      actorEmail: actor.email,
      action: wanted ? "POPUP_ACTIVATED" : "POPUP_DEACTIVATED",
      module: "POPUPS",
      entityType: "Popup",
      entityId: popup.id,
      summary: `${wanted ? "Activated" : "Deactivated"} popup ${popup.name}`,
    });
    revalidatePopups();
  }

  return { ok: true, active: updated.active, state: popupState(updated) };
}

/** A copy, switched off, so it can be edited before anyone sees it. */
export async function duplicatePopupAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("POPUPS", "CREATE");
  const source = await prisma.popup.findFirst({
    where: { id: String(formData.get("popupId") ?? ""), deletedAt: null },
  });
  if (!source) redirect("/admin/popups?error=missing");

  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    deletedAt: _deletedAt,
    targetRules,
    ...rest
  } = source;
  const copy = await prisma.popup.create({
    data: {
      ...rest,
      targetRules: (targetRules ?? []) as Prisma.InputJsonValue,
      name: `${source.name} (copy)`.slice(0, 120),
      active: false,
    },
    select: { id: true, name: true },
  });
  await syncImageUsage(copy.id, source.imageId);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "POPUP_CREATED",
    module: "POPUPS",
    entityType: "Popup",
    entityId: copy.id,
    summary: `Duplicated popup ${source.name}`,
    metadata: { sourceId: source.id },
  });

  revalidatePopups();
  redirect(`/admin/popups/${copy.id}?created=1`);
}

/** Soft delete: the row stays for the audit trail, and is never shown again. */
export async function deletePopupAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("POPUPS", "DELETE");
  const popup = await prisma.popup.findFirst({
    where: { id: String(formData.get("popupId") ?? ""), deletedAt: null },
    select: { id: true, name: true },
  });
  if (!popup) redirect("/admin/popups?error=missing");

  await prisma.popup.update({
    where: { id: popup.id },
    data: { deletedAt: new Date(), active: false },
  });
  await clearUsage({ entityType: "Popup", entityId: popup.id, field: "image" });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "POPUP_DELETED",
    module: "POPUPS",
    entityType: "Popup",
    entityId: popup.id,
    summary: `Deleted popup ${popup.name}`,
  });

  revalidatePopups();
  redirect("/admin/popups?deleted=1");
}
