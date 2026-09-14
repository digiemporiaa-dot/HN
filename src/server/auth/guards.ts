import { cache } from "react";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db";
import { auth } from "./index";

export type CurrentStaff = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  mustChangePassword: boolean;
  roleId: string;
  roleKey: string;
  roleName: string;
};

/**
 * Resolves the signed-in staff member from the database.
 *
 * The JWT is treated as a claim, never as the authority: the account is
 * re-read on every protected request so that deactivation and forced logout
 * take effect immediately rather than when the token happens to expire.
 * Cached per request so repeated calls in a layout and its actions cost one
 * query.
 */
export const getCurrentStaff = cache(async (): Promise<CurrentStaff | null> => {
  const session = await auth();
  const staffId = session?.user?.id;
  if (!staffId) return null;

  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      status: true,
      tokenVersion: true,
      mustChangePassword: true,
      roleId: true,
      role: { select: { key: true, name: true } },
    },
  });

  if (!staff) return null;
  if (staff.status !== "ACTIVE") return null;

  // Any password change, deactivation or role change increments tokenVersion,
  // which retires every token issued before it.
  if (staff.tokenVersion !== session.user.tokenVersion) return null;

  return {
    id: staff.id,
    email: staff.email,
    name: staff.name,
    phone: staff.phone,
    status: staff.status,
    mustChangePassword: staff.mustChangePassword,
    roleId: staff.roleId,
    roleKey: staff.role.key,
    roleName: staff.role.name,
  };
});

/**
 * Use at the top of every protected layout, page and server action. Redirects
 * rather than returning null so a forgotten null-check cannot expose a screen.
 */
export async function requireStaff(): Promise<CurrentStaff> {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/login?reason=session-expired");
  return staff;
}
