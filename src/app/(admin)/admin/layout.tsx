import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireStaff } from "@/server/auth/guards";

/**
 * Server-side gate for the entire admin area. Middleware performs a cheap
 * cookie check before this, but this is the decision that counts: it re-reads
 * the account, so a deactivated or force-logged-out staff member is stopped
 * even while holding a structurally valid token.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const staff = await requireStaff();

  if (staff.mustChangePassword) redirect("/change-password");

  return <AdminShell>{children}</AdminShell>;
}
