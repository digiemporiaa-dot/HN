"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import { fieldErrorsFrom } from "@/lib/validation/field-errors";
import { clearUsage, recordUsage } from "@/server/media/service";
import { brandIdSchema, brandSchema } from "@/lib/validation/brands";

export type BrandActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Invalidates the screens a brand change affects.
 *
 * The dynamic admin route is invalidated by its pattern; a literal path is a
 * no-op for a dynamic segment in Next 15.
 */
function revalidateBrands(): void {
  revalidatePath("/admin/brands");
  revalidatePath("/admin/brands/[id]", "page");
}

async function syncLogoUsage(
  brandId: string,
  field: "logo" | "banner",
  assetId: string,
): Promise<void> {
  await clearUsage({ entityType: "Brand", entityId: brandId, field });
  if (!assetId) return;
  await recordUsage({
    assetId,
    entityType: "Brand",
    entityId: brandId,
    field,
  });
}

/**
 * Replaces a brand's category links with the posted set.
 *
 * The ids are checked against live categories rather than trusted, so a stale
 * or hand-edited form cannot create a link to a deleted category.
 */
async function syncCategories(
  brandId: string,
  categoryIds: string[],
): Promise<void> {
  const valid = await prisma.category.findMany({
    where: { id: { in: categoryIds }, deletedAt: null },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.brandCategory.deleteMany({ where: { brandId } }),
    prisma.brandCategory.createMany({
      data: valid.map((category) => ({ brandId, categoryId: category.id })),
    }),
  ]);
}

function readForm(formData: FormData) {
  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    shortDescription: formData.get("shortDescription") ?? "",
    description: formData.get("description") ?? "",
    websiteUrl: formData.get("websiteUrl") ?? "",
    logoId: formData.get("logoId") ?? "",
    bannerId: formData.get("bannerId") ?? "",
    featured: formData.get("featured") === "on",
    status: formData.get("status") ?? "DRAFT",
    categoryIds: formData.getAll("categoryIds").map(String).filter(Boolean),
  };
}

export async function createBrandAction(
  _previous: BrandActionState,
  formData: FormData,
): Promise<BrandActionState> {
  const actor = await requirePermission("BRANDS", "CREATE");

  const parsed = brandSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const clash = await prisma.brand.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true },
  });
  if (clash) return { fieldErrors: { slug: "A brand already uses that slug." } };

  if (parsed.data.status === "PUBLISHED") {
    await requirePermission("BRANDS", "PUBLISH");
  }

  const last = await prisma.brand.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const brand = await prisma.brand.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      shortDescription: parsed.data.shortDescription || null,
      description: parsed.data.description || null,
      websiteUrl: parsed.data.websiteUrl || null,
      logoId: parsed.data.logoId || null,
      bannerId: parsed.data.bannerId || null,
      featured: parsed.data.featured,
      order: (last?.order ?? -1) + 1,
      status: parsed.data.status,
      publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null,
    },
    select: { id: true, name: true },
  });

  await syncCategories(brand.id, parsed.data.categoryIds);
  await syncLogoUsage(brand.id, "logo", parsed.data.logoId);
  await syncLogoUsage(brand.id, "banner", parsed.data.bannerId);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "BRAND_CREATED",
    module: "BRANDS",
    entityType: "Brand",
    entityId: brand.id,
    summary: `Created brand ${brand.name}`,
  });

  revalidateBrands();
  redirect(`/admin/brands/${brand.id}`);
}

export async function updateBrandAction(
  _previous: BrandActionState,
  formData: FormData,
): Promise<BrandActionState> {
  const actor = await requirePermission("BRANDS", "EDIT");

  const brandId = String(formData.get("brandId") ?? "");
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { id: true, slug: true, status: true, publishedAt: true },
  });
  if (!brand) return { error: "That brand no longer exists." };

  const parsed = brandSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const clash = await prisma.brand.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true },
  });
  if (clash && clash.id !== brand.id) {
    return { fieldErrors: { slug: "A brand already uses that slug." } };
  }

  // Publishing is a separate permission from editing.
  if (parsed.data.status === "PUBLISHED" && brand.status !== "PUBLISHED") {
    await requirePermission("BRANDS", "PUBLISH");
  }

  await prisma.brand.update({
    where: { id: brand.id },
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      shortDescription: parsed.data.shortDescription || null,
      description: parsed.data.description || null,
      websiteUrl: parsed.data.websiteUrl || null,
      logoId: parsed.data.logoId || null,
      bannerId: parsed.data.bannerId || null,
      featured: parsed.data.featured,
      status: parsed.data.status,
      // Re-publishing keeps the original date; unpublishing clears it, so the
      // column always means "published since".
      publishedAt:
        parsed.data.status === "PUBLISHED"
          ? (brand.publishedAt ?? new Date())
          : null,
    },
  });

  await syncCategories(brand.id, parsed.data.categoryIds);
  await syncLogoUsage(brand.id, "logo", parsed.data.logoId);
  await syncLogoUsage(brand.id, "banner", parsed.data.bannerId);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action:
      brand.status !== parsed.data.status
        ? "BRAND_STATUS_CHANGED"
        : "BRAND_UPDATED",
    module: "BRANDS",
    entityType: "Brand",
    entityId: brand.id,
    summary: `${parsed.data.name} — ${parsed.data.status}`,
    metadata: {
      from: brand.status,
      to: parsed.data.status,
      categories: parsed.data.categoryIds.length,
    },
  });

  revalidateBrands();
  return { success: "Brand saved." };
}

export async function deleteBrandAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("BRANDS", "DELETE");

  const parsed = brandIdSchema.safeParse({ brandId: formData.get("brandId") });
  if (!parsed.success) redirect("/admin/brands");

  const brand = await prisma.brand.findUnique({
    where: { id: parsed.data.brandId },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { products: { where: { deletedAt: null } } } },
    },
  });
  if (!brand) redirect("/admin/brands");

  // Refused rather than allowed to strip the manufacturer from every product
  // that names it. Which brand made a device is not incidental detail on a
  // medical catalogue.
  if (brand._count.products > 0) {
    redirect(`/admin/brands/${brand.id}?error=has-products`);
  }

  // Category links cascade in the database; the media usage rows do not, so
  // they are cleared explicitly or the library would keep counting the logo as
  // in use by a brand that no longer exists.
  await prisma.brand.delete({ where: { id: brand.id } });
  for (const field of ["logo", "banner"] as const) {
    await clearUsage({ entityType: "Brand", entityId: brand.id, field });
  }

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "BRAND_DELETED",
    module: "BRANDS",
    entityType: "Brand",
    entityId: brand.id,
    summary: `Deleted brand ${brand.name} (/${brand.slug})`,
  });

  revalidateBrands();
  redirect("/admin/brands");
}
