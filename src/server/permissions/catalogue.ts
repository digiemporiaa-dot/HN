import type { PermissionAction, PermissionModule } from "@/generated/prisma/enums";
import {
  ACTION_LABELS as REGISTRY_ACTION_LABELS,
  MODULES,
  RESOURCES,
} from "@/lib/permissions/registry";

/**
 * The permission surface in the shape the checks and the seed use, derived
 * from the registry (src/lib/permissions/registry.ts) so there is one
 * definition. A module or action that is not in the registry does not exist
 * anywhere in the system: it cannot be granted, and checking it is always
 * false for anyone but Super Admin.
 */
export const MODULE_ACTIONS = Object.fromEntries(
  RESOURCES.map((resource) => [resource.module, [...resource.actions]]),
) as Record<PermissionModule, PermissionAction[]>;

const GROUP_LABELS = new Map<string, string>(MODULES.map((module) => [module.key, module.label]));

/** "SEO › Redirects": the resource with its module, for lists such as the audit log. */
export const MODULE_LABELS = Object.fromEntries(
  RESOURCES.map((resource) => [resource.module, `${GROUP_LABELS.get(resource.moduleKey)} › ${resource.label}`]),
) as Record<PermissionModule, string>;

export const ACTION_LABELS: Record<PermissionAction, string> = REGISTRY_ACTION_LABELS;

export const MODULE_ORDER = RESOURCES.map((resource) => resource.module);

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
      ...only("FORMS", "VIEW"),
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
      "Works assigned leads and quotations. Cannot delete, export or reassign.",
    permissions: [
      ...only("DASHBOARD", "VIEW"),
      ...only("LEADS", "VIEW", "EDIT"),
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
      ...everything("POPUPS"),
      ...everything("CTA_POPUPS"),
      // Deliberately view-only: location pages are the highest SEO risk surface
      // and publishing them belongs to the SEO Manager.
      ...only("LOCATIONS", "VIEW"),
      ...only("SEO", "VIEW"),
      ...only("SEO_REDIRECTS", "VIEW"),
      ...only("SEO_NOT_FOUND", "VIEW"),
      ...only("SEO_INDEXATION", "VIEW"),
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
      ...everything("SEO_REDIRECTS"),
      ...everything("SEO_NOT_FOUND"),
      ...everything("SEO_INDEXATION"),
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
      // Popups target pages, so the SEO team can see what covers them.
      ...only("POPUPS", "VIEW"),
      ...only("CTA_POPUPS", "VIEW"),
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
