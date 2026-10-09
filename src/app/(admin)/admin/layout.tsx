import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireStaff } from "@/server/auth/guards";
import { ADMIN_THEME_SCRIPT } from "@/lib/admin/theme";
import "./admin-ui.css";

/**
 * Server-side gate for the entire admin area. Middleware performs a cheap
 * cookie check before this, but this is the decision that counts: it re-reads
 * the account, so a deactivated or force-logged-out staff member is stopped
 * even while holding a structurally valid token.
 *
 * The admin stylesheet is imported here and nowhere else, so the public site
 * never loads it.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const staff = await requireStaff();

  if (staff.mustChangePassword) redirect("/change-password");

  // The middleware's per-request nonce: the strict staff CSP refuses any
  // inline script without it.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <>
      {/* Before the first paint, so the chosen theme never flashes. */}
      <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: ADMIN_THEME_SCRIPT }} />
      <AdminShell>{children}</AdminShell>
    </>
  );
}
