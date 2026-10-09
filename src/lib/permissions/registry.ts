import {
  Archive,
  BadgeCheck,
  Blocks,
  Boxes,
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

import type { PermissionAction, PermissionModule } from "@/generated/prisma/enums";

/**
 * The admin's modules, their resources and the actions each resource
 * supports: the one place they are defined.
 *
 *   Module (a group in the menu)  →  Resource  →  Action
 *   e.g. sales                    →  leads     →  assign
 *
 * A resource is the unit permissions are granted on. Its identifier is
 * hierarchical and stable — `sales.leads:assign` — and is stored in the
 * database as the (module, action) enum pair it maps to (`LEADS:ASSIGN`), so
 * existing rows, role grants and staff overrides keep working unchanged.
 *
 * Resolution rules (enforced in src/server/permissions/index.ts):
 *   - A permission is held for exactly one resource and one action. Holding
 *     anything on a module, or one action on a resource, never implies any
 *     other: Products View does not include Products Delete, and SEO metadata
 *     does not include redirects.
 *   - Every other action on a resource requires that resource's View (a role
 *     editor cannot save Edit without View; see ACTION_REQUIRES).
 *   - Effective permissions = role grants + staff GRANT overrides − staff
 *     REVOKE overrides. REVOKE always wins. Super Admin holds everything.
 *   - Anything not in this registry is not grantable and is never assumed:
 *     unknown keys are refused when saving and ignored when checking.
 *
 * This file is shared by the server (checks, saving) and the browser (menu,
 * role editor), so it imports nothing server-only.
 */

export type ResourceDefinition = {
  /** Stable hierarchical key: `<module>.<resource>`. Never renamed. */
  key: string;
  /** Storage: the enum value the database uses for this resource. */
  module: PermissionModule;
  label: string;
  description: string;
  /** Exactly the actions that mean something for this resource. */
  actions: readonly PermissionAction[];
};

export type NavDefinition = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** The resource whose VIEW shows this entry and guards its page. */
  resource: string;
  /** Shown when any of these resources can be viewed, instead of `resource` alone. */
  visibleWithAny?: readonly string[];
  /** Where "Create" leads, when the resource has a create screen. */
  createHref?: string;
  createLabel?: string;
};

export type ModuleDefinition = {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** System modules hold staff, access and data-recovery controls. */
  system?: boolean;
  resources: readonly ResourceDefinition[];
  nav: readonly NavDefinition[];
};

