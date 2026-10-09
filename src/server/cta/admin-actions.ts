"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import { fieldErrorsFrom } from "@/lib/validation/field-errors";
import { ctaConfigSchema, readCtaConfigForm, type CtaConfigInput } from "@/lib/validation/cta";

export type CtaAdminState = { error?: string; success?: string; fieldErrors?: Record<string, string> };
export type CtaToggleResult = { ok: true; active: boolean } | { ok: false; active: boolean; error: string };

/**
 * Configurations reach visitors through /api/public/cta, rendered per
 * request, so only the admin screens need revalidating.
 */
function revalidateCta(): void {
  revalidatePath("/admin/cta-popups");
  revalidatePath("/admin/cta-popups/[id]", "page");
}

function configData(input: CtaConfigInput) {
  return {
    key: input.key,
    name: input.name,
    kind: input.kind,
    isDefault: input.isDefault,
    mode: input.mode,
    popupType: input.popupType,
    heading: input.heading,
    description: input.description || null,
    submitLabel: input.submitLabel || null,
    successMessage: input.successMessage || null,
    consentText: input.consentText || null,
    privacyHref: input.privacyHref || null,
    afterSubmit: input.afterSubmit,
    redirectHref: input.afterSubmit === "REDIRECT" ? input.redirectHref || null : null,
    directHref: input.directHref || null,
    placements: input.placements,
    targetProductId: input.targetProductId || null,
    targetPaths: input.targetPaths,
    fileId: input.kind === "DOWNLOAD_CATALOGUE" ? input.fileId || null : null,
    formId: input.popupType === "CUSTOM_FORM" ? input.formId || null : null,
    fields: input.fields as unknown as Prisma.InputJsonValue,
  } satisfies Prisma.CtaConfigUncheckedUpdateInput;
}

/** What a configuration points at must exist, and be usable, when it is saved. */
async function checkReferences(input: CtaConfigInput, selfId: string | null): Promise<Record<string, string>> {
  const errors: Record<string, string> = {};
  const [product, file, form, keyTaken] = await Promise.all([
    input.targetProductId
      ? prisma.product.findFirst({ where: { id: input.targetProductId, deletedAt: null }, select: { id: true } })
      : null,
    input.kind === "DOWNLOAD_CATALOGUE" && input.fileId
      ? prisma.mediaAsset.findFirst({ where: { id: input.fileId, deletedAt: null, kind: "DOCUMENT" }, select: { id: true } })
      : null,
    input.popupType === "CUSTOM_FORM" && input.formId
      ? prisma.form.findFirst({ where: { id: input.formId, deletedAt: null, status: "PUBLISHED" }, select: { id: true } })
      : null,
    prisma.ctaConfig.findFirst({
      where: { key: input.key, ...(selfId ? { id: { not: selfId } } : {}) },
      select: { id: true },
    }),
  ]);
  if (input.targetProductId && !product) errors.targetProductId = "That product no longer exists";
  if (input.kind === "DOWNLOAD_CATALOGUE" && input.fileId && !file) errors.fileId = "Choose a document from the media library";
  if (input.popupType === "CUSTOM_FORM" && input.formId && !form) errors.formId = "Choose a published form";
  // Keys are never reused, even from a deleted configuration: old leads refer to them.
  if (keyTaken) errors.key = "That key is already used. Keys are never reused.";
  return errors;
}

async function validate(formData: FormData, selfId: string | null) {
  const parsed = ctaConfigSchema.safeParse(readCtaConfigForm(formData));
  if (!parsed.success) return { ok: false as const, state: { fieldErrors: fieldErrorsFrom(parsed.error) } };
  const errors = await checkReferences(parsed.data, selfId);
  if (Object.keys(errors).length > 0) return { ok: false as const, state: { fieldErrors: errors } };
  return { ok: true as const, data: parsed.data };
}

/** Only one default per kind: making this one the default retires the other. */
async function saveWithDefault(
  input: CtaConfigInput,
  write: (tx: Prisma.TransactionClient) => Promise<{ id: string; name: string }>,
) {
  return prisma.$transaction(async (tx) => {
    const saved = await write(tx);
    if (input.isDefault) {
      await tx.ctaConfig.updateMany({
        where: { kind: input.kind, isDefault: true, id: { not: saved.id } },
        data: { isDefault: false },
      });
    }
    return saved;
  });
}

