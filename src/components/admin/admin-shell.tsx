import type { ReactNode } from "react";
import Link from "next/link";

import { getSiteSettings } from "@/server/settings/service";
import { currentPermissions } from "@/server/permissions";
import { AdminNavList, type VisibleNav } from "./admin-nav-list";
import { AdminTopBar } from "./admin-topbar";
import { ADMIN_NAV } from "./navigation";

/**
 * Two-column admin frame: a fixed dark sidebar on large screens, a drawer on
 * small ones. Navigation is filtered by permission here on the server — the
 * pages themselves re-check, so a hidden link is convenience, not the control.
 */
export async function AdminShell({ children }: { children: ReactNode }) {
  const [{ staff, can }, settings] = await Promise.all([
    currentPermissions(),
    getSiteSettings(),
  ]);

  const groups: VisibleNav = ADMIN_NAV.map((group) => ({
    label: group.label,
    items: group.items
      .filter((item) => can(item.module, "VIEW"))
      .map((item) => ({
        label: item.label,
        href: item.href,
        available: item.available,
      })),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="bg-surface-subtle min-h-dvh">
      <aside className="bg-navy-950 fixed inset-y-0 left-0 z-40 hidden w-64 flex-col overflow-y-auto lg:flex">
        <div className="border-navy-800 border-b px-5 py-5">
          <Link href="/admin" className="flex flex-col gap-0.5">
            <span className="text-h4 font-display leading-tight text-white">
              {settings.companyName}
            </span>
            <span className="text-caption text-navy-300">Administration</span>
          </Link>
        </div>

        <div className="flex-1 px-3">
          <AdminNavList groups={groups} />
        </div>

        <div className="border-navy-800 border-t px-5 py-4">
          <p className="text-caption text-navy-300 truncate">{staff.email}</p>
          <p className="text-caption text-navy-400">{staff.roleName}</p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <AdminTopBar
          groups={groups}
          companyName={settings.companyName}
          staffName={staff.name}
          staffEmail={staff.email}
          roleName={staff.roleName}
        />
        <main id="main">{children}</main>
      </div>
    </div>
  );
}