export const MODULES = [
  {
    key: "overview",
    label: "Overview",
    description: "The admin's home screen.",
    icon: Gauge,
    resources: [
      {
        key: "overview.dashboard",
        module: "DASHBOARD",
        label: "Dashboard",
        description: "The overview figures on the admin home screen.",
        actions: ["VIEW"],
      },
    ],
    nav: [{ label: "Dashboard", href: "/admin", icon: Gauge, resource: "overview.dashboard" }],
  },
  {
    key: "sales",
    label: "Sales",
    description: "Enquiries and quotation requests.",
    icon: ClipboardList,
    resources: [
      {
        key: "sales.leads",
        module: "LEADS",
        label: "Leads",
        description: "Every enquiry from the website, its stage, notes and owner.",
        actions: ["VIEW", "EDIT", "DELETE", "ASSIGN", "EXPORT"],
      },
      {
        key: "sales.rfqs",
        module: "RFQ",
        label: "RFQs",
        description: "Quotation requests. Working one also needs the matching Leads permission.",
        actions: ["VIEW", "EDIT", "DELETE", "EXPORT"],
      },
    ],
    nav: [
      { label: "Leads", href: "/admin/leads", icon: ClipboardList, resource: "sales.leads" },
      { label: "RFQs", href: "/admin/rfqs", icon: FileText, resource: "sales.rfqs" },
    ],
  },
  {
    key: "catalogue",
    label: "Catalogue",
    description: "Products and the taxonomy around them.",
    icon: Boxes,
    resources: [
      {
        key: "catalogue.products",
        module: "PRODUCTS",
        label: "Products",
        description: "Products, their specifications, documents and FAQs.",
        actions: ["VIEW", "CREATE", "EDIT", "DELETE", "PUBLISH"],
      },
      {
        key: "catalogue.categories",
        module: "CATEGORIES",
        label: "Categories & subcategories",
        description: "Both levels of the category tree, and their FAQs.",
        actions: ["VIEW", "CREATE", "EDIT", "DELETE", "PUBLISH"],
      },
      {
        key: "catalogue.brands",
        module: "BRANDS",
        label: "Brands",
        description: "Manufacturers and the categories they cover.",
        actions: ["VIEW", "CREATE", "EDIT", "DELETE", "PUBLISH"],
      },
      {
        key: "catalogue.specialties",
        module: "SPECIALTIES",
        label: "Specialties",
        description: "Clinical specialties and their pages.",
        actions: ["VIEW", "CREATE", "EDIT", "DELETE", "PUBLISH"],
      },
      {
        key: "catalogue.solutions",
        module: "SOLUTIONS",
        label: "Solutions",
        description: "Department and project solutions.",
        actions: ["VIEW", "CREATE", "EDIT", "DELETE", "PUBLISH"],
      },
      {
        key: "catalogue.applications",
        module: "APPLICATIONS",
        label: "Applications",
        description: "Labels on products. They have no page of their own, so no Publish.",
        actions: ["VIEW", "CREATE", "EDIT", "DELETE"],
      },
    ],
    nav: [
      { label: "Products", href: "/admin/products", icon: Boxes, resource: "catalogue.products", createHref: "/admin/products/new", createLabel: "New product" },
      { label: "Categories", href: "/admin/categories", icon: Tags, resource: "catalogue.categories", createHref: "/admin/categories/new", createLabel: "New category" },
      // The same resource as categories: one tree, two screens.
      { label: "Subcategories", href: "/admin/subcategories", icon: FolderTree, resource: "catalogue.categories" },
      { label: "Brands", href: "/admin/brands", icon: BadgeCheck, resource: "catalogue.brands", createHref: "/admin/brands/new", createLabel: "New brand" },
      { label: "Specialties", href: "/admin/specialties", icon: Stethoscope, resource: "catalogue.specialties" },
      { label: "Solutions", href: "/admin/solutions", icon: Blocks, resource: "catalogue.solutions" },
      { label: "Applications", href: "/admin/applications", icon: Crosshair, resource: "catalogue.applications" },
    ],
  },
  {
    key: "content",
    label: "Content",
    description: "Pages, articles, menus, files, forms and popups.",
    icon: Layers,
    resources: [
      {
        key: "content.pages",
        module: "PAGES",
        label: "Pages",
        description: "CMS pages, including the homepage.",
        actions: ["VIEW", "CREATE", "EDIT", "DELETE", "PUBLISH"],
      },
      {
        key: "content.blogs",
        module: "BLOGS",
        label: "Blog",
        description: "Articles.",
        actions: ["VIEW", "CREATE", "EDIT", "DELETE", "PUBLISH"],
      },
      {
        key: "content.navigation",
        module: "NAVIGATION",
        label: "Navigation",
        description: "Header and footer menus.",
        actions: ["VIEW", "EDIT"],
      },
      {
        key: "content.media",
        module: "MEDIA",
        label: "Media",
        description: "The media library. Create means upload.",
        actions: ["VIEW", "CREATE", "EDIT", "DELETE"],
      },
      {
        key: "content.forms",
        module: "FORMS",
        label: "Forms",
        description: "Built forms, their submissions and attachments.",
        actions: ["VIEW", "CREATE", "EDIT", "DELETE"],
      },
      {
        key: "content.popups",
        module: "POPUPS",
        label: "Popups",
        description: "Site popups. Publish means switching one on.",
        actions: ["VIEW", "CREATE", "EDIT", "DELETE", "PUBLISH"],
      },
    ],
    nav: [
      { label: "Pages", href: "/admin/pages", icon: Layers, resource: "content.pages", createHref: "/admin/pages/new", createLabel: "New page" },
      { label: "Blogs", href: "/admin/blogs", icon: Newspaper, resource: "content.blogs", createHref: "/admin/blogs/new", createLabel: "New blog post" },
      { label: "Navigation", href: "/admin/navigation", icon: Route, resource: "content.navigation" },
      { label: "Media", href: "/admin/media", icon: Image, resource: "content.media", createHref: "/admin/media", createLabel: "Upload media" },
      { label: "Forms", href: "/admin/forms", icon: ClipboardList, resource: "content.forms", createHref: "/admin/forms/new", createLabel: "New form" },
      { label: "Popups", href: "/admin/popups", icon: PictureInPicture2, resource: "content.popups", createHref: "/admin/popups/new", createLabel: "New popup" },
    ],
  },
  {
    key: "seo",
    label: "SEO",
    description: "What search engines are told, and the location pages.",
    icon: Search,
    resources: [
      {
        key: "seo.metadata",
        module: "SEO",
        label: "Page metadata",
        description: "Per-page titles, descriptions and canonicals. Publish covers noindex.",
        actions: ["VIEW", "EDIT", "PUBLISH"],
      },
      {
        key: "seo.redirects",
        module: "SEO_REDIRECTS",
        label: "Redirects",
        description: "Old addresses and where they lead.",
        actions: ["VIEW", "CREATE", "EDIT", "DELETE"],
      },
      {
        key: "seo.not_found",
        module: "SEO_NOT_FOUND",
        label: "Not-found monitor",
        description: "Missing addresses people ask for. Edit means dismissing or restoring entries.",
        actions: ["VIEW", "EDIT"],
      },
      {
        key: "seo.indexation",
        module: "SEO_INDEXATION",
        label: "Indexation report",
        description: "A read-only check of what search engines are offered.",
        actions: ["VIEW"],
      },
      {
        key: "seo.locations",
        module: "LOCATIONS",
        label: "Location pages",
        description: "States, cities and the programmatic city pages.",
        actions: ["VIEW", "CREATE", "EDIT", "DELETE", "PUBLISH"],
      },
    ],
    nav: [
      {
        label: "SEO",
        href: "/admin/seo",
        icon: Search,
        resource: "seo.metadata",
        visibleWithAny: ["seo.metadata", "seo.redirects", "seo.not_found", "seo.indexation"],
      },
      { label: "Locations", href: "/admin/locations", icon: MapPin, resource: "seo.locations" },
    ],
  },
  {
    key: "system",
    label: "System",
    description: "Staff, access, data protection and site settings.",
    icon: Settings,
    system: true,
    resources: [
      {
        key: "system.staff",
        module: "STAFF",
        label: "Staff",
        description: "Accounts, their roles and individual overrides.",
        actions: ["VIEW", "CREATE", "EDIT", "DELETE"],
      },
      {
        key: "system.roles",
        module: "ROLES",
        label: "Roles & permissions",
        description: "What each role may do. Roles are fixed; their permissions are edited.",
        actions: ["VIEW", "EDIT"],
      },
      {
        key: "system.backups",
        module: "BACKUPS",
        label: "Backups",
        description: "Database and media archives. Restore replaces everything.",
        actions: ["VIEW", "CREATE", "DELETE", "RESTORE", "EXPORT"],
      },
      {
        key: "system.audit_logs",
        module: "AUDIT_LOGS",
        label: "Audit logs",
        description: "The append-only record of what happened.",
        actions: ["VIEW", "EXPORT"],
      },
      {
        key: "system.settings",
        module: "SETTINGS",
        label: "Settings",
        description: "Company, email, SEO defaults, security and backup settings.",
        actions: ["VIEW", "MANAGE_SETTINGS"],
      },
    ],
    nav: [
      { label: "Staff", href: "/admin/staff", icon: Users, resource: "system.staff", createHref: "/admin/staff/new", createLabel: "New staff member" },
      { label: "Roles & Permissions", href: "/admin/roles", icon: ShieldCheck, resource: "system.roles" },
      { label: "Backups", href: "/admin/backups", icon: Archive, resource: "system.backups" },
      { label: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText, resource: "system.audit_logs" },
      { label: "Settings", href: "/admin/settings", icon: Settings, resource: "system.settings" },
    ],
  },
] as const satisfies readonly ModuleDefinition[];

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

