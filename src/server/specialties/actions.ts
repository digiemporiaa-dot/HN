"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import { fieldErrorsFrom } from "@/lib/validation/field-errors";
import { clearUsage, recordUsage } from "@/server/media/service";
import {
  specialtyIdSchema,
  specialtySchema,
} from "@/lib/validation/specialties";

export type SpecialtyActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

/** The dynamic admin route is invalidated by its pattern; a literal path is a
 *  no-op for a dynamic segment in Next 15. */
function revalidateSpecialties(): void {
  revalidatePath("/admin/specialties");
  revalidatePath("/admin/specialties/[id]", "page");
}

async function syncImageUsage(
  specialtyId: string,
  field: "image" | "banner",
  assetId: string,
): Promise<void> {
  await clearUsage({ entityType: "Specialty", entityId: specialtyId, field });
  if (!assetId) return;
  await recordUsage({
    assetId,
    entityType: "Specialty",
    entityId: specialtyId,
    field,
  });
}

/**
 * Replaces a specialty's category links with the posted set.
 *
 * The ids are checked against live categories rather than trusted, so a stale
 * form cannot create a link to a deleted category.
 */
async function syncCategories(
  specialtyId: string,
  categoryIds: string[],
): Promise<void> {
  const valid = await prisma.category.findMany({
    where: { id: { in: categoryIds }, deletedAt: null },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.categorySpecialty.deleteMany({ where: { specialtyId } }),
    prisma.categorySpecialty.createMany({
      data: valid.map((category) => ({ specialtyId, categoryId: category.id })),
    }),
  ]);
}

function readForm(formData: FormData) {
  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    shortDescription: formData.get("shortDescription") ?? "",
    description: formData.get("description") ?? "",
    imageId: formData.get("imageId") ?? "",
    bannerId: formData.get("bannerId") ?? "",
    featured: formData.get("featured") === "on",
    status: formData.get("status") ?? "DRAFT",
    categoryIds: formData.getAll("categoryIds").map(String).filter(Boolean),
  };
}

export async function createSpecialtyAction(
  _previous: SpecialtyActionState,
  formData: FormData,
): Promise<SpecialtyActionState> {
  const actor = await requirePermission("SPECIALTIES", "CREATE");

  const parsed = specialtySchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const clash = await prisma.specialty.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true },
  });
  if (clash) {
    return { fieldErrors: { slug: "A specialty already uses that slug." } };
  }

  if (parsed.data.status === "PUBLISHED") {
    await requirePermission("SPECIALTIES", "PUBLISH");
  }

  const last = await prisma.specialty.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const specialty = await prisma.specialty.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      shortDescription: parsed.data.shortDescription || null,
      description: parsed.data.description || null,
      imageId: parsed.data.imageId || null,
      bannerId: parsed.data.bannerId || null,
      featured: parsed.data.featured,
      order: (last?.order ?? -1) + 1,
      status: parsed.data.status,
      publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null,
    },
    select: { id: true, name: true },
  });

  await syncCategories(specialty.id, parsed.data.categoryIds);
  await syncImageUsage(specialty.id, "image", parsed.data.imageId);
  await syncImageUsage(specialty.id, "banner", parsed.data.bannerId);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "SPECIALTY_CREATED",
    module: "SPECIALTIES",
    entityType: "Specialty",
    entityId: specialty.id,
    summary: `Created specialty ${specialty.name}`,
  });

  revalidateSpecialties();
  redirect(`/admin/specialties/${specialty.id}`);
}

export async function updateSpecialtyAction(
  _previous: SpecialtyActionState,
  formData: FormData,
): Promise<SpecialtyActionState> {
  const actor = await requirePermission("SPECIALTIES", "EDIT");

  const specialtyId = String(formData.get("specialtyId") ?? "");
  const specialty = await prisma.specialty.findUnique({
    where: { id: specialtyId },
    select: { id: true, slug: true, status: true, publishedAt: true },
  });
  if (!specialty) return { error: "That specialty no longer exists." };

  const parsed = specialtySchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const clash = await prisma.specialty.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true },
  });
  if (clash && clash.id !== specialty.id) {
    return { fieldErrors: { slug: "A specialty already uses that slug." } };
  }

  // Publishing is a separate permission from editing.
  if (parsed.data.status === "PUBLISHED" && specialty.status !== "PUBLISHED") {
    await requirePermission("SPECIALTIES", "PUBLISH");
  }

  await prisma.specialty.update({
    where: { id: specialty.id },
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      shortDescription: parsed.data.shortDescription || null,
      description: parsed.data.description || null,
      imageId: parsed.data.imageId || null,
      bannerId: parsed.data.bannerId || null,
      featured: parsed.data.featured,
      status: parsed.data.status,
      // Re-publishing keeps the original date; unpublishing clears it, so the
      // column always means "published since".
      publishedAt:
        parsed.data.status === "PUBLISHED"
          ? (specialty.publishedAt ?? new Date())
          : null,
    },
  });

  await syncCategories(specialty.id, parsed.data.categoryIds);
  await syncImageUsage(specialty.id, "image", parsed.data.imageId);
  await syncImageUsage(specialty.id, "banner", parsed.data.bannerId);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action:
      specialty.status !== parsed.data.status
        ? "SPECIALTY_STATUS_CHANGED"
        : "SPECIALTY_UPDATED",
    module: "SPECIALTIES",
    entityType: "Specialty",
    entityId: specialty.id,
    summary: `${parsed.data.name} — ${parsed.data.status}`,
    metadata: {
      from: specialty.status,
      to: parsed.data.status,
      categories: parsed.data.categoryIds.length,
    },
  });

  revalidateSpecialties();
  return { success: "Specialty saved." };
}

export async function deleteSpecialtyAction(
  formData: FormData,
): Promise<void> {
  const actor = await requirePermission("SPECIALTIES", "DELETE");

  const parsed = specialtyIdSchema.safeParse({
    specialtyId: formData.get("specialtyId"),
  });
  if (!parsed.success) redirect("/admin/specialties");

  const specialty = await prisma.specialty.findUnique({
    where: { id: parsed.data.specialtyId },
    select: { id: true, name: true, slug: true },
  });
  if (!specialty) redirect("/admin/specialties");

  // Category links cascade in the database; the media usage rows are
  // polymorphic and have no foreign key, so they are cleared explicitly.
  await prisma.specialty.delete({ where: { id: specialty.id } });
  for (const field of ["image", "banner"] as const) {
    await clearUsage({
      entityType: "Specialty",
      entityId: specialty.id,
      field,
    });
  }

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "SPECIALTY_DELETED",
    module: "SPECIALTIES",
    entityType: "Specialty",
    entityId: specialty.id,
    summary: `Deleted specialty ${specialty.name} (/${specialty.slug})`,
  });

  revalidateSpecialties();
  redirect("/admin/specialties");
}
