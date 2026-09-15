"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import { fieldErrorsFrom } from "@/lib/validation/field-errors";
import {
  readJsonArray,
  specTemplateSchema,
} from "@/lib/validation/product-info";

export type SpecTemplateActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

type TemplateGroupInput = {
  label: string;
  fields: Array<{ label: string; unit: string }>;
};

/** Drops the blank rows an editor leaves behind rather than rejecting them. */
function tidyGroups(raw: unknown[]): TemplateGroupInput[] {
  return raw
    .map((group) => {
      const source = (group ?? {}) as Record<string, unknown>;
      const fields = Array.isArray(source.fields) ? source.fields : [];
      return {
        label: String(source.label ?? ""),
        fields: fields
          .map((field) => {
            const row = (field ?? {}) as Record<string, unknown>;
            return {
              label: String(row.label ?? "").trim(),
              unit: String(row.unit ?? "").trim(),
            };
          })
          .filter((field) => field.label),
      };
    })
    .filter((group) => group.label.trim() || group.fields.length > 0);
}

function revalidateTemplate(): void {
  revalidatePath("/admin/categories/[id]", "page");
  revalidatePath("/admin/products/[id]", "page");
}

export async function saveSpecTemplateAction(
  _previous: SpecTemplateActionState,
  formData: FormData,
): Promise<SpecTemplateActionState> {
  // Gated on products rather than categories: the template shapes product data,
  // and someone who may rename a category is not thereby entitled to decide
  // what every product in it must specify.
  const actor = await requirePermission("PRODUCTS", "EDIT");

  const parsed = specTemplateSchema.safeParse({
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    groups: tidyGroups(readJsonArray(formData.get("groups"))),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const category = await prisma.category.findFirst({
    where: { id: parsed.data.categoryId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!category) return { error: "That category no longer exists." };

  await prisma.$transaction(async (tx) => {
    const template = await tx.specTemplate.upsert({
      where: { categoryId: category.id },
      update: { name: parsed.data.name },
      create: { categoryId: category.id, name: parsed.data.name },
      select: { id: true },
    });

    // Rewritten rather than diffed. Products keep their own copy of the
    // specifications, so nothing a visitor can see depends on these row ids.
    await tx.specTemplateGroup.deleteMany({
      where: { templateId: template.id },
    });

    for (const [index, group] of parsed.data.groups.entries()) {
      await tx.specTemplateGroup.create({
        data: {
          templateId: template.id,
          label: group.label,
          order: index,
          fields: {
            create: group.fields.map((field, position) => ({
              label: field.label,
              unit: field.unit || null,
              order: position,
            })),
          },
        },
      });
    }
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "SPEC_TEMPLATE_SAVED",
    module: "PRODUCTS",
    entityType: "Category",
    entityId: category.id,
    summary: `Specification template for ${category.name}`,
    metadata: {
      groups: parsed.data.groups.length,
      fields: parsed.data.groups.reduce((sum, g) => sum + g.fields.length, 0),
    },
  });

  revalidateTemplate();
  return { success: "Template saved." };
}

export async function deleteSpecTemplateAction(
  formData: FormData,
): Promise<void> {
  const actor = await requirePermission("PRODUCTS", "EDIT");

  const categoryId = String(formData.get("categoryId") ?? "");
  const template = await prisma.specTemplate.findUnique({
    where: { categoryId },
    select: { id: true, category: { select: { id: true, name: true } } },
  });
  if (!template) redirect("/admin/categories");

  // Products that already applied it keep their specifications: they hold their
  // own copy, which is the whole reason the template is copied rather than
  // linked.
  await prisma.specTemplate.delete({ where: { id: template.id } });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "SPEC_TEMPLATE_DELETED",
    module: "PRODUCTS",
    entityType: "Category",
    entityId: template.category.id,
    summary: `Removed the specification template for ${template.category.name}`,
  });

  revalidateTemplate();
  redirect(`/admin/categories/${template.category.id}`);
}
