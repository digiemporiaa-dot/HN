"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { hashPassword } from "@/server/auth/password";
import {
  currentPermissions,
  getEffectivePermissions,
  permissionKey,
  requirePermission,
} from "@/server/permissions";
import { SUPER_ADMIN_ROLE_KEY } from "@/server/permissions/catalogue";
import type {
  PermissionAction,
  PermissionModule,
} from "@/generated/prisma/enums";
import {
  createStaffSchema,
  permissionOverrideSchema,
  staffIdSchema,
  staffStatusSchema,
  updateStaffSchema,
} from "@/lib/validation/staff";

export type StaffActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
  /** Shown once, never stored: the generated password for a new or reset account. */
  temporaryPassword?: string;
};

function generatePassword(): string {
  return randomBytes(18).toString("base64url");
}

function firstErrors(
  error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } },
): Record<string, string> {
  const flattened = error.flatten().fieldErrors;
  const result: Record<string, string> = {};
  for (const [field, messages] of Object.entries(flattened)) {
    if (messages?.[0]) result[field] = messages[0];
  }
  return result;
}

/**
 * Guards against privilege escalation through staff management.
 *
 * Only a Super Admin may act on a Super Admin account or hand out that role —
 * otherwise an Admin with STAFF.EDIT could promote themselves and bypass every
 * restriction their own role carries.
 */
async function assertCanManageTarget(params: {
  actorId: string;
  actorRoleKey: string;
  targetRoleKey?: string | null;
  nextRoleKey?: string | null;
}): Promise<string | null> {
  const actorIsSuperAdmin = params.actorRoleKey === SUPER_ADMIN_ROLE_KEY;
  if (actorIsSuperAdmin) return null;

  if (params.targetRoleKey === SUPER_ADMIN_ROLE_KEY) {
    return "Only a Super Admin can modify a Super Admin account.";
  }
  if (params.nextRoleKey === SUPER_ADMIN_ROLE_KEY) {
    return "Only a Super Admin can assign the Super Admin role.";
  }
  return null;
}

async function countActiveSuperAdmins(excludeStaffId?: string) {
  return prisma.staff.count({
    where: {
      status: "ACTIVE",
      role: { key: SUPER_ADMIN_ROLE_KEY },
      ...(excludeStaffId ? { id: { not: excludeStaffId } } : {}),
    },
  });
}

export async function createStaffAction(
  _previous: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const actor = await requirePermission("STAFF", "CREATE");

  const parsed = createStaffSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? undefined,
    roleId: formData.get("roleId"),
    password: formData.get("password") ?? undefined,
  });

  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };

  const role = await prisma.role.findUnique({
    where: { id: parsed.data.roleId },
    select: { id: true, key: true, name: true },
  });
  if (!role) return { fieldErrors: { roleId: "That role no longer exists." } };

  const blocked = await assertCanManageTarget({
    actorId: actor.id,
    actorRoleKey: actor.roleKey,
    nextRoleKey: role.key,
  });
  if (blocked) return { error: blocked };

  const existing = await prisma.staff.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (existing) {
    return { fieldErrors: { email: "An account already uses that email." } };
  }

  const suppliedPassword = parsed.data.password || undefined;
  const password = suppliedPassword ?? generatePassword();

  const staff = await prisma.staff.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      roleId: role.id,
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
    },
    select: { id: true, email: true },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "STAFF_CREATED",
    module: "STAFF",
    entityType: "Staff",
    entityId: staff.id,
    summary: `Created ${staff.email} as ${role.name}`,
    metadata: { email: staff.email, roleKey: role.key },
  });

  revalidatePath("/admin/staff");

  return {
    success: `Account created for ${staff.email}.`,
    temporaryPassword: suppliedPassword ? undefined : password,
  };
}

