import { PermissionAction, PermissionModule } from "@/generated/prisma/enums";

/**
 * The authoritative definition of the permission surface.
 *
 * Seeding, the role editor and every authorisation check read from here, so a
 * module or action that is not listed simply does not exist anywhere in the
 * system. Not every module supports every action — granting DELETE on the
 * dashboard would be meaningless — so the valid pairs are enumerated rather
 * than produced by a cross-product.
 */
export const MODULE_ACTIONS: Record<PermissionModule, PermissionAction[]> = {
  DASHBOARD: ["VIEW"],
  LEADS: ["VIEW", "CREATE", "EDIT", "DELETE", "EXPORT", "ASSIGN"],
  RFQ: ["VIEW", "EDIT", "DELETE", "EXPORT"],
  PRODUCTS: ["VIEW", "CREATE", "EDIT", "DELETE", "PUBLISH", "EXPORT"],
  CATEGORIES: ["VIEW", "CREATE", "EDIT", "DELETE", "PUBLISH"],
  BRANDS: ["VIEW", "CREATE", "EDIT", "DELETE", "PUBLISH"],
  SPECIALTIES: ["VIEW", "CREATE", "EDIT", "DELETE", "PUBLISH"],
  SOLUTIONS: ["VIEW", "CREATE", "EDIT", "DELETE", "PUBLISH"],
  // No PUBLISH: an application is a label on a product, not a page of its own.
  APPLICATIONS: ["VIEW", "CREATE", "EDIT", "DELETE"],
  LOCATIONS: ["VIEW", "CREATE", "EDIT", "DELETE", "PUBLISH"],
  PAGES: ["VIEW", "CREATE", "EDIT", "DELETE", "PUBLISH"],
  BLOGS: ["VIEW", "CREATE", "EDIT", "DELETE", "PUBLISH"],
  NAVIGATION: ["VIEW", "EDIT"],
  MEDIA: ["VIEW", "CREATE", "EDIT", "DELETE"],
  FORMS: ["VIEW", "CREATE", "EDIT", "DELETE", "EXPORT"],
  SEO: ["VIEW", "EDIT", "PUBLISH"],
  STAFF: ["VIEW", "CREATE", "EDIT", "DELETE"],
  ROLES: ["VIEW", "CREATE", "EDIT", "DELETE"],
  BACKUPS: ["VIEW", "CREATE", "DELETE", "RESTORE", "EXPORT"],
  AUDIT_LOGS: ["VIEW", "EXPORT"],
  SETTINGS: ["VIEW", "MANAGE_SETTINGS"],
};

export const MODULE_LABELS: Record<PermissionModule, string> = {
  DASHBOARD: "Dashboard",
  LEADS: "Leads",
  RFQ: "RFQs",
  PRODUCTS: "Products",
  CATEGORIES: "Categories",
  BRANDS: "Brands",
  SPECIALTIES: "Specialties",
  SOLUTIONS: "Solutions",
  APPLICATIONS: "Applications",
  LOCATIONS: "Locations",
  PAGES: "Pages",
  BLOGS: "Blogs",
  NAVIGATION: "Navigation",
  MEDIA: "Media",
  FORMS: "Forms",
  SEO: "SEO",
  STAFF: "Staff",
  ROLES: "Roles & Permissions",
  BACKUPS: "Backups",
  AUDIT_LOGS: "Audit Logs",
  SETTINGS: "Settings",
};

export const ACTION_LABELS: Record<PermissionAction, string> = {
  VIEW: "View",
  CREATE: "Create",
  EDIT: "Edit",
  DELETE: "Delete",
  PUBLISH: "Publish",
  EXPORT: "Export",
  ASSIGN: "Assign",
  RESTORE: "Restore",
  MANAGE_SETTINGS: "Manage settings",
};

export const MODULE_ORDER = Object.keys(MODULE_ACTIONS) as PermissionModule[];

/** Canonical string form used in permission sets and checks. */
export function permissionKey(
  module: PermissionModule,
  action: PermissionAction,
): string {
  return `${module}:${action}`;
}

export function allPermissionPairs(): Array<{
  module: PermissionModule;
  action: PermissionAction;
}> {
  return MODULE_ORDER.flatMap((module) =>
    MODULE_ACTIONS[module].map((action) => ({ module, action })),
  );
}

/** Convenience builders keeping the role table below readable. */
function only(
  module: PermissionModule,
  ...actions: PermissionAction[]
): string[] {
  return actions.map((action) => permissionKey(module, action));
}

function everything(module: PermissionModule): string[] {
  return MODULE_ACTIONS[module].map((action) => permissionKey(module, action));
}

export const SUPER_ADMIN_ROLE_KEY = "SUPER_ADMIN";

export type RoleDefinition = {
  key: string;
  name: string;
  description: string;
  /** "ALL" is reserved for SUPER_ADMIN, which also short-circuits every check. */
  permissions: "ALL" | string[];
};

