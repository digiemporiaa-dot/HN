"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import { clearUsage, recordUsage } from "@/server/media/service";
import { fieldErrorsFrom } from "@/lib/validation/field-errors";
import {
  productApplicationsSchema,
  productDocumentsSchema,
  productFaqsSchema,
  productPointsSchema,
  productRelatedSchema,
  productSpecsSchema,
  readJsonArray,
} from "@/lib/validation/product-info";

export type InfoActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

function revalidateProduct(): void {
  revalidatePath("/admin/products");
  revalidatePath("/admin/products/[id]", "page");
}

/**
 * Confirms the product is still there and still editable.
 *
 * Every action below rewrites a whole child table, so a stale product id must
 * fail before anything is deleted rather than after.
 */
async function liveProduct(productId: string) {
  return prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true, name: true, categoryId: true },
  });
}

/* -------------------------------------------------------------------------
 * Specifications
 * ---------------------------------------------------------------------- */

type SpecGroupInput = {
  label: string;
  items: Array<{ label: string; value: string; unit: string }>;
};

/** Drops the blank rows an editor leaves behind rather than rejecting them. */
function tidySpecGroups(raw: unknown[]): SpecGroupInput[] {
  return raw
    .map((group) => {
      const source = (group ?? {}) as Record<string, unknown>;
      const items = Array.isArray(source.items) ? source.items : [];
      return {
        label: String(source.label ?? ""),
        items: items
          .map((item) => {
            const row = (item ?? {}) as Record<string, unknown>;
            return {
              label: String(row.label ?? "").trim(),
              value: String(row.value ?? "").trim(),
              unit: String(row.unit ?? "").trim(),
            };
          })
          .filter((item) => item.label || item.value),
      };
    })
    .filter((group) => group.label.trim() || group.items.length > 0);
}