export async function updateStaffAction(
  _previous: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const actor = await requirePermission("STAFF", "EDIT");

  const parsed = updateStaffSchema.safeParse({
    staffId: formData.get("staffId"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? undefined,
    roleId: formData.get("roleId"),
  });

  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };

  const target = await prisma.staff.findUnique({
    where: { id: parsed.data.staffId },
    select: { id: true, email: true, roleId: true, role: { select: { key: true } } },
  });
  if (!target) return { error: "That account no longer exists." };

  const nextRole = await prisma.role.findUnique({
    where: { id: parsed.data.roleId },
    select: { id: true, key: true, name: true },
  });
  if (!nextRole) return { fieldErrors: { roleId: "That role no longer exists." } };

  const blocked = await assertCanManageTarget({
    actorId: actor.id,
    actorRoleKey: actor.roleKey,
    targetRoleKey: target.role.key,
    nextRoleKey: nextRole.key,
  });
  if (blocked) return { error: blocked };

  if (actor.id === target.id && nextRole.id !== target.roleId) {
    return { error: "You cannot change your own role." };
  }

  const roleChanged = nextRole.id !== target.roleId;
  if (
    roleChanged &&
    target.role.key === SUPER_ADMIN_ROLE_KEY &&
    (await countActiveSuperAdmins(target.id)) === 0
  ) {
    return { error: "This is the last active Super Admin and cannot be demoted." };
  }

  const emailOwner = await prisma.staff.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (emailOwner && emailOwner.id !== target.id) {
    return { fieldErrors: { email: "An account already uses that email." } };
  }

  await prisma.staff.update({
    where: { id: target.id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      roleId: nextRole.id,
    },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: roleChanged ? "STAFF_ROLE_CHANGED" : "STAFF_UPDATED",
    module: "STAFF",
    entityType: "Staff",
    entityId: target.id,
    summary: roleChanged
      ? `Role changed to ${nextRole.name} for ${parsed.data.email}`
      : `Updated ${parsed.data.email}`,
    metadata: {
      email: parsed.data.email,
      previousRoleKey: target.role.key,
      roleKey: nextRole.key,
    },
  });

  revalidatePath("/admin/staff");
  revalidatePath(`/admin/staff/${target.id}`);

  return { success: "Account updated." };
}