/** Display order of actions within a resource. */
export const ACTION_ORDER: readonly PermissionAction[] = [
  "VIEW",
  "CREATE",
  "EDIT",
  "DELETE",
  "PUBLISH",
  "ASSIGN",
  "EXPORT",
  "RESTORE",
  "MANAGE_SETTINGS",
];

/**
 * Pairs that exist in the database (older seeds granted them) but that no
 * screen or action ever checked. They are not grantable, grant nothing, and
 * are dropped from a role the next time it is saved. Listed so the drop is
 * deliberate and documented rather than silent.
 */
export const RETIRED_PERMISSIONS: ReadonlyArray<{ module: PermissionModule; action: PermissionAction; reason: string }> = [
  { module: "LEADS", action: "CREATE", reason: "There is no screen for creating a lead by hand." },
  { module: "PRODUCTS", action: "EXPORT", reason: "There is no product export." },
  { module: "FORMS", action: "EXPORT", reason: "There is no submissions export." },
  { module: "ROLES", action: "CREATE", reason: "Roles are fixed; there is no screen to add one." },
  { module: "ROLES", action: "DELETE", reason: "Roles are fixed; there is no screen to delete one." },
];

/* ------------------------------------------------------------ derived -- */

export type ResourceKey = (typeof MODULES)[number]["resources"][number]["key"];

export const RESOURCES: readonly (ResourceDefinition & { moduleKey: string })[] = (
  MODULES as readonly ModuleDefinition[]
).flatMap((module) =>
  module.resources.map((resource) => ({ ...resource, moduleKey: module.key })),
);

const byKey = new Map(RESOURCES.map((resource) => [resource.key, resource]));
const byModule = new Map(RESOURCES.map((resource) => [resource.module, resource]));

