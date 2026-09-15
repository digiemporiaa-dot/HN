"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import { fieldErrorsFrom } from "@/lib/validation/field-errors";
import { clearUsage, recordUsage } from "@/server/media/service";
import { productIdSchema, productSchema } from "@/lib/validation/products";

export type ProductActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

function revalidateProducts(): void {
  revalidatePath("/admin/products");
  revalidatePath("/admin/products/[id]", "page");
}

/**
 * Rewrites a product's media usage to match what it currently shows.
 *
 * Cleared first rather than merged, so an image dropped from the gallery stops
 * counting as in use the moment it is removed.
 */
async function syncMediaUsage(
  productId: string,
  primaryImageId: string,
  galleryIds: string[],
): Promise<void> {
  await clearUsage({
    entityType: "Product",
    entityId: productId,
    field: "primaryImage",
  });
  await clearUsage({
    entityType: "Product",
    entityId: productId,
    field: "gallery",
  });

  if (primaryImageId) {
    await recordUsage({
      assetId: primaryImageId,
      entityType: "Product",
      entityId: productId,
      field: "primaryImage",
    });
  }

  for (const assetId of galleryIds) {
    await recordUsage({
      assetId,
      entityType: "Product",
      entityId: productId,
      field: "gallery",
    });
  }
}

/**
 * Replaces a product's gallery and taxonomy links with the posted sets.
 *
 * Every id is checked against a live row rather than trusted: the form can be
 * stale, and a link to a deleted category or a missing asset would surface as
 * a broken product page rather than an error here.
 */
async function syncRelations(
  productId: string,
  data: {
    galleryIds: string[];
    specialtyIds: string[];
    solutionIds: string[];
  },
): Promise<string[]> {
  const [assets, specialties, solutions] = await Promise.all([
    prisma.mediaAsset.findMany({
      where: { id: { in: data.galleryIds }, deletedAt: null },
      select: { id: true },
    }),
    prisma.specialty.findMany({
      where: { id: { in: data.specialtyIds } },
      select: { id: true },
    }),
    prisma.solution.findMany({
      where: { id: { in: data.solutionIds } },
      select: { id: true },
    }),
  ]);

  const liveAssets = new Set(assets.map((asset) => asset.id));
  // Filtered by the posted order rather than the query's, so the gallery keeps
  // the sequence the editor arranged.
  const gallery = data.galleryIds.filter((id) => liveAssets.has(id));

  await prisma.$transaction([
    prisma.productImage.deleteMany({ where: { productId } }),
    prisma.productImage.createMany({
      data: gallery.map((mediaId, index) => ({
        productId,
        mediaId,
        order: index,
      })),
    }),
    prisma.productSpecialty.deleteMany({ where: { productId } }),
    prisma.productSpecialty.createMany({
      data: specialties.map((row) => ({ productId, specialtyId: row.id })),
    }),
    prisma.productSolution.deleteMany({ where: { productId } }),
    prisma.productSolution.createMany({
      data: solutions.map((row) => ({ productId, solutionId: row.id })),
    }),
  ]);

  return gallery;
}

function readForm(formData: FormData) {
  const json = (name: string): string[] => {
    try {
      const parsed = JSON.parse(String(formData.get(name) ?? "[]"));
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  };

  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    modelNumber: formData.get("modelNumber") ?? "",
    shortDescription: formData.get("shortDescription") ?? "",
    description: formData.get("description") ?? "",
    categoryId: formData.get("categoryId") ?? "",
    brandId: formData.get("brandId") ?? "",
    primaryImageId: formData.get("primaryImageId") ?? "",
    // The gallery is an ordered list, which form encoding cannot express, so
    // it is posted as JSON.
    galleryIds: json("galleryIds"),
    specialtyIds: formData.getAll("specialtyIds").map(String).filter(Boolean),
    solutionIds: formData.getAll("solutionIds").map(String).filter(Boolean),
    featured: formData.get("featured") === "on",
    status: formData.get("status") ?? "DRAFT",
  };
}

/** Confirms the chosen category and brand still exist before writing. */
async function resolveOwners(categoryId: string, brandId: string) {
  const [category, brand] = await Promise.all([
    prisma.category.findFirst({
      where: { id: categoryId, deletedAt: null },
      select: { id: true },
    }),
    brandId
      ? prisma.brand.findUnique({
          where: { id: brandId },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  return { category, brandId: brand?.id ?? null };
}

export async function createProductAction(
  _previous: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const actor = await requirePermission("PRODUCTS", "CREATE");

  const parsed = productSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const clash = await prisma.product.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true, deletedAt: true },
  });
  if (clash) {
    return {
      fieldErrors: {
        slug: clash.deletedAt
          ? "A deleted product still uses that slug. Restore it, or choose another."
          : "A product already uses that slug.",
      },
    };
  }

  const owners = await resolveOwners(
    parsed.data.categoryId,
    parsed.data.brandId,
  );
  if (!owners.category) {
    return { fieldErrors: { categoryId: "That category no longer exists." } };
  }

  if (parsed.data.status === "PUBLISHED") {
    await requirePermission("PRODUCTS", "PUBLISH");
  }

  const last = await prisma.product.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const product = await prisma.product.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      modelNumber: parsed.data.modelNumber || null,
      shortDescription: parsed.data.shortDescription || null,
      description: parsed.data.description || null,
      categoryId: owners.category.id,
      brandId: owners.brandId,
      primaryImageId: parsed.data.primaryImageId || null,
      featured: parsed.data.featured,
      order: (last?.order ?? -1) + 1,
      status: parsed.data.status,
      publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null,
    },
    select: { id: true, name: true },
  });

  const gallery = await syncRelations(product.id, parsed.data);
  await syncMediaUsage(product.id, parsed.data.primaryImageId, gallery);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "PRODUCT_CREATED",
    module: "PRODUCTS",
    entityType: "Product",
    entityId: product.id,
    summary: `Created product ${product.name}`,
  });

  revalidateProducts();
  redirect(`/admin/products/${product.id}`);
}

