"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import { fieldErrorsFrom } from "@/lib/validation/field-errors";
import { clearUsage, recordUsage } from "@/server/media/service";
import {
  categoryIdSchema,
  categorySchema,
  createCategorySchema,
  moveCategorySchema,
} from "@/lib/validation/categories";
import { MAX_CATEGORY_DEPTH } from "./service";

export type CategoryActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Invalidates the screens a category change affects.
 *
 * Deliberately not `revalidatePath("/", "layout")`: invalidating the root
 * layout re-renders the whole tree, which remounts the editing form and throws
 * away what the editor just chose. The dynamic admin route is invalidated by
 * its pattern, which is the only form Next honours for a dynamic segment.
 */
function revalidateCategories(): void {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/subcategories");
  revalidatePath("/admin/categories/[id]", "page");
}

/** Rewrites a category's media usage so the library's "in use" count stays true. */
async function syncImageUsage(
  categoryId: string,
  field: "image" | "banner",
  assetId: string,
): Promise<void> {
  await clearUsage({ entityType: "Category", entityId: categoryId, field });
  if (!assetId) return;
  await recordUsage({
    assetId,
    entityType: "Category",
    entityId: categoryId,
    field,
  });
}

function readForm(formData: FormData) {
  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    shortDescription: formData.get("shortDescription") ?? "",
    description: formData.get("description") ?? "",
    procurementInfo: formData.get("procurementInfo") ?? "",
    imageId: formData.get("imageId") ?? "",
    bannerId: formData.get("bannerId") ?? "",
    featured: formData.get("featured") === "on",
    status: formData.get("status") ?? "DRAFT",
  };
}

/**
 * Slug uniqueness is scoped to the parent, matching the public route shape:
 * two parents may each hold an "accessories" subcategory, but a single parent
 * may not, and two top-level categories may not share a slug.
 */
async function slugTaken(
  parentId: string | null,
  slug: string,
  exceptId?: string,
): Promise<boolean> {
  const clash = await prisma.category.findFirst({
    where: { parentId, slug, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  return Boolean(clash);
}

export async function createCategoryAction(
  _previous: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const actor = await requirePermission("CATEGORIES", "CREATE");

  const parsed = createCategorySchema.safeParse({
    ...readForm(formData),
    parentId: formData.get("parentId") ?? "",
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  let parentId: string | null = null;
  let depth = 0;

  if (parsed.data.parentId) {
    const parent = await prisma.category.findFirst({
      where: { id: parsed.data.parentId, deletedAt: null },
      select: { id: true, depth: true },
    });
    // Checked rather than trusted: the parent id comes from the form.
    if (!parent)
      return { fieldErrors: { parentId: "Choose a parent category." } };
    if (parent.depth >= MAX_CATEGORY_DEPTH) {
      return {
        fieldErrors: { parentId: "That category cannot hold subcategories." },
      };
    }
    parentId = parent.id;
    depth = parent.depth + 1;
  }

  if (await slugTaken(parentId, parsed.data.slug)) {
    return {
      fieldErrors: {
        slug: parentId
          ? "That parent already has a subcategory with this slug."
          : "A category already uses that slug.",
      },
    };
  }

  if (parsed.data.status === "PUBLISHED") {
    await requirePermission("CATEGORIES", "PUBLISH");
  }

  const last = await prisma.category.findFirst({
    where: { parentId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const category = await prisma.category.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      parentId,
      depth,
      order: (last?.order ?? -1) + 1,
      shortDescription: parsed.data.shortDescription || null,
      description: parsed.data.description || null,
      procurementInfo: parsed.data.procurementInfo || null,
      imageId: parsed.data.imageId || null,
      bannerId: parsed.data.bannerId || null,
      featured: parsed.data.featured,
      status: parsed.data.status,
      publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null,
    },
    select: { id: true, name: true },
  });

  await syncImageUsage(category.id, "image", parsed.data.imageId);
  await syncImageUsage(category.id, "banner", parsed.data.bannerId);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "CATEGORY_CREATED",
    module: "CATEGORIES",
    entityType: "Category",
    entityId: category.id,
    summary: `Created ${depth === 0 ? "category" : "subcategory"} ${category.name}`,
  });

  revalidateCategories();
  redirect(`/admin/categories/${category.id}`);
}

export async function updateCategoryAction(
  _previous: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const actor = await requirePermission("CATEGORIES", "EDIT");

  const categoryId = String(formData.get("categoryId") ?? "");
  const category = await prisma.category.findFirst({
    where: { id: categoryId, deletedAt: null },
    select: {
      id: true,
      parentId: true,
      slug: true,
      status: true,
      publishedAt: true,
      imageId: true,
      bannerId: true,
    },
  });
  if (!category) return { error: "That category no longer exists." };

  const parsed = categorySchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  if (await slugTaken(category.parentId, parsed.data.slug, category.id)) {
    return {
      fieldErrors: {
        slug: category.parentId
          ? "That parent already has a subcategory with this slug."
          : "A category already uses that slug.",
      },
    };
  }

  // Publishing is a separate permission from editing.
  if (parsed.data.status === "PUBLISHED" && category.status !== "PUBLISHED") {
    await requirePermission("CATEGORIES", "PUBLISH");
  }

  await prisma.category.update({
    where: { id: category.id },
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      shortDescription: parsed.data.shortDescription || null,
      description: parsed.data.description || null,
      procurementInfo: parsed.data.procurementInfo || null,
      imageId: parsed.data.imageId || null,
      bannerId: parsed.data.bannerId || null,
      featured: parsed.data.featured,
      status: parsed.data.status,
      // Re-publishing keeps the original date; unpublishing clears it, so the
      // column always means "published since".
      publishedAt:
        parsed.data.status === "PUBLISHED"
          ? (category.publishedAt ?? new Date())
          : null,
    },
  });

  await syncImageUsage(category.id, "image", parsed.data.imageId);
  await syncImageUsage(category.id, "banner", parsed.data.bannerId);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action:
      category.status !== parsed.data.status
        ? "CATEGORY_STATUS_CHANGED"
        : "CATEGORY_UPDATED",
    module: "CATEGORIES",
    entityType: "Category",
    entityId: category.id,
    summary: `${parsed.data.name} — ${parsed.data.status}`,
    metadata: { from: category.status, to: parsed.data.status },
  });

  revalidateCategories();
  return { success: "Category saved." };
}

