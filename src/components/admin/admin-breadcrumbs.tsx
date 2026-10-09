"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { locateRoute, type VisibleNav } from "./navigation";

/** Admin › group › section › screen, derived from the menu itself. */
export function AdminBreadcrumbs({ groups }: { groups: VisibleNav }) {
  const pathname = usePathname() ?? "/admin";
  const { group, item, leaf } = locateRoute(pathname, groups);

  const crumbs: Array<{ label: string; href?: string; wide?: boolean }> = [{ label: "Admin", href: "/admin" }];
  // The group is context, not a destination: dropped first when space is short.
  if (group) crumbs.push({ label: group, wide: true });
  if (item && item.href !== "/admin") crumbs.push({ label: item.label, href: leaf ? item.href : undefined });
  else if (item) crumbs[0] = { label: "Dashboard" };
  if (leaf) crumbs.push({ label: leaf });

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="text-ink-muted flex min-w-0 items-center gap-1.5 text-[0.75rem]">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li
              key={`${crumb.label}-${index}`}
              className={cn("flex items-center gap-1.5", last ? "min-w-0" : "shrink-0", crumb.wide && "hidden 2xl:flex")}
            >
              {index > 0 ? <ChevronRight aria-hidden="true" className="size-3 shrink-0 opacity-60" /> : null}
              {crumb.href && !last ? (
                <Link href={crumb.href} className="hover:text-ink truncate transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "text-ink truncate font-medium" : "truncate"}>
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
