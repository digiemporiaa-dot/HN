import {
  Archive,
  BadgeCheck,
  Blocks,
  Boxes,
  Building2,
  ClipboardList,
  Crosshair,
  FileText,
  FolderTree,
  Gauge,
  Image,
  Layers,
  type LucideIcon,
  MapPin,
  Newspaper,
  PictureInPicture2,
  Route,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  Tags,
  Users,
} from "lucide-react";

import type { PermissionModule } from "@/generated/prisma/enums";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** VIEW on this module is required for the item to appear at all. */
  module: PermissionModule;
  /**
   * False until the phase that builds the module lands. Unavailable items are
   * rendered as inert rows rather than links, so the information architecture
   * is visible without any navigation leading to a dead route.
   */
  available: boolean;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: Gauge,
        module: "DASHBOARD",
        available: true,
      },
    ],
  },
  {
    label: "Sales",
    items: [
      {
        label: "Leads",
        href: "/admin/leads",
        icon: ClipboardList,
        module: "LEADS",
        available: true,
      },
      {
        label: "RFQs",
        href: "/admin/rfqs",
        icon: FileText,
        module: "RFQ",
        available: true,
      },
    ],
  },
  {
    label: "Catalogue",
    items: [
      {
        label: "Products",
        href: "/admin/products",
        icon: Boxes,
        module: "PRODUCTS",
        available: true,
      },
      {
        label: "Categories",
        href: "/admin/categories",
        icon: Tags,
        module: "CATEGORIES",
        available: true,
      },
      {
        label: "Subcategories",
        href: "/admin/subcategories",
        icon: FolderTree,
        module: "CATEGORIES",
        available: true,
      },
      {
        label: "Brands",
        href: "/admin/brands",
        icon: BadgeCheck,
        module: "BRANDS",
        available: true,
      },
      {
        label: "Specialties",
        href: "/admin/specialties",
        icon: Stethoscope,
        module: "SPECIALTIES",
        available: true,
      },
      {
        label: "Solutions",
        href: "/admin/solutions",
        icon: Blocks,
        module: "SOLUTIONS",
        available: true,
      },
      {
        label: "Applications",
        href: "/admin/applications",
        icon: Crosshair,
        module: "APPLICATIONS",
        available: true,
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        label: "Pages",
        href: "/admin/pages",
        icon: Layers,
        module: "PAGES",
        available: true,
      },
      {
        label: "Blogs",
        href: "/admin/blogs",
        icon: Newspaper,
        module: "BLOGS",
        available: true,
      },
      {
        label: "Navigation",
        href: "/admin/navigation",
        icon: Route,
        module: "NAVIGATION",
        available: true,
      },
      {
        label: "Media",
        href: "/admin/media",
        icon: Image,
        module: "MEDIA",
        available: true,
      },
      {
        label: "Forms",
        href: "/admin/forms",
        icon: ClipboardList,
        module: "FORMS",
        available: true,
      },
    ],
  },
  {
    label: "Growth",
    items: [
      {
        label: "Locations",
        href: "/admin/locations",
        icon: MapPin,
        module: "LOCATIONS",
        available: true,
      },
      {
        label: "SEO",
        href: "/admin/seo",
        icon: Search,
        module: "SEO",
        available: true,
      },
      {
        label: "Popups",
        href: "/admin/popups",
        icon: PictureInPicture2,
        module: "POPUPS",
        available: true,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Staff",
        href: "/admin/staff",
        icon: Users,
        module: "STAFF",
        available: true,
      },
      {
        label: "Roles & Permissions",
        href: "/admin/roles",
        icon: ShieldCheck,
        module: "ROLES",
        available: true,
      },
      {
        label: "Backups",
        href: "/admin/backups",
        icon: Archive,
        module: "BACKUPS",
        available: true,
      },
      {
        label: "Audit Logs",
        href: "/admin/audit-logs",
        icon: ScrollText,
        module: "AUDIT_LOGS",
        available: true,
      },
      {
        label: "Settings",
        href: "/admin/settings",
        icon: Settings,
        module: "SETTINGS",
        available: true,
      },
    ],
  },
];

export const COMPANY_ICON = Building2;

/**
 * Longest-match wins, so /admin/staff/new highlights Staff while /admin alone
 * does not swallow every other route.
 */
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
}> = [
  { label: "New product", href: "/admin/products/new", module: "PRODUCTS" },
  { label: "New category", href: "/admin/categories/new", module: "CATEGORIES" },
  { label: "New brand", href: "/admin/brands/new", module: "BRANDS" },
  { label: "New page", href: "/admin/pages/new", module: "PAGES" },
  { label: "New blog post", href: "/admin/blogs/new", module: "BLOGS" },
  { label: "New form", href: "/admin/forms/new", module: "FORMS" },
  { label: "New popup", href: "/admin/popups/new", module: "POPUPS" },
  { label: "Upload media", href: "/admin/media", module: "MEDIA" },
  { label: "New staff member", href: "/admin/staff/new", module: "STAFF" },
];

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
