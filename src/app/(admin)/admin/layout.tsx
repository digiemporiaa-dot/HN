import { redirect } from "next/navigation";

import { requireStaff } from "@/server/auth/guards";

/**
 * Server-side gate for the entire admin area. Middleware performs a cheap
 * cookie check before this, but this is the decision that counts: it re-reads
 * the account, so a deactivated or force-logged-out staff member is stopped
 * even while holding a structurally valid token.
 *
 * Phase 6 replaces the presentation here with the full admin shell.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const staff = await requireStaff();

  if (staff.mustChangePassword) redirect("/change-password");

  return (
    <div className="bg-surface-subtle min-h-dvh">
      <main id="main">{children}</main>
    </div>
  );
}
