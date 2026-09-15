import {
  Archive,
  BadgeCheck,
  Blocks,
  Boxes,
  Building2,
  ClipboardList,
  FileText,
  FolderTree,
  Gauge,
  Image,
  Layers,
  type LucideIcon,
  MapPin,
  Newspaper,
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
        available: false,
      },
      {
        label: "RFQs",
        href: "/admin/rfqs",
        icon: FileText,
        module: "RFQ",
        available: false,
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
        available: false,
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
        available: false,
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
        available: false,
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
        available: false,
      },
      {
        label: "SEO",
        href: "/admin/seo",
        icon: Search,
        module: "SEO",
        available: false,
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
        available: false,
      },
      {
        label: "Audit Logs",
        href: "/admin/audit-logs",
        icon: ScrollText,
        module: "AUDIT_LOGS",
        available: false,
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