export async function updateProductAction(
  _previous: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const actor = await requirePermission("PRODUCTS", "EDIT");

  const productId = String(formData.get("productId") ?? "");
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true, status: true, publishedAt: true },
  });
  if (!product) return { error: "That product no longer exists." };

  const parsed = productSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const clash = await prisma.product.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true },
  });
  if (clash && clash.id !== product.id) {
    return { fieldErrors: { slug: "A product already uses that slug." } };
  }

  const owners = await resolveOwners(
    parsed.data.categoryId,
    parsed.data.brandId,
  );
  if (!owners.category) {
    return { fieldErrors: { categoryId: "That category no longer exists." } };
  }

  // Publishing is a separate permission from editing.
  if (parsed.data.status === "PUBLISHED" && product.status !== "PUBLISHED") {
    await requirePermission("PRODUCTS", "PUBLISH");
  }

  await prisma.product.update({
    where: { id: product.id },
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      modelNumber: parsed.data.modelNumber || null,
      shortDescription: parsed.data.shortDescription || null,
      description: parsed.data.description || null,
      categoryId: owners.category.id,
      brandId: owners.brandId,
      primaryImageId: parsed.data.primaryImageId || null,
      featured: parsed.data.featured,
      status: parsed.data.status,
      // Re-publishing keeps the original date; unpublishing clears it, so the
      // column always means "published since".
      publishedAt:
        parsed.data.status === "PUBLISHED"
          ? (product.publishedAt ?? new Date())
          : null,
    },
  });

  const gallery = await syncRelations(product.id, parsed.data);
  await syncMediaUsage(product.id, parsed.data.primaryImageId, gallery);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action:
      product.status !== parsed.data.status
        ? "PRODUCT_STATUS_CHANGED"
        : "PRODUCT_UPDATED",
    module: "PRODUCTS",
    entityType: "Product",
    entityId: product.id,
    summary: `${parsed.data.name} — ${parsed.data.status}`,
    metadata: {
      from: product.status,
      to: parsed.data.status,
      gallery: gallery.length,
    },
  });

  revalidateProducts();
  return { success: "Product saved." };
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("PRODUCTS", "DELETE");

  const parsed = productIdSchema.safeParse({
    productId: formData.get("productId"),
  });
  if (!parsed.success) redirect("/admin/products");

  const product = await prisma.product.findFirst({
    where: { id: parsed.data.productId, deletedAt: null },
    select: { id: true, name: true, slug: true },
  });
  if (!product) redirect("/admin/products");

  // Soft deleted, and archived so nothing treats it as publishable while it
  // sits in the bin.
  await prisma.product.update({
    where: { id: product.id },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "PRODUCT_DELETED",
    module: "PRODUCTS",
    entityType: "Product",
    entityId: product.id,
    summary: `Deleted ${product.name} (/${product.slug})`,
  });

  revalidateProducts();
  redirect("/admin/products");
}

export async function restoreProductAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("PRODUCTS", "EDIT");

  const parsed = productIdSchema.safeParse({
    productId: formData.get("productId"),
  });
  if (!parsed.success) return;

  const product = await prisma.product.findFirst({
    where: { id: parsed.data.productId, deletedAt: { not: null } },
    select: { id: true, name: true, categoryId: true },
  });
  if (!product) return;

  // Its category may have been deleted while the product sat in the bin, and
  // restoring it into nothing would produce a product with no page.
  const category = await prisma.category.findFirst({
    where: { id: product.categoryId, deletedAt: null },
    select: { id: true },
  });
  if (!category) redirect("/admin/products?error=category-gone");

  // Restored as a draft: whether it should be public again is a decision, not
  // an automatic consequence of undeleting it.
  await prisma.product.update({
    where: { id: product.id },
    data: { deletedAt: null, status: "DRAFT", publishedAt: null },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "PRODUCT_RESTORED",
    module: "PRODUCTS",
    entityType: "Product",
    entityId: product.id,
    summary: `Restored ${product.name} as a draft`,
  });

  revalidateProducts();
}