export async function moveCategoryAction(formData: FormData): Promise<void> {
  await requirePermission("CATEGORIES", "EDIT");

  const parsed = moveCategorySchema.safeParse({
    categoryId: formData.get("categoryId"),
    direction: formData.get("direction"),
  });
  if (!parsed.success) return;

  const category = await prisma.category.findFirst({
    where: { id: parsed.data.categoryId, deletedAt: null },
    select: { id: true, parentId: true, order: true },
  });
  if (!category) return;

  const neighbour = await prisma.category.findFirst({
    where: {
      parentId: category.parentId,
      deletedAt: null,
      order:
        parsed.data.direction === "up"
          ? { lt: category.order }
          : { gt: category.order },
    },
    orderBy: { order: parsed.data.direction === "up" ? "desc" : "asc" },
    select: { id: true, order: true },
  });
  if (!neighbour) return;

  await prisma.$transaction([
    prisma.category.update({
      where: { id: category.id },
      data: { order: neighbour.order },
    }),
    prisma.category.update({
      where: { id: neighbour.id },
      data: { order: category.order },
    }),
  ]);

  revalidateCategories();
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("CATEGORIES", "DELETE");

  const parsed = categoryIdSchema.safeParse({
    categoryId: formData.get("categoryId"),
  });
  if (!parsed.success) redirect("/admin/categories");

  const category = await prisma.category.findFirst({
    where: { id: parsed.data.categoryId, deletedAt: null },
    select: {
      id: true,
      name: true,
      depth: true,
      _count: {
        select: {
          children: { where: { deletedAt: null } },
          products: { where: { deletedAt: null } },
        },
      },
    },
  });
  if (!category) redirect("/admin/categories");

  // Refused rather than cascaded: deleting a parent would silently take a whole
  // branch of the catalogue — and its URLs — with it.
  if (category._count.children > 0) {
    redirect(`/admin/categories/${category.id}?error=has-children`);
  }

  // A product sits in exactly one category, so deleting the category would
  // leave it with nowhere to live. The database refuses it too; this is the
  // message that explains why.
  if (category._count.products > 0) {
    redirect(`/admin/categories/${category.id}?error=has-products`);
  }

  await prisma.category.update({
    where: { id: category.id },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "CATEGORY_DELETED",
    module: "CATEGORIES",
    entityType: "Category",
    entityId: category.id,
    summary: `Deleted ${category.name}`,
  });

  revalidateCategories();
  redirect(category.depth === 0 ? "/admin/categories" : "/admin/subcategories");
}

export async function restoreCategoryAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("CATEGORIES", "EDIT");

  const parsed = categoryIdSchema.safeParse({
    categoryId: formData.get("categoryId"),
  });
  if (!parsed.success) return;

  const category = await prisma.category.findFirst({
    where: { id: parsed.data.categoryId, deletedAt: { not: null } },
    select: { id: true, name: true, parentId: true, slug: true },
  });
  if (!category) return;

  // While it was deleted the slug may have been reused, and restoring would
  // then violate the uniqueness the public routes depend on.
  const clash = await prisma.category.findFirst({
    where: {
      parentId: category.parentId,
      slug: category.slug,
      deletedAt: null,
      id: { not: category.id },
    },
    select: { id: true },
  });
  if (clash) {
    redirect("/admin/categories?error=slug-taken");
  }

  // Restored as a draft: whether it should be public again is a decision, not
  // an automatic consequence of undeleting it.
  await prisma.category.update({
    where: { id: category.id },
    data: { deletedAt: null, status: "DRAFT", publishedAt: null },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "CATEGORY_RESTORED",
    module: "CATEGORIES",
    entityType: "Category",
    entityId: category.id,
    summary: `Restored ${category.name} as a draft`,
  });

  revalidateCategories();
}
