"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import { fieldErrorsFrom } from "@/lib/validation/field-errors";
import { clearUsage, recordUsage } from "@/server/media/service";
import {
  solutionIdSchema,
  solutionSchema,
} from "@/lib/validation/solutions";

export type SolutionActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

/** The dynamic admin route is invalidated by its pattern; a literal path is a
 *  no-op for a dynamic segment in Next 15. */
function revalidateSolutions(): void {
  revalidatePath("/admin/solutions");
  revalidatePath("/admin/solutions/[id]", "page");
}

async function syncImageUsage(
  solutionId: string,
  field: "image" | "banner",
  assetId: string,
): Promise<void> {
  await clearUsage({ entityType: "Solution", entityId: solutionId, field });
  if (!assetId) return;
  await recordUsage({
    assetId,
    entityType: "Solution",
    entityId: solutionId,
    field,
  });
}

/**
 * Replaces a solution's category links with the posted set.
 *
 * The ids are checked against live categories rather than trusted, so a stale
 * form cannot create a link to a deleted category.
 */
async function syncCategories(
  solutionId: string,
  categoryIds: string[],
): Promise<void> {
  const valid = await prisma.category.findMany({
    where: { id: { in: categoryIds }, deletedAt: null },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.solutionCategory.deleteMany({ where: { solutionId } }),
    prisma.solutionCategory.createMany({
      data: valid.map((category) => ({ solutionId, categoryId: category.id })),
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

export async function createSolutionAction(
  _previous: SolutionActionState,
  formData: FormData,
): Promise<SolutionActionState> {
  const actor = await requirePermission("SOLUTIONS", "CREATE");

  const parsed = solutionSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const clash = await prisma.solution.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true },
  });
  if (clash) {
    return { fieldErrors: { slug: "A solution already uses that slug." } };
  }

  if (parsed.data.status === "PUBLISHED") {
    await requirePermission("SOLUTIONS", "PUBLISH");
  }

  const last = await prisma.solution.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const solution = await prisma.solution.create({
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

  await syncCategories(solution.id, parsed.data.categoryIds);
  await syncImageUsage(solution.id, "image", parsed.data.imageId);
  await syncImageUsage(solution.id, "banner", parsed.data.bannerId);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "SOLUTION_CREATED",
    module: "SOLUTIONS",
    entityType: "Solution",
    entityId: solution.id,
    summary: `Created solution ${solution.name}`,
  });

  revalidateSolutions();
  redirect(`/admin/solutions/${solution.id}`);
}

export async function updateSolutionAction(
  _previous: SolutionActionState,
  formData: FormData,
): Promise<SolutionActionState> {
  const actor = await requirePermission("SOLUTIONS", "EDIT");

  const solutionId = String(formData.get("solutionId") ?? "");
  const solution = await prisma.solution.findUnique({
    where: { id: solutionId },
    select: { id: true, slug: true, status: true, publishedAt: true },
  });
  if (!solution) return { error: "That solution no longer exists." };

  const parsed = solutionSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const clash = await prisma.solution.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true },
  });
  if (clash && clash.id !== solution.id) {
    return { fieldErrors: { slug: "A solution already uses that slug." } };
  }

  // Publishing is a separate permission from editing.
  if (parsed.data.status === "PUBLISHED" && solution.status !== "PUBLISHED") {
    await requirePermission("SOLUTIONS", "PUBLISH");
  }

  await prisma.solution.update({
    where: { id: solution.id },
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
          ? (solution.publishedAt ?? new Date())
          : null,
    },
  });

  await syncCategories(solution.id, parsed.data.categoryIds);
  await syncImageUsage(solution.id, "image", parsed.data.imageId);
  await syncImageUsage(solution.id, "banner", parsed.data.bannerId);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action:
      solution.status !== parsed.data.status
        ? "SOLUTION_STATUS_CHANGED"
        : "SOLUTION_UPDATED",
    module: "SOLUTIONS",
    entityType: "Solution",
    entityId: solution.id,
    summary: `${parsed.data.name} — ${parsed.data.status}`,
    metadata: {
      from: solution.status,
      to: parsed.data.status,
      categories: parsed.data.categoryIds.length,
    },
  });

  revalidateSolutions();
  return { success: "Solution saved." };
}

export async function deleteSolutionAction(
  formData: FormData,
): Promise<void> {
  const actor = await requirePermission("SOLUTIONS", "DELETE");

  const parsed = solutionIdSchema.safeParse({
    solutionId: formData.get("solutionId"),
  });
  if (!parsed.success) redirect("/admin/solutions");

  const solution = await prisma.solution.findUnique({
    where: { id: parsed.data.solutionId },
    select: { id: true, name: true, slug: true },
  });
  if (!solution) redirect("/admin/solutions");

  // Category links cascade in the database; the media usage rows are
  // polymorphic and have no foreign key, so they are cleared explicitly.
  await prisma.solution.delete({ where: { id: solution.id } });
  for (const field of ["image", "banner"] as const) {
    await clearUsage({
      entityType: "Solution",
      entityId: solution.id,
      field,
    });
  }

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "SOLUTION_DELETED",
    module: "SOLUTIONS",
    entityType: "Solution",
    entityId: solution.id,
    summary: `Deleted solution ${solution.name} (/${solution.slug})`,
  });

  revalidateSolutions();
  redirect("/admin/solutions");
}
