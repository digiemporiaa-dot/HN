import type { ReactNode } from "react";

import { getSiteSettings } from "@/server/settings/service";
import { navigationPermissions } from "@/server/permissions";
import { ADMIN_NAV, QUICK_CREATE, type VisibleNav } from "./navigation";
import { AdminFrame } from "./admin-frame";

/**
 * The admin chrome around every screen.
 *
 * The menu and the Create list are filtered here, on the server, from the
 * staff member's effective permissions. That only decides what is offered:
 * every page and server action checks its own permission again, so a link
 * that is not shown is never the thing keeping anyone out.
 */
export async function AdminShell({ children }: { children: ReactNode }) {
  const [settings, { staff, can }] = await Promise.all([getSiteSettings(), navigationPermissions()]);

  const groups: VisibleNav = ADMIN_NAV.map((group) => ({
    label: group.label,
    items: group.items
      .filter((item) => can(item.module, "VIEW"))
      .map((item) => ({ label: item.label, href: item.href, available: item.available })),
  })).filter((group) => group.items.length > 0);

  const createOptions = QUICK_CREATE.filter((option) => can(option.module, "CREATE")).map((option) => ({
    label: option.label,
    href: option.href,
  }));

  return (
    <AdminFrame
      groups={groups}
      createOptions={createOptions}
      companyName={settings.companyName}
      staffName={staff.name}
      staffEmail={staff.email}
      roleName={staff.roleName}
    >
      {children}
    </AdminFrame>
  );
}
