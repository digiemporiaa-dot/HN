"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { ADMIN_NAV, isNavItemActive } from "./navigation";

export type VisibleNav = Array<{
  label: string;
  items: Array<{ label: string; href: string; available: boolean }>;
}>;

/**
 * Renders the permission-filtered navigation. The filtering happens on the
 * server; this component only decides what is currently active, which needs the
 * pathname.
 */
export function AdminNavList({
  groups,
  onNavigate,
}: {
  groups: VisibleNav;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const iconFor = (href: string) =>
    ADMIN_NAV.flatMap((group) => group.items).find(
      (item) => item.href === href,
    )?.icon;

  return (
    <nav aria-label="Admin sections" className="flex flex-col gap-6 py-4">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="text-overline text-navy-400 px-3 pb-1 uppercase">
            {group.label}
          </p>

          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const Icon = iconFor(item.href);
              const active = isNavItemActive(item.href, pathname);

              if (!item.available) {
                return (
                  <li key={item.href}>
                    <span
                      aria-disabled="true"
                      title="Not available yet"
                      className="text-navy-500 text-body-sm flex cursor-default items-center gap-3 rounded-md px-3 py-2"
                    >
                      {Icon ? (
                        <Icon aria-hidden="true" className="size-4 shrink-0" />
                      ) : null}
                      <span className="flex-1 truncate">{item.label}</span>
                      <Lock aria-hidden="true" className="size-3 shrink-0" />
                    </span>
                  </li>
                );
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "text-body-sm flex items-center gap-3 rounded-md px-3 py-2 transition-colors",
                      active
                        ? "bg-navy-800 font-medium text-white"
                        : "text-navy-200 hover:bg-navy-900 hover:text-white",
                    )}
                  >
                    {Icon ? (
                      <Icon aria-hidden="true" className="size-4 shrink-0" />
                    ) : null}
                    <span className="flex-1 truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