/** New configurations always start switched off. */
export async function createCtaConfigAction(_previous: CtaAdminState, formData: FormData): Promise<CtaAdminState> {
  const actor = await requirePermission("CTA_POPUPS", "CREATE");
  const result = await validate(formData, null);
  if (!result.ok) return result.state;

  const config = await saveWithDefault(result.data, (tx) =>
    tx.ctaConfig.create({
      data: { ...configData(result.data), active: false, updatedById: actor.id },
      select: { id: true, name: true },
    }),
  );

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "CTA_CONFIG_CREATED",
    module: "CTA_POPUPS",
    entityType: "CtaConfig",
    entityId: config.id,
    summary: `Created CTA popup ${config.name}`,
    metadata: { key: result.data.key, kind: result.data.kind, isDefault: result.data.isDefault },
  });
  revalidateCta();
  redirect(`/admin/cta-popups/${config.id}?created=1`);
}

/** Editing never switches a configuration on or off; that is Publish. */
export async function updateCtaConfigAction(_previous: CtaAdminState, formData: FormData): Promise<CtaAdminState> {
  const actor = await requirePermission("CTA_POPUPS", "EDIT");
  const id = String(formData.get("configId") ?? "");
  const existing = await prisma.ctaConfig.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, key: true, active: true, isDefault: true, kind: true },
  });
  if (!existing) return { error: "That configuration no longer exists." };

  const result = await validate(formData, existing.id);
  if (!result.ok) return result.state;
  // The key is how leads and pages refer to it: fixed once created.
  if (result.data.key !== existing.key) return { fieldErrors: { key: "The key cannot be changed once created." } };

  const config = await saveWithDefault(result.data, (tx) =>
    tx.ctaConfig.update({
      where: { id: existing.id },
      data: { ...configData(result.data), updatedById: actor.id },
      select: { id: true, name: true },
    }),
  );

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "CTA_CONFIG_UPDATED",
    module: "CTA_POPUPS",
    entityType: "CtaConfig",
    entityId: config.id,
    summary: `Updated CTA popup ${config.name}`,
    metadata: { key: existing.key, active: existing.active, isDefault: result.data.isDefault },
  });
  revalidateCta();
  return { success: "Configuration saved." };
}

/** Switches a configuration on or off. Returns the state actually stored. */
export async function setCtaConfigActiveAction(configId: string, active: boolean): Promise<CtaToggleResult> {
  const actor = await requirePermission("CTA_POPUPS", "PUBLISH");
  const config = await prisma.ctaConfig.findFirst({
    where: { id: String(configId), deletedAt: null },
    select: {
      id: true,
      name: true,
      active: true,
      kind: true,
      popupType: true,
      file: { select: { deletedAt: true } },
      form: { select: { status: true, deletedAt: true } },
    },
  });
  if (!config) return { ok: false, active: false, error: "That configuration no longer exists." };

  const wanted = active === true;
  if (wanted) {
    // Checked again now: a file or form may have gone since it was saved.
    if (config.kind === "DOWNLOAD_CATALOGUE" && (!config.file || config.file.deletedAt)) {
      return { ok: false, active: config.active, error: "Choose a catalogue file before switching this on." };
    }
    if (config.popupType === "CUSTOM_FORM" && (!config.form || config.form.deletedAt || config.form.status !== "PUBLISHED")) {
      return { ok: false, active: config.active, error: "Choose a published form before switching this on." };
    }
  }
  if (config.active !== wanted) {
    await prisma.ctaConfig.update({ where: { id: config.id }, data: { active: wanted, updatedById: actor.id } });
    await recordAuditEvent({
      actorId: actor.id,
      actorEmail: actor.email,
      action: wanted ? "CTA_CONFIG_ACTIVATED" : "CTA_CONFIG_DEACTIVATED",
      module: "CTA_POPUPS",
      entityType: "CtaConfig",
      entityId: config.id,
      summary: `${wanted ? "Activated" : "Deactivated"} CTA popup ${config.name}`,
    });
    revalidateCta();
  }
  return { ok: true, active: wanted };
}

/** Soft delete: kept for the audit trail and the leads that name its key. */
export async function deleteCtaConfigAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("CTA_POPUPS", "DELETE");
  const config = await prisma.ctaConfig.findFirst({
    where: { id: String(formData.get("configId") ?? ""), deletedAt: null },
    select: { id: true, name: true, key: true },
  });
  if (!config) redirect("/admin/cta-popups?error=missing");

  await prisma.ctaConfig.update({
    where: { id: config.id },
    data: { deletedAt: new Date(), active: false, isDefault: false, updatedById: actor.id },
  });
  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "CTA_CONFIG_DELETED",
    module: "CTA_POPUPS",
    entityType: "CtaConfig",
    entityId: config.id,
    summary: `Deleted CTA popup ${config.name}`,
    metadata: { key: config.key },
  });
  revalidateCta();
  redirect("/admin/cta-popups?deleted=1");
}
