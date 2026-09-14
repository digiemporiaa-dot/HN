"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import {
  getEffectivePermissions,
  permissionKey,
  requirePermission,
} from "@/server/permissions";
import { SUPER_ADMIN_ROLE_KEY } from "@/server/permissions/catalogue";
import { rolePermissionsSchema } from "@/lib/validation/staff";

export type RoleActionState = {
  error?: string;
  success?: string;
};

export async function updateRolePermissionsAction(
  _previous: RoleActionState,
  formData: FormData,
): Promise<RoleActionState> {
  const actor = await requirePermission("ROLES", "EDIT");

  const parsed = rolePermissionsSchema.safeParse({
    roleId: formData.get("roleId"),
    permissions: formData.getAll("permissions").map(String),
  });
  if (!parsed.success) return { error: "Invalid request." };

  const role = await prisma.role.findUnique({
    where: { id: parsed.data.roleId },
    select: { id: true, key: true, name: true },
  });
  if (!role) return { error: "That role no longer exists." };

  // Super Admin is the system's escape hatch; if its permissions could be
  // edited away, the platform could be locked out of its own administration.
  if (role.key === SUPER_ADMIN_ROLE_KEY) {
    return { error: "The Super Admin role cannot be modified." };
  }

  if (actor.roleKey !== SUPER_ADMIN_ROLE_KEY) {
    const actorPermissions = await getEffectivePermissions(actor.id);
    const escalating = parsed.data.permissions.filter(
      (key) => !actorPermissions.has(key),
    );
    if (escalating.length > 0) {
      return {
        error:
          "You cannot grant a permission you do not hold yourself: " +
          escalating.slice(0, 3).join(", "),
      };
    }
  }

  const permissions = await prisma.permission.findMany({
    select: { id: true, module: true, action: true },
  });
  const idByKey = new Map(
    permissions.map((p) => [permissionKey(p.module, p.action), p.id]),
  );

  const desiredIds = parsed.data.permissions
    .map((key) => idByKey.get(key))
    .filter((id): id is string => Boolean(id));

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
    ...(desiredIds.length > 0
      ? [
          prisma.rolePermission.createMany({
            data: desiredIds.map((permissionId) => ({
              roleId: role.id,
              permissionId,
            })),
          }),
        ]
      : []),
  ]);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "ROLE_PERMISSIONS_CHANGED",
    module: "ROLES",
    entityType: "Role",
    entityId: role.id,
    summary: `Permissions updated for ${role.name}`,
    metadata: { roleKey: role.key, permissionCount: desiredIds.length },
  });

  revalidatePath("/admin/roles");
  revalidatePath(`/admin/roles/${role.id}`);

  return { success: `Saved ${desiredIds.length} permissions for ${role.name}.` };
}
