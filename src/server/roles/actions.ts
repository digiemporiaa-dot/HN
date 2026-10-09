"use server";

import { revalidatePath } from "next/cache";

import type { PermissionAction, PermissionModule } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { getEffectivePermissions, requirePermission } from "@/server/permissions";
import { SUPER_ADMIN_ROLE_KEY } from "@/server/permissions/catalogue";
import { planRoleChange } from "@/server/permissions/changes";
import { rolePermissionsSchema } from "@/lib/validation/staff";

export type RoleActionState = {
  error?: string;
  success?: string;
  /** Set after a save, so the editor resets its baseline. */
  version?: string;
};

class StaleRoleError extends Error {}

/** Permission rows for these keys, creating any a database is missing. */
async function permissionIds(
  tx: Pick<typeof prisma, "permission">,
  keys: string[],
): Promise<string[]> {
  if (keys.length === 0) return [];
  const pairs = keys.map((key) => {
    const [module, action] = key.split(":") as [PermissionModule, PermissionAction];
    return { module, action };
  });
  await tx.permission.createMany({ data: pairs, skipDuplicates: true });
  const rows = await tx.permission.findMany({
    where: { OR: pairs },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

/**
 * Saves a role's permissions.
 *
 * Every submitted identifier is checked against the registry, the actor may
 * only change what they hold, the whole set is written in one transaction,
 * and a role edited by someone else since the form loaded is refused rather
 * than overwritten. Permissions are read from the database on every request,
 * so the change applies to everyone holding the role from their next page
 * load — no sign-out needed.
 */
export async function updateRolePermissionsAction(
  _previous: RoleActionState,
  formData: FormData,
): Promise<RoleActionState> {
  const actor = await requirePermission("ROLES", "EDIT");

  const parsed = rolePermissionsSchema.safeParse({
    roleId: formData.get("roleId"),
    version: formData.get("version"),
    permissions: formData.getAll("permissions").map(String),
  });
  if (!parsed.success) return { error: "Invalid request." };

  const role = await prisma.role.findUnique({
    where: { id: parsed.data.roleId },
    select: {
      id: true,
      key: true,
      name: true,
      updatedAt: true,
      permissions: { select: { permission: { select: { module: true, action: true } } } },
    },
  });
  if (!role) return { error: "That role no longer exists." };

  // Super Admin is the system's escape hatch; if its permissions could be
  // edited away, the platform could be locked out of its own administration.
  if (role.key === SUPER_ADMIN_ROLE_KEY) {
    return { error: "The Super Admin role cannot be modified." };
  }

  const isSuperAdmin = actor.roleKey === SUPER_ADMIN_ROLE_KEY;
  const plan = planRoleChange({
    current: role.permissions.map((entry) => entry.permission),
    submitted: parsed.data.permissions,
    actor: {
      isSuperAdmin,
      permissions: isSuperAdmin ? new Set(["*"]) : await getEffectivePermissions(actor.id),
    },
  });
  if (!plan.ok) return { error: plan.error };

  if (plan.added.length === 0 && plan.removed.length === 0 && plan.retired.length === 0) {
    return { success: "No changes to save.", version: role.updatedAt.toISOString() };
  }

  let version: string;
  try {
    version = await prisma.$transaction(async (tx) => {
      // Claims the version the editor loaded: a second editor's save, made
      // in between, makes this one fail instead of silently undoing it.
      const now = new Date();
      const claimed = await tx.role.updateMany({
        where: { id: role.id, updatedAt: new Date(parsed.data.version) },
        data: { updatedAt: now },
      });
      if (claimed.count !== 1) throw new StaleRoleError();

      const ids = await permissionIds(tx, plan.desired);
      await tx.rolePermission.deleteMany({
        where: { roleId: role.id, permissionId: { notIn: ids } },
      });
      await tx.rolePermission.createMany({
        data: ids.map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
      return now.toISOString();
    });
  } catch (error) {
    if (error instanceof StaleRoleError) {
      return { error: "Someone else saved this role while you were editing. Reload to see their changes, then try again." };
    }
    throw error;
  }

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "ROLE_PERMISSIONS_CHANGED",
    module: "ROLES",
    entityType: "Role",
    entityId: role.id,
    summary: `Permissions updated for ${role.name}: ${plan.added.length} granted, ${plan.removed.length} revoked`,
    metadata: {
      roleKey: role.key,
      granted: plan.added,
      revoked: plan.removed,
      retiredDropped: plan.retired,
      total: plan.desired.length,
    },
  });

  // The menu, Create list and every gated screen are rendered from these.
  revalidatePath("/admin", "layout");

  return {
    success: `Saved ${role.name}: ${plan.added.length} granted, ${plan.removed.length} revoked.`,
    version,
  };
}
