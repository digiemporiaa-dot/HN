import { Building2, type LucideIcon } from "lucide-react";

import type { PermissionModule } from "@/generated/prisma/enums";
import { MODULES, NAV_ENTRIES, resourceByKey } from "@/lib/permissions/registry";

/**
 * The admin menu, built from the permission registry
 * (src/lib/permissions/registry.ts) so a route, its menu entry, its
 * breadcrumb and its Create shortcut cannot drift apart.
 *
 * Visibility only decides what is offered. Every page and action checks its
 * own permission on the server; a hidden link is never the access control.
 */
export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** VIEW on this module guards the entry's page. */
  module: PermissionModule;
  /** VIEW on any of these shows the entry (usually just `module`). */
  visibleWith: PermissionModule[];
  /** Kept for screens not built yet: rendered inert, never as a link. */
  available: boolean;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

const moduleOf = (resourceKey: string): PermissionModule => {
  const resource = resourceByKey(resourceKey);
  if (!resource) throw new Error(`Unknown resource ${resourceKey}`);
  return resource.module;
};

export const ADMIN_NAV: AdminNavGroup[] = MODULES.map((group) => ({
  label: group.label,
  items: group.nav.map((entry) => {
    const visible = "visibleWithAny" in entry ? entry.visibleWithAny : [entry.resource];
    return {
      label: entry.label,
      href: entry.href,
      icon: entry.icon,
      module: moduleOf(entry.resource),
      visibleWith: visible.map(moduleOf),
      available: true,
    };
  }),
}));

export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The permission-filtered menu as the server sends it to the browser. */
export type VisibleNav = Array<{
  label: string;
  items: Array<{ label: string; href: string; available: boolean }>;
}>;

export function iconForHref(href: string): LucideIcon | undefined {
  return ADMIN_NAV.flatMap((group) => group.items).find((item) => item.href === href)?.icon;
}

/** "Create" entries for the top bar and the command palette. */
export const QUICK_CREATE: Array<{
  label: string;
  href: string;
  module: PermissionModule;
}> = NAV_ENTRIES.flatMap((entry) =>
  entry.createHref && entry.createLabel
    ? [{ label: entry.createLabel, href: entry.createHref, module: moduleOf(entry.resource) }]
    : [],
);

export const COMPANY_ICON = Building2;

/**
 * Where a path sits in the menu: its group and item, plus a last crumb for
 * screens below an item ("New", "Details"). Drives the breadcrumbs.
 */
export function locateRoute(
  pathname: string,
  groups: VisibleNav,
): { group: string | null; item: { label: string; href: string } | null; leaf: string | null } {
  let best: { group: string; item: { label: string; href: string } } | null = null;
  for (const group of groups) {
    for (const item of group.items) {
      if (!isNavItemActive(item.href, pathname)) continue;
      if (!best || item.href.length > best.item.href.length) best = { group: group.label, item };
    }
  }
  if (!best) {
    if (pathname.startsWith("/admin/profile")) return { group: null, item: { label: "My profile", href: "/admin/profile" }, leaf: null };
    return { group: null, item: null, leaf: null };
  }
  const rest = pathname.slice(best.item.href.length).split("/").filter(Boolean);
  const leaf = rest.length === 0 ? null : rest[rest.length - 1] === "new" ? "New" : "Details";
  return { group: best.group === "Overview" ? null : best.group, item: best.item, leaf };
}
