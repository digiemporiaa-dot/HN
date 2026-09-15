"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import { fieldErrorsFrom } from "@/lib/validation/field-errors";
import {
  applicationIdSchema,
  applicationSchema,
} from "@/lib/validation/applications";

export type ApplicationActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

function revalidateApplications(): void {
  revalidatePath("/admin/applications");
  revalidatePath("/admin/applications/[id]", "page");
  revalidatePath("/admin/products/[id]", "page");
}

function readForm(formData: FormData) {
  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") ?? "",
  };
}

export async function createApplicationAction(
  _previous: ApplicationActionState,
  formData: FormData,
): Promise<ApplicationActionState> {
  const actor = await requirePermission("APPLICATIONS", "CREATE");

  const parsed = applicationSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const clash = await prisma.application.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true },
  });
  if (clash) {
    return { fieldErrors: { slug: "An application already uses that slug." } };
  }

  const last = await prisma.application.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const application = await prisma.application.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      order: (last?.order ?? -1) + 1,
    },
    select: { id: true, name: true },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "APPLICATION_CREATED",
    module: "APPLICATIONS",
    entityType: "Application",
    entityId: application.id,
    summary: `Created application ${application.name}`,
  });

  revalidateApplications();
  redirect(`/admin/applications/${application.id}`);
}

export async function updateApplicationAction(
  _previous: ApplicationActionState,
  formData: FormData,
): Promise<ApplicationActionState> {
  const actor = await requirePermission("APPLICATIONS", "EDIT");

  const applicationId = String(formData.get("applicationId") ?? "");
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true },
  });
  if (!application) return { error: "That application no longer exists." };

  const parsed = applicationSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const clash = await prisma.application.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true },
  });
  if (clash && clash.id !== application.id) {
    return { fieldErrors: { slug: "An application already uses that slug." } };
  }

  await prisma.application.update({
    where: { id: application.id },
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
    },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "APPLICATION_UPDATED",
    module: "APPLICATIONS",
    entityType: "Application",
    entityId: application.id,
    summary: `Updated application ${parsed.data.name}`,
  });

  revalidateApplications();
  return { success: "Application saved." };
}

export async function deleteApplicationAction(
  formData: FormData,
): Promise<void> {
  const actor = await requirePermission("APPLICATIONS", "DELETE");

  const parsed = applicationIdSchema.safeParse({
    applicationId: formData.get("applicationId"),
  });
  if (!parsed.success) redirect("/admin/applications");

  const application = await prisma.application.findUnique({
    where: { id: parsed.data.applicationId },
    select: { id: true, name: true, _count: { select: { products: true } } },
  });
  if (!application) redirect("/admin/applications");

  // Unlike a category, an application is a label: removing it takes the label
  // off the products carrying it and loses nothing else, so this is a hard
  // delete with the count shown first rather than a guard.
  await prisma.application.delete({ where: { id: application.id } });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "APPLICATION_DELETED",
    module: "APPLICATIONS",
    entityType: "Application",
    entityId: application.id,
    summary: `Deleted application ${application.name}`,
    metadata: { unlinkedProducts: application._count.products },
  });

  revalidateApplications();
  redirect("/admin/applications");
}
