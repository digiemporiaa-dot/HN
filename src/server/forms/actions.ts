"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import { fieldErrorsFrom } from "@/lib/validation/field-errors";
import { readJsonArray } from "@/lib/validation/product-info";
import {
  CHOICE_TYPES,
  formFieldsSchema,
  formIdSchema,
  formSchema,
  keyFromLabel,
  MAX_OPTIONS,
  uniqueKey,
} from "@/lib/validation/forms";

export type FormActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

function revalidateForms(): void {
  revalidatePath("/admin/forms");
  revalidatePath("/admin/forms/[id]", "page");
}

function readForm(formData: FormData) {
  return {
    name: formData.get("name"),
    key: formData.get("key"),
    description: formData.get("description") ?? "",
    successMessage: formData.get("successMessage") ?? "",
    submitLabel: formData.get("submitLabel") ?? "",
    notifyEmail: formData.get("notifyEmail") ?? "",
    status: formData.get("status"),
  };
}

export async function createFormAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const actor = await requirePermission("FORMS", "CREATE");

  const parsed = formSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  if (parsed.data.status === "PUBLISHED") {
    await requirePermission("FORMS", "EDIT");
  }

  const taken = await prisma.form.findFirst({
    where: { key: parsed.data.key },
    select: { id: true },
  });
  if (taken) return { fieldErrors: { key: "That key is already in use." } };

  const form = await prisma.form.create({
    data: {
      key: parsed.data.key,
      name: parsed.data.name,
      description: parsed.data.description || null,
      successMessage: parsed.data.successMessage || null,
      submitLabel: parsed.data.submitLabel || null,
      notifyEmail: parsed.data.notifyEmail || null,
      status: parsed.data.status,
      publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null,
    },
    select: { id: true, name: true },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "FORM_CREATED",
    module: "FORMS",
    entityType: "Form",
    entityId: form.id,
    summary: form.name,
  });

  revalidateForms();
  redirect(`/admin/forms/${form.id}`);
}

export async function updateFormAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const actor = await requirePermission("FORMS", "EDIT");

  const id = String(formData.get("formId") ?? "");
  const parsed = formSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const existing = await prisma.form.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, status: true, publishedAt: true },
  });
  if (!existing) return { error: "That form no longer exists." };

  const taken = await prisma.form.findFirst({
    where: { key: parsed.data.key, id: { not: existing.id } },
    select: { id: true },
  });
  if (taken) return { fieldErrors: { key: "That key is already in use." } };

  await prisma.form.update({
    where: { id: existing.id },
    data: {
      key: parsed.data.key,
      name: parsed.data.name,
      description: parsed.data.description || null,
      successMessage: parsed.data.successMessage || null,
      submitLabel: parsed.data.submitLabel || null,
      notifyEmail: parsed.data.notifyEmail || null,
      status: parsed.data.status,
      // Stamped the first time it goes live and left alone after, so the date
      // means "published on" rather than "last edited while published".
      publishedAt:
        parsed.data.status === "PUBLISHED"
          ? (existing.publishedAt ?? new Date())
          : existing.publishedAt,
    },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "FORM_UPDATED",
    module: "FORMS",
    entityType: "Form",
    entityId: existing.id,
    summary: parsed.data.name,
    metadata: { status: parsed.data.status },
  });

  revalidateForms();
  return { success: "Form saved." };
}

/**
 * Rewrites a form's fields.
 *
 * Keys are the reason this is not a plain delete-and-recreate. A field that
 * already has a key keeps it, because the answers already collected are filed
 * under it; a new field is given one derived from its label. So renaming a
 * question changes what a visitor reads and nothing else.
 */
export async function saveFormFieldsAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const actor = await requirePermission("FORMS", "EDIT");

  const raw = readJsonArray(formData.get("fields"))
    .map((entry) => {
      const row = (entry ?? {}) as Record<string, unknown>;
      return {
        key: String(row.key ?? "").trim(),
        type: String(row.type ?? "TEXT"),
        label: String(row.label ?? "").trim(),
        placeholder: String(row.placeholder ?? "").trim(),
        help: String(row.help ?? "").trim(),
        required: row.required === true,
        hidden: row.hidden === true,
        options: String(row.options ?? ""),
      };
    })
    // A field with no label is an unfinished row, not an error worth blocking
    // the save for.
    .filter((row) => row.label);

  const parsed = formFieldsSchema.safeParse({
    formId: formData.get("formId"),
    fields: raw,
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const form = await prisma.form.findFirst({
    where: { id: parsed.data.formId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!form) return { error: "That form no longer exists." };

  const taken = new Set<string>();
  const fields = parsed.data.fields.map((field, index) => {
    const key = uniqueKey(field.key || keyFromLabel(field.label), taken);
    taken.add(key);

    return {
      key,
      type: field.type,
      label: field.label,
      placeholder: field.placeholder || null,
      help: field.help || null,
      required: field.required,
      hidden: field.hidden,
      // Choices are dropped for the types that have none, so switching a
      // dropdown to a text box does not leave its old options lying about.
      options: CHOICE_TYPES.includes(field.type)
        ? field.options
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(0, MAX_OPTIONS)
            .join("\n") || null
        : null,
      order: index,
    };
  });

  await prisma.$transaction([
    prisma.formField.deleteMany({ where: { formId: form.id } }),
    prisma.formField.createMany({
      data: fields.map((field) => ({ ...field, formId: form.id })),
    }),
  ]);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "FORM_FIELDS_UPDATED",
    module: "FORMS",
    entityType: "Form",
    entityId: form.id,
    summary: `Fields for ${form.name}`,
    metadata: { fields: fields.length },
  });

  revalidateForms();
  return { success: "Fields saved." };
}

export async function deleteFormAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("FORMS", "DELETE");

  const parsed = formIdSchema.safeParse({ formId: formData.get("formId") });
  if (!parsed.success) redirect("/admin/forms");

  const form = await prisma.form.findFirst({
    where: { id: parsed.data.formId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!form) redirect("/admin/forms");

  // Soft deleted, because the submissions already collected are records of
  // what people sent us and deleting the form should not take them.
  await prisma.form.update({
    where: { id: form.id },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "FORM_DELETED",
    module: "FORMS",
    entityType: "Form",
    entityId: form.id,
    summary: form.name,
  });

  revalidateForms();
  redirect("/admin/forms");
}