export const SYSTEM_ROLES: RoleDefinition[] = [
  {
    key: SUPER_ADMIN_ROLE_KEY,
    name: "Super Admin",
    description:
      "Unrestricted access, including backup restore and role management.",
    permissions: "ALL",
  },
  {
    key: "ADMIN",
    name: "Admin",
    description:
      "Full operational access. Cannot restore backups or alter roles and permissions.",
    permissions: [
      ...MODULE_ORDER.filter(
        (module) => module !== "BACKUPS" && module !== "ROLES",
      ).flatMap(everything),
      ...only("BACKUPS", "VIEW", "CREATE", "DELETE", "EXPORT"),
      ...only("ROLES", "VIEW"),
    ],
  },
  {
    key: "SALES_MANAGER",
    name: "Sales Manager",
    description:
      "Owns the sales pipeline: full lead and RFQ access including assignment and export.",
    permissions: [
      ...only("DASHBOARD", "VIEW"),
      ...everything("LEADS"),
      ...everything("RFQ"),
      ...only("FORMS", "VIEW", "EXPORT"),
      ...only("PRODUCTS", "VIEW"),
      ...only("CATEGORIES", "VIEW"),
      ...only("BRANDS", "VIEW"),
      ...only("SPECIALTIES", "VIEW"),
      ...only("SOLUTIONS", "VIEW"),
      ...only("APPLICATIONS", "VIEW"),
      ...only("LOCATIONS", "VIEW"),
    ],
  },
  {
    key: "SALES_EXECUTIVE",
    name: "Sales Executive",
    description:
      "Works assigned leads and RFQs. Cannot delete, export or reassign.",
    permissions: [
      ...only("DASHBOARD", "VIEW"),
      ...only("LEADS", "VIEW", "CREATE", "EDIT"),
      ...only("RFQ", "VIEW", "EDIT"),
      ...only("PRODUCTS", "VIEW"),
      ...only("CATEGORIES", "VIEW"),
      ...only("BRANDS", "VIEW"),
      ...only("SPECIALTIES", "VIEW"),
      ...only("SOLUTIONS", "VIEW"),
      ...only("APPLICATIONS", "VIEW"),
    ],
  },
  {
    key: "CONTENT_MANAGER",
    name: "Content Manager",
    description:
      "Creates and publishes site content and manages the media library.",
    permissions: [
      ...only("DASHBOARD", "VIEW"),
      ...everything("PAGES"),
      ...everything("BLOGS"),
      ...everything("NAVIGATION"),
      ...everything("MEDIA"),
      ...only("PRODUCTS", "VIEW", "CREATE", "EDIT", "PUBLISH"),
      ...only("CATEGORIES", "VIEW", "CREATE", "EDIT", "PUBLISH"),
      ...only("BRANDS", "VIEW", "CREATE", "EDIT", "PUBLISH"),
      ...only("SPECIALTIES", "VIEW", "CREATE", "EDIT", "PUBLISH"),
      ...only("SOLUTIONS", "VIEW", "CREATE", "EDIT", "PUBLISH"),
      ...everything("APPLICATIONS"),
      ...only("FORMS", "VIEW", "CREATE", "EDIT"),
      // Deliberately view-only: location pages are the highest SEO risk surface
      // and publishing them belongs to the SEO Manager.
      ...only("LOCATIONS", "VIEW"),
      ...only("SEO", "VIEW"),
    ],
  },
  {
    key: "SEO_MANAGER",
    name: "SEO Manager",
    description:
      "Owns metadata, redirects, indexation and the programmatic location pages.",
    permissions: [
      ...only("DASHBOARD", "VIEW"),
      ...everything("SEO"),
      ...everything("LOCATIONS"),
      ...only("PAGES", "VIEW", "EDIT"),
      ...only("BLOGS", "VIEW", "EDIT"),
      ...only("NAVIGATION", "VIEW"),
      ...only("PRODUCTS", "VIEW", "EDIT"),
      ...only("CATEGORIES", "VIEW", "EDIT"),
      ...only("BRANDS", "VIEW", "EDIT"),
      ...only("SPECIALTIES", "VIEW", "EDIT"),
      ...only("SOLUTIONS", "VIEW", "EDIT"),
      ...only("APPLICATIONS", "VIEW", "EDIT"),
      ...only("MEDIA", "VIEW"),
    ],
  },
  {
    key: "VIEWER",
    name: "Viewer",
    description:
      "Read-only access to operational data. No access to staff, roles, backups, audit logs or settings.",
    permissions: MODULE_ORDER.filter(
      (module) =>
        !["STAFF", "ROLES", "BACKUPS", "AUDIT_LOGS", "SETTINGS"].includes(
          module,
        ),
    ).map((module) => permissionKey(module, "VIEW")),
  },
];