export async function setStaffStatusAction(
  _previous: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const actor = await requirePermission("STAFF", "EDIT");

  const parsed = staffStatusSchema.safeParse({
    staffId: formData.get("staffId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: "Invalid request." };

  const target = await prisma.staff.findUnique({
    where: { id: parsed.data.staffId },
    select: { id: true, email: true, status: true, role: { select: { key: true } } },
  });
  if (!target) return { error: "That account no longer exists." };

  if (actor.id === target.id) {
    return { error: "You cannot change your own account status." };
  }

  const blocked = await assertCanManageTarget({
    actorId: actor.id,
    actorRoleKey: actor.roleKey,
    targetRoleKey: target.role.key,
  });
  if (blocked) return { error: blocked };

  if (
    parsed.data.status !== "ACTIVE" &&
    target.role.key === SUPER_ADMIN_ROLE_KEY &&
    (await countActiveSuperAdmins(target.id)) === 0
  ) {
    return {
      error: "This is the last active Super Admin and cannot be deactivated.",
    };
  }

  await prisma.staff.update({
    where: { id: target.id },
    data: {
      status: parsed.data.status,
      // Deactivating must drop existing sessions immediately, not at expiry.
      ...(parsed.data.status !== "ACTIVE"
        ? { tokenVersion: { increment: 1 } }
        : {}),
    },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "STAFF_STATUS_CHANGED",
    module: "STAFF",
    entityType: "Staff",
    entityId: target.id,
    summary: `${target.email}: ${target.status} to ${parsed.data.status}`,
    metadata: { from: target.status, to: parsed.data.status },
  });

  revalidatePath("/admin/staff");
  revalidatePath(`/admin/staff/${target.id}`);

  return { success: `Account is now ${parsed.data.status.toLowerCase()}.` };
}

export async function resetStaffPasswordAction(
  _previous: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const actor = await requirePermission("STAFF", "EDIT");

  const parsed = staffIdSchema.safeParse({ staffId: formData.get("staffId") });
  if (!parsed.success) return { error: "Invalid request." };

  const target = await prisma.staff.findUnique({
    where: { id: parsed.data.staffId },
    select: { id: true, email: true, role: { select: { key: true } } },
  });
  if (!target) return { error: "That account no longer exists." };

  const blocked = await assertCanManageTarget({
    actorId: actor.id,
    actorRoleKey: actor.roleKey,
    targetRoleKey: target.role.key,
  });
  if (blocked) return { error: blocked };

  const password = generatePassword();

  await prisma.staff.update({
    where: { id: target.id },
    data: {
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
      tokenVersion: { increment: 1 },
    },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "STAFF_PASSWORD_RESET",
    module: "STAFF",
    entityType: "Staff",
    entityId: target.id,
    summary: `Password reset for ${target.email}`,
  });

  revalidatePath(`/admin/staff/${target.id}`);

  return {
    success: `Password reset for ${target.email}. They must change it at next sign-in.`,
    temporaryPassword: password,
  };
}

export async function updateStaffOverridesAction(
  _previous: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const actor = await requirePermission("STAFF", "EDIT");

  const parsed = permissionOverrideSchema.safeParse({
    staffId: formData.get("staffId"),
    granted: formData.getAll("granted").map(String),
    revoked: formData.getAll("revoked").map(String),
  });
  if (!parsed.success) return { error: "Invalid request." };

  const target = await prisma.staff.findUnique({
    where: { id: parsed.data.staffId },
    select: { id: true, email: true, role: { select: { key: true } } },
  });
  if (!target) return { error: "That account no longer exists." };

  const blocked = await assertCanManageTarget({
    actorId: actor.id,
    actorRoleKey: actor.roleKey,
    targetRoleKey: target.role.key,
  });
  if (blocked) return { error: blocked };

  // Nobody may hand out authority they do not themselves hold.
  if (actor.roleKey !== SUPER_ADMIN_ROLE_KEY) {
    const actorPermissions = await getEffectivePermissions(actor.id);
    const escalating = parsed.data.granted.filter(
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

  const rows = [
    ...parsed.data.granted.map((key) => ({ key, effect: "GRANT" as const })),
    ...parsed.data.revoked.map((key) => ({ key, effect: "REVOKE" as const })),
  ]
    .map(({ key, effect }) => {
      const permissionId = idByKey.get(key);
      return permissionId
        ? { staffId: target.id, permissionId, effect }
        : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  await prisma.$transaction([
    prisma.staffPermissionOverride.deleteMany({ where: { staffId: target.id } }),
    ...(rows.length > 0
      ? [prisma.staffPermissionOverride.createMany({ data: rows })]
      : []),
  ]);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "STAFF_PERMISSIONS_CHANGED",
    module: "STAFF",
    entityType: "Staff",
    entityId: target.id,
    summary: `Permission overrides updated for ${target.email}`,
    metadata: {
      granted: parsed.data.granted,
      revoked: parsed.data.revoked,
    },
  });

  revalidatePath(`/admin/staff/${target.id}`);

  return { success: "Permission overrides saved." };
}

export async function deleteStaffAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("STAFF", "DELETE");

  const parsed = staffIdSchema.safeParse({ staffId: formData.get("staffId") });
  if (!parsed.success) redirect("/admin/staff");

  const target = await prisma.staff.findUnique({
    where: { id: parsed.data.staffId },
    select: { id: true, email: true, role: { select: { key: true } } },
  });
  if (!target) redirect("/admin/staff");

  if (actor.id === target.id) redirect(`/admin/staff/${target.id}?error=self`);

  const blocked = await assertCanManageTarget({
    actorId: actor.id,
    actorRoleKey: actor.roleKey,
    targetRoleKey: target.role.key,
  });
  if (blocked) redirect(`/admin/staff/${target.id}?error=forbidden`);

  if (
    target.role.key === SUPER_ADMIN_ROLE_KEY &&
    (await countActiveSuperAdmins(target.id)) === 0
  ) {
    redirect(`/admin/staff/${target.id}?error=last-super-admin`);
  }

  await prisma.staff.delete({ where: { id: target.id } });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "STAFF_DELETED",
    module: "STAFF",
    entityType: "Staff",
    entityId: target.id,
    summary: `Deleted ${target.email}`,
    metadata: { email: target.email },
  });

  revalidatePath("/admin/staff");
  redirect("/admin/staff");
}

/** Convenience for pages that need to render permission-gated controls. */
export async function canCurrentStaff(
  module: PermissionModule,
  action: PermissionAction,
): Promise<boolean> {
  const { can } = await currentPermissions();
  return can(module, action);
}
