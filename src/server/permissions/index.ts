import { cache } from "react";
import { redirect } from "next/navigation";

import type {
  PermissionAction,
  PermissionModule,
} from "@/generated/prisma/enums";
import { prisma } from "@/server/db";
import {
  getCurrentStaff,
  requireStaff,
  type CurrentStaff,
} from "@/server/auth/guards";
import { isTwoFactorEnabled } from "@/server/auth/two-factor";
import { getSetting } from "@/server/settings/service";
import { permissionKey, SUPER_ADMIN_ROLE_KEY } from "./catalogue";

export { permissionKey } from "./catalogue";

/**
 * Effective permissions are the role's grants, plus per-staff GRANT overrides,
 * minus per-staff REVOKE overrides. A REVOKE always wins, so an override can
 * take something away from a role without rewriting the role.
 *
 * Cached per request: a page that renders twenty permission-gated controls
 * costs one query, not twenty.
 */
export const getEffectivePermissions = cache(
  async (staffId: string): Promise<ReadonlySet<string>> => {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: {
        role: {
          select: {
            key: true,
            permissions: {
              select: {
                permission: { select: { module: true, action: true } },
              },
            },
          },
        },
        permissionOverrides: {
          select: {
            effect: true,
            permission: { select: { module: true, action: true } },
          },
        },
      },
    });

    if (!staff) return new Set<string>();

    // Super Admin authority must not depend on seeded rows being complete.
    if (staff.role.key === SUPER_ADMIN_ROLE_KEY) return ALL_PERMISSIONS;

    const effective = new Set<string>();

    for (const entry of staff.role.permissions) {
      effective.add(
        permissionKey(entry.permission.module, entry.permission.action),
      );
    }

    for (const override of staff.permissionOverrides) {
      const key = permissionKey(
        override.permission.module,
        override.permission.action,
      );
      if (override.effect === "GRANT") effective.add(key);
      else effective.delete(key);
    }

    return effective;
  },
);

/** Sentinel meaning "every permission", used only for Super Admin. */
const ALL_PERMISSIONS: ReadonlySet<string> = new Set<string>(["*"]);

function grants(
  permissions: ReadonlySet<string>,
  module: PermissionModule,
  action: PermissionAction,
): boolean {
  if (permissions.has("*")) return true;
  return permissions.has(permissionKey(module, action));
}

/**
 * Permissions that make an account worth more to an attacker than the rest:
 * whoever holds one can create staff, change what staff may do, or walk away
 * with — or overwrite — the whole database.
 */
const PRIVILEGED = [
  permissionKey("STAFF", "CREATE"),
  permissionKey("STAFF", "EDIT"),
  permissionKey("ROLES", "EDIT"),
  permissionKey("SETTINGS", "MANAGE_SETTINGS"),
  permissionKey("BACKUPS", "EXPORT"),
  permissionKey("BACKUPS", "RESTORE"),
];

/**
 * Whether Settings → Security requires this staff member to use two-factor
 * authentication.
 */
async function twoFactorRequiredBy(
  permissions: ReadonlySet<string>,
): Promise<boolean> {
  const policy = (
    (await getSetting("security.twoFactor")) ?? "privileged"
  ).toLowerCase();
  if (policy === "off") return false;
  if (policy === "everyone") return true;
  return permissions.has("*") || PRIVILEGED.some((key) => permissions.has(key));
}

export async function isTwoFactorRequired(staffId: string): Promise<boolean> {
  return twoFactorRequiredBy(await getEffectivePermissions(staffId));
}

/**
 * Required but not yet set up: the admin is closed to them until it is. The
 * profile screen, where it is set up, checks the session only and so stays
 * reachable. Per request.
 */
const mustEnrolTwoFactor = cache(
  async (staffId: string, permissions: ReadonlySet<string>) =>
    (await twoFactorRequiredBy(permissions)) &&
    !(await isTwoFactorEnabled(staffId)),
);

async function enforceTwoFactor(
  staffId: string,
  permissions: ReadonlySet<string>,
): Promise<void> {
  if (await mustEnrolTwoFactor(staffId, permissions)) {
    redirect("/admin/profile?two-factor=required");
  }
}

export async function hasPermission(
  module: PermissionModule,
  action: PermissionAction,
): Promise<boolean> {
  const staff = await requireStaff();
  const permissions = await getEffectivePermissions(staff.id);
  await enforceTwoFactor(staff.id, permissions);
  return grants(permissions, module, action);
}

/**
 * Permission check for public routes, which must never redirect.
 *
 * requirePermission and hasPermission send a signed-out visitor to the login
 * screen. On a public URL that is a disclosure in itself: being bounced to
 * /login rather than a 404 confirms the page exists. This returns false for a
 * visitor who is not signed in, so an unpublished page is indistinguishable
 * from one that was never created.
 */
export async function visitorHasPermission(
  module: PermissionModule,
  action: PermissionAction,
): Promise<boolean> {
  const staff = await getCurrentStaff();
  if (!staff) return false;

  const permissions = await getEffectivePermissions(staff.id);
  return grants(permissions, module, action);
}

/**
 * The authorisation gate. Call at the top of every protected page, layout and
 * server action — hiding a navigation link is presentation, this is the control.
 *
 * Redirects rather than returning a boolean so that forgetting to check the
 * result cannot silently expose a screen or an action.
 */
export async function requirePermission(
  module: PermissionModule,
  action: PermissionAction,
): Promise<CurrentStaff> {
  const staff = await requireStaff();
  const permissions = await getEffectivePermissions(staff.id);
  await enforceTwoFactor(staff.id, permissions);

  if (!grants(permissions, module, action)) {
    redirect("/access-denied");
  }

  return staff;
}

/**
 * Permission set of the signed-in staff member, for deciding what to render.
 * Never a substitute for requirePermission on the server.
 */
export async function currentPermissions(): Promise<{
  staff: CurrentStaff;
  can: (module: PermissionModule, action: PermissionAction) => boolean;
}> {
  const staff = await requireStaff();
  const permissions = await getEffectivePermissions(staff.id);
  await enforceTwoFactor(staff.id, permissions);
  return {
    staff,
    can: (module, action) => grants(permissions, module, action),
  };
}

/**
 * Permissions for drawing the admin menu only. Unlike currentPermissions it
 * does not enforce the two-factor requirement: the frame around the profile
 * screen — where two-factor is set up — must still render.
 */
export async function navigationPermissions(): Promise<{
  staff: CurrentStaff;
  can: (module: PermissionModule, action: PermissionAction) => boolean;
}> {
  const staff = await requireStaff();
  const permissions = await getEffectivePermissions(staff.id);
  return {
    staff,
    can: (module, action) => grants(permissions, module, action),
  };
}
