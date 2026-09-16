"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import { fieldErrorsFrom } from "@/lib/validation/field-errors";
import { faqsSchema, readJsonArray } from "@/lib/validation/product-info";
import type { InfoActionState } from "@/server/products/info-actions";

/**
 * What each kind of entity's questions cost to edit, and where they live.
 *
 * The entity type arrives in the form, so it is never used to look anything up
 * until it has been matched against this table: the permission a save requires
 * is decided here, from a value the schema has already constrained to one of
 * two, rather than taken from the submission.
 */
const OWNERS = {
  Product: {
    module: "PRODUCTS",
    action: "PRODUCT_FAQS_UPDATED",
    revalidate: ["/admin/products", "/admin/products/[id]"],
    find: (id: string) =>
      prisma.product.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, name: true },
      }),
  },
  Category: {
    module: "CATEGORIES",
    action: "CATEGORY_FAQS_UPDATED",
    revalidate: ["/admin/categories", "/admin/categories/[id]"],
    find: (id: string) =>
      prisma.category.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, name: true },
      }),
  },
} as const;

/**
 * Saves the questions on a product or a category.
 *
 * One action for both, because the FAQ table is keyed by entity type and id:
 * two copies of this would be two places for the permission check to drift.
 */
export async function saveFaqsAction(
  _previous: InfoActionState,
  formData: FormData,
): Promise<InfoActionState> {
  const raw = readJsonArray(formData.get("faqs"))
    .map((entry) => {
      const row = (entry ?? {}) as Record<string, unknown>;
      return {
        question: String(row.question ?? "").trim(),
        answer: String(row.answer ?? "").trim(),
      };
    })
    // A pair of empty boxes is an unfinished row, not an error worth blocking
    // the save for.
    .filter((row) => row.question || row.answer);

  const parsed = faqsSchema.safeParse({
    entityType: formData.get("entityType"),
    entityId: formData.get("entityId"),
    faqs: raw,
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const owner = OWNERS[parsed.data.entityType];
  const actor = await requirePermission(owner.module, "EDIT");

  const entity = await owner.find(parsed.data.entityId);
  if (!entity) return { error: "That record no longer exists." };

  // The whole set is rewritten, which is what makes reordering a save rather
  // than a sequence of moves.
  await prisma.$transaction([
    prisma.faq.deleteMany({
      where: { entityType: parsed.data.entityType, entityId: entity.id },
    }),
    prisma.faq.createMany({
      data: parsed.data.faqs.map((row, index) => ({
        entityType: parsed.data.entityType,
        entityId: entity.id,
        question: row.question,
        answer: row.answer,
        order: index,
      })),
    }),
  ]);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: owner.action,
    module: owner.module,
    entityType: parsed.data.entityType,
    entityId: entity.id,
    summary: `FAQs for ${entity.name}`,
    metadata: { faqs: parsed.data.faqs.length },
  });

  revalidatePath(owner.revalidate[0]);
  revalidatePath(owner.revalidate[1], "page");
  return { success: "Questions saved." };
}
