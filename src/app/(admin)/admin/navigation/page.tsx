import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/server/permissions";
import { ensureSystemMenus, listMenus } from "@/server/navigation/service";

export const metadata: Metadata = {
  title: "Navigation",
  robots: { index: false, follow: false },
};

export default async function NavigationMenusPage() {
  await requirePermission("NAVIGATION", "VIEW");

  // Seeded on first view rather than by migration, so a restored database or a
  // fresh environment reaches a working header without a manual step.
  await ensureSystemMenus();
  const menus = await listMenus();

  return (
    <AdminPage width="narrow">
      <AdminPageHeader
        title="Navigation"
        description="The menus that appear on every page of the public site. Changes go live as soon as they are saved."
      />

      <ul className="flex flex-col gap-3">
        {menus.map((menu) => (
          <li key={menu.id}>
            <Card>
              <CardContent className="p-0">
                <Link
                  href={`/admin/navigation/${menu.key}`}
                  className="hover:bg-surface-subtle flex items-center justify-between gap-4 rounded-lg p-5 transition-colors"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-body text-ink font-medium">
                      {menu.name}
                    </span>
                    <span className="text-caption text-ink-muted max-w-[68ch]">
                      {menu.description}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-caption text-ink-subtle">
                      {menu._count.items}{" "}
                      {menu._count.items === 1 ? "item" : "items"}
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="text-ink-subtle size-4"
                    />
                  </div>
                </Link>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </AdminPage>
  );
}