export function resourceByKey(key: string) {
  return byKey.get(key);
}

export function resourceByStorageModule(module: PermissionModule) {
  return byModule.get(module);
}

/** `catalogue.products:delete` */
export function permissionId(resourceKey: string, action: PermissionAction): string {
  return `${resourceKey}:${action.toLowerCase()}`;
}

/** `PRODUCTS:DELETE`, the form the database and the checks use. */
export function storageKey(module: PermissionModule, action: PermissionAction): string {
  return `${module}:${action}`;
}

const PERMISSION_ID = /^([a-z][a-z_]*\.[a-z][a-z_]*):([a-z_]+)$/;

export type ParsedPermission = {
  id: string;
  resource: ResourceDefinition;
  action: PermissionAction;
  storageKey: string;
};

/**
 * Reads a hierarchical permission identifier, accepting only what the
 * registry defines. Anything else — a typo, a retired pair, an action the
 * resource does not support, a different shape — is null: fail closed.
 */
export function parsePermissionId(input: unknown): ParsedPermission | null {
  if (typeof input !== "string" || input.length > 80) return null;
  const match = PERMISSION_ID.exec(input);
  if (!match) return null;
  const resource = byKey.get(match[1]);
  if (!resource) return null;
  const action = match[2].toUpperCase() as PermissionAction;
  if (!resource.actions.includes(action)) return null;
  return { id: input, resource, action, storageKey: storageKey(resource.module, action) };
}

/** The hierarchical id for a stored pair, or null if the pair is not grantable. */
export function idForStorage(module: PermissionModule, action: PermissionAction): string | null {
  const resource = byModule.get(module);
  if (!resource || !resource.actions.includes(action)) return null;
  return permissionId(resource.key, action);
}

/** Every grantable permission, as hierarchical ids, in display order. */
export const ALL_PERMISSION_IDS: readonly string[] = RESOURCES.flatMap((resource) =>
  ACTION_ORDER.filter((action) => resource.actions.includes(action)).map((action) => permissionId(resource.key, action)),
);

/**
 * Within one resource, every action other than View needs View: none of the
 * screens behind them can be reached without it.
 */
export function requiredFor(id: string): string | null {
  const parsed = parsePermissionId(id);
  if (!parsed || parsed.action === "VIEW" || !parsed.resource.actions.includes("VIEW")) return null;
  return permissionId(parsed.resource.key, "VIEW");
}

/** Every nav entry, flattened, with its module. */
export const NAV_ENTRIES: ReadonlyArray<NavDefinition & { moduleKey: string; moduleLabel: string }> = (
  MODULES as readonly ModuleDefinition[]
).flatMap((module) =>
  module.nav.map((entry) => ({ ...entry, moduleKey: module.key, moduleLabel: module.label })),
);

/**
 * Structural checks, run by the test suite: unique keys, every nav entry
 * pointing at a real resource, every resource mapped to its own enum value.
 */
export function registryProblems(): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  const modules = new Set<string>();
  for (const resource of RESOURCES) {
    if (seen.has(resource.key)) problems.push(`duplicate resource key ${resource.key}`);
    seen.add(resource.key);
    if (modules.has(resource.module)) problems.push(`enum ${resource.module} used by two resources`);
    modules.add(resource.module);
    if (!resource.key.startsWith(`${resource.moduleKey}.`)) problems.push(`${resource.key} is not under ${resource.moduleKey}`);
    if (!/^[a-z][a-z_]*\.[a-z][a-z_]*$/.test(resource.key)) problems.push(`malformed key ${resource.key}`);
    if (resource.actions.length === 0) problems.push(`${resource.key} has no actions`);
    if (new Set(resource.actions).size !== resource.actions.length) problems.push(`${resource.key} repeats an action`);
    if (resource.actions.length > 1 && !resource.actions.includes("VIEW")) problems.push(`${resource.key} lacks VIEW`);
    for (const retired of RETIRED_PERMISSIONS) {
      if (retired.module === resource.module && resource.actions.includes(retired.action)) {
        problems.push(`${resource.key} still offers retired ${retired.action}`);
      }
    }
  }
  const hrefs = new Set<string>();
  for (const entry of NAV_ENTRIES) {
    if (!byKey.has(entry.resource)) problems.push(`nav ${entry.href} points at unknown ${entry.resource}`);
    for (const key of entry.visibleWithAny ?? []) {
      if (!byKey.has(key)) problems.push(`nav ${entry.href} lists unknown ${key}`);
    }
    if (hrefs.has(entry.href)) problems.push(`duplicate nav href ${entry.href}`);
    hrefs.add(entry.href);
  }
  return problems;
}
