"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import { invalidateMissingCache } from "./not-found-log";

/** Dismisses or restores one logged address. */
export async function setNotFoundIgnoredAction(
  formData: FormData,
): Promise<void> {
  await requirePermission("SEO", "EDIT");
  const id = String(formData.get("id") ?? "");
  const ignored = formData.get("ignored") === "true";
  await prisma.notFoundHit.updateMany({ where: { id }, data: { ignored } });
  revalidatePath("/admin/seo/not-found");
}

/** Empties the dismissed addresses, so the log only holds what is open. */
export async function clearIgnoredNotFoundAction(): Promise<void> {
  const actor = await requirePermission("SEO", "EDIT");
  const removed = await prisma.notFoundHit.deleteMany({
    where: { ignored: true },
  });
  invalidateMissingCache();
  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "NOT_FOUND_LOG_CLEARED",
    module: "SEO",
    entityType: "NotFoundHit",
    summary: `Cleared ${removed.count} dismissed not-found addresses`,
    metadata: { removed: removed.count },
  });
  revalidatePath("/admin/seo/not-found");
}