export async function saveProductSpecsAction(
  _previous: InfoActionState,
  formData: FormData,
): Promise<InfoActionState> {
  const actor = await requirePermission("PRODUCTS", "EDIT");

  const parsed = productSpecsSchema.safeParse({
    productId: formData.get("productId"),
    groups: tidySpecGroups(readJsonArray(formData.get("groups"))),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const product = await liveProduct(parsed.data.productId);
  if (!product) return { error: "That product no longer exists." };

  // Rewritten rather than diffed: the rows carry no meaning of their own beyond
  // their position, so replacing them is both simpler and correct.
  await prisma.$transaction(async (tx) => {
    await tx.productSpecGroup.deleteMany({ where: { productId: product.id } });

    for (const [index, group] of parsed.data.groups.entries()) {
      await tx.productSpecGroup.create({
        data: {
          productId: product.id,
          label: group.label,
          order: index,
          items: {
            create: group.items.map((item, position) => ({
              label: item.label,
              value: item.value,
              unit: item.unit || null,
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
    action: "PRODUCT_SPECS_UPDATED",
    module: "PRODUCTS",
    entityType: "Product",
    entityId: product.id,
    summary: `Specifications for ${product.name}`,
    metadata: {
      groups: parsed.data.groups.length,
      rows: parsed.data.groups.reduce((sum, g) => sum + g.items.length, 0),
    },
  });

  revalidateProduct();
  return { success: "Specifications saved." };
}

/**
 * Copies the category's template into the product, keeping what is there.
 *
 * Merged by label rather than replacing: applying a template to a product that
 * already has entered values must add the missing rows, never blank the ones
 * someone has filled in. Nothing is removed either — a field dropped from the
 * template may still be true of this particular product.
 */
export async function applySpecTemplateAction(
  _previous: InfoActionState,
  formData: FormData,
): Promise<InfoActionState> {
  const actor = await requirePermission("PRODUCTS", "EDIT");

  const productId = String(formData.get("productId") ?? "");
  const product = await liveProduct(productId);
  if (!product) return { error: "That product no longer exists." };

  const template = await prisma.specTemplate.findUnique({
    where: { categoryId: product.categoryId },
    select: {
      name: true,
      groups: {
        orderBy: { order: "asc" },
        select: {
          label: true,
          fields: {
            orderBy: { order: "asc" },
            select: { label: true, unit: true },
          },
        },
      },
    },
  });
  if (!template) {
    return { error: "This product's category has no specification template." };
  }

  const existing = await prisma.productSpecGroup.findMany({
    where: { productId: product.id },
    orderBy: { order: "asc" },
    select: {
      id: true,
      label: true,
      order: true,
      items: { orderBy: { order: "asc" }, select: { label: true } },
    },
  });

  const groupByLabel = new Map(
    existing.map((group) => [group.label.toLowerCase(), group]),
  );
  let nextOrder = existing.length;
  let addedGroups = 0;
  let addedFields = 0;

  for (const templateGroup of template.groups) {
    const match = groupByLabel.get(templateGroup.label.toLowerCase());

    if (!match) {
      await prisma.productSpecGroup.create({
        data: {
          productId: product.id,
          label: templateGroup.label,
          order: nextOrder,
          items: {
            create: templateGroup.fields.map((field, position) => ({
              label: field.label,
              value: "",
              unit: field.unit,
              order: position,
            })),
          },
        },
      });
      nextOrder += 1;
      addedGroups += 1;
      addedFields += templateGroup.fields.length;
      continue;
    }

    const present = new Set(
      match.items.map((item) => item.label.toLowerCase()),
    );
    const missing = templateGroup.fields.filter(
      (field) => !present.has(field.label.toLowerCase()),
    );
    if (missing.length === 0) continue;

    await prisma.productSpecItem.createMany({
      data: missing.map((field, position) => ({
        groupId: match.id,
        label: field.label,
        value: "",
        unit: field.unit,
        order: match.items.length + position,
      })),
    });
    addedFields += missing.length;
  }

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "PRODUCT_SPEC_TEMPLATE_APPLIED",
    module: "PRODUCTS",
    entityType: "Product",
    entityId: product.id,
    summary: `Applied ${template.name} to ${product.name}`,
    metadata: { addedGroups, addedFields },
  });

  revalidateProduct();
  return {
    success:
      addedFields === 0
        ? "The template adds nothing this product does not already have."
        : `Added ${addedFields} field${addedFields === 1 ? "" : "s"} from the template.`,
  };
}

/* -------------------------------------------------------------------------
 * Documents
 * ---------------------------------------------------------------------- */

export async function saveProductDocumentsAction(
  _previous: InfoActionState,
  formData: FormData,
): Promise<InfoActionState> {
  const actor = await requirePermission("PRODUCTS", "EDIT");

  const parsed = productDocumentsSchema.safeParse({
    productId: formData.get("productId"),
    documents: readJsonArray(formData.get("documents")),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const product = await liveProduct(parsed.data.productId);
  if (!product) return { error: "That product no longer exists." };

  const ids = parsed.data.documents.map((row) => row.mediaId);
  const live = await prisma.mediaAsset.findMany({
    where: { id: { in: ids }, deletedAt: null, kind: "DOCUMENT" },
    select: { id: true },
  });
  const liveIds = new Set(live.map((asset) => asset.id));

  // The posted order is what the editor arranged, so filter that rather than
  // the query result. A file deleted from the library since the page loaded
  // simply drops out.
  const seen = new Set<string>();
  const documents = parsed.data.documents.filter((row) => {
    if (!liveIds.has(row.mediaId) || seen.has(row.mediaId)) return false;
    seen.add(row.mediaId);
    return true;
  });

  await prisma.$transaction([
    prisma.productDocument.deleteMany({ where: { productId: product.id } }),
    prisma.productDocument.createMany({
      data: documents.map((row, index) => ({
        productId: product.id,
        mediaId: row.mediaId,
        title: row.title,
        kind: row.kind,
        gated: row.gated,
        order: index,
      })),
    }),
  ]);

  await clearUsage({
    entityType: "Product",
    entityId: product.id,
    field: "documents",
  });
  for (const row of documents) {
    await recordUsage({
      assetId: row.mediaId,
      entityType: "Product",
      entityId: product.id,
      field: "documents",
    });
  }

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "PRODUCT_DOCUMENTS_UPDATED",
    module: "PRODUCTS",
    entityType: "Product",
    entityId: product.id,
    summary: `Documents for ${product.name}`,
    metadata: {
      documents: documents.length,
      gated: documents.filter((row) => row.gated).length,
    },
  });

  revalidateProduct();
  return { success: "Documents saved." };
}

/* -------------------------------------------------------------------------
 * Applications
 * ---------------------------------------------------------------------- */

export async function saveProductApplicationsAction(
  _previous: InfoActionState,
  formData: FormData,
): Promise<InfoActionState> {
  const actor = await requirePermission("PRODUCTS", "EDIT");

  const parsed = productApplicationsSchema.safeParse({
    productId: formData.get("productId"),
    applicationIds: formData
      .getAll("applicationIds")
      .map(String)
      .filter(Boolean),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const product = await liveProduct(parsed.data.productId);
  if (!product) return { error: "That product no longer exists." };

  const live = await prisma.application.findMany({
    where: { id: { in: parsed.data.applicationIds } },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.productApplication.deleteMany({ where: { productId: product.id } }),
    prisma.productApplication.createMany({
      data: live.map((row) => ({
        productId: product.id,
        applicationId: row.id,
      })),
    }),
  ]);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "PRODUCT_APPLICATIONS_UPDATED",
    module: "PRODUCTS",
    entityType: "Product",
    entityId: product.id,
    summary: `Applications for ${product.name}`,
    metadata: { applications: live.length },
  });

  revalidateProduct();
  return { success: "Applications saved." };
}

/* -------------------------------------------------------------------------
 * Related products
 * ---------------------------------------------------------------------- */

export async function saveProductRelatedAction(
  _previous: InfoActionState,
  formData: FormData,
): Promise<InfoActionState> {
  const actor = await requirePermission("PRODUCTS", "EDIT");

  const parsed = productRelatedSchema.safeParse({
    productId: formData.get("productId"),
    relatedIds: readJsonArray(formData.get("relatedIds")).map(String),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const product = await liveProduct(parsed.data.productId);
  if (!product) return { error: "That product no longer exists." };

  const live = await prisma.product.findMany({
    where: {
      id: { in: parsed.data.relatedIds.filter((id) => id !== product.id) },
      deletedAt: null,
    },
    select: { id: true },
  });
  const liveIds = new Set(live.map((row) => row.id));

  const seen = new Set<string>();
  const related = parsed.data.relatedIds.filter((id) => {
    if (!liveIds.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  await prisma.$transaction([
    prisma.productRelated.deleteMany({ where: { productId: product.id } }),
    prisma.productRelated.createMany({
      data: related.map((relatedId, index) => ({
        productId: product.id,
        relatedId,
        order: index,
      })),
    }),
  ]);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "PRODUCT_RELATED_UPDATED",
    module: "PRODUCTS",
    entityType: "Product",
    entityId: product.id,
    summary: `Related products for ${product.name}`,
    metadata: { related: related.length },
  });

  revalidateProduct();
  return { success: "Related products saved." };
}

/* -------------------------------------------------------------------------
 * FAQs
 * ---------------------------------------------------------------------- */

export async function saveProductFaqsAction(
  _previous: InfoActionState,
  formData: FormData,
): Promise<InfoActionState> {
  const actor = await requirePermission("PRODUCTS", "EDIT");

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

  const parsed = productFaqsSchema.safeParse({
    productId: formData.get("productId"),
    faqs: raw,
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const product = await liveProduct(parsed.data.productId);
  if (!product) return { error: "That product no longer exists." };

  await prisma.$transaction([
    prisma.faq.deleteMany({
      where: { entityType: "Product", entityId: product.id },
    }),
    prisma.faq.createMany({
      data: parsed.data.faqs.map((row, index) => ({
        entityType: "Product",
        entityId: product.id,
        question: row.question,
        answer: row.answer,
        order: index,
      })),
    }),
  ]);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "PRODUCT_FAQS_UPDATED",
    module: "PRODUCTS",
    entityType: "Product",
    entityId: product.id,
    summary: `FAQs for ${product.name}`,
    metadata: { faqs: parsed.data.faqs.length },
  });

  revalidateProduct();
  return { success: "Questions saved." };
}

/* -------------------------------------------------------------------------
 * Highlights and features
 * ---------------------------------------------------------------------- */

export async function saveProductPointsAction(
  _previous: InfoActionState,
  formData: FormData,
): Promise<InfoActionState> {
  const actor = await requirePermission("PRODUCTS", "EDIT");

  // Both lists arrive as JSON from the editor's own state rather than as named
  // inputs, for the same reason the other panels do: order matters, and a row
  // scrolled out of view is still a row.
  const highlights = readJsonArray(formData.get("highlights"))
    .map((entry) => ({
      title: String(
        ((entry ?? {}) as Record<string, unknown>).title ?? "",
      ).trim(),
    }))
    // An empty box is an unfinished row, not an error worth blocking a save for.
    .filter((row) => row.title);

  const features = readJsonArray(formData.get("features"))
    .map((entry) => {
      const row = (entry ?? {}) as Record<string, unknown>;
      return {
        title: String(row.title ?? "").trim(),
        body: String(row.body ?? "").trim(),
      };
    })
    .filter((row) => row.title || row.body);

  const parsed = productPointsSchema.safeParse({
    productId: formData.get("productId"),
    highlights,
    features,
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const product = await liveProduct(parsed.data.productId);
  if (!product) return { error: "That product no longer exists." };

  // The whole table is rewritten, which is what makes reordering a save rather
  // than a sequence of moves. Both lists go in one transaction so a product can
  // never be left with new highlights and the old features.
  await prisma.$transaction([
    prisma.productPoint.deleteMany({ where: { productId: product.id } }),
    prisma.productPoint.createMany({
      data: [
        ...parsed.data.highlights.map((row, index) => ({
          productId: product.id,
          kind: "HIGHLIGHT" as const,
          title: row.title,
          body: null,
          order: index,
        })),
        ...parsed.data.features.map((row, index) => ({
          productId: product.id,
          kind: "FEATURE" as const,
          title: row.title,
          body: row.body || null,
          order: index,
        })),
      ],
    }),
  ]);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "PRODUCT_POINTS_UPDATED",
    module: "PRODUCTS",
    entityType: "Product",
    entityId: product.id,
    summary: `Highlights and features for ${product.name}`,
    metadata: {
      highlights: parsed.data.highlights.length,
      features: parsed.data.features.length,
    },
  });

  revalidateProduct();
  return { success: "Highlights and features saved." };
}
