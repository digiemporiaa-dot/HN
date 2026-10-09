import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { PermissionModule } from "@/generated/prisma/enums";
import {
  ALL_PERMISSION_IDS,
  idForStorage,
  MODULES,
  NAV_ENTRIES,
  parsePermissionId,
  registryProblems,
  requiredFor,
  resourceByKey,
  RESOURCES,
  RETIRED_PERMISSIONS,
} from "@/lib/permissions/registry";
import { MODULE_ACTIONS, permissionKey, SYSTEM_ROLES } from "@/server/permissions/catalogue";
import { ADMIN_NAV, QUICK_CREATE } from "@/components/admin/navigation";

const root = join(__dirname, "..");

describe("registry consistency", () => {
  it("has no structural problems", () => {
    expect(registryProblems()).toEqual([]);
  });

  it("maps every stored module to exactly one resource", () => {
    const stored = Object.values(PermissionModule).sort();
    expect(RESOURCES.map((resource) => resource.module).sort()).toEqual(stored);
  });

  it("defines action sets explicitly, not as a cross-product", () => {
    expect(MODULE_ACTIONS.DASHBOARD).toEqual(["VIEW"]);
    expect(MODULE_ACTIONS.NAVIGATION).toEqual(["VIEW", "EDIT"]);
    expect(MODULE_ACTIONS.SEO_INDEXATION).toEqual(["VIEW"]);
    expect(MODULE_ACTIONS.APPLICATIONS).not.toContain("PUBLISH");
    expect(MODULE_ACTIONS.BACKUPS).toContain("RESTORE");
    expect(MODULE_ACTIONS.PRODUCTS).not.toContain("RESTORE");
    for (const resource of RESOURCES) {
      if (resource.module !== "SETTINGS") expect(resource.actions).not.toContain("MANAGE_SETTINGS");
    }
  });

  it("keeps retired pairs out of the grantable set", () => {
    for (const retired of RETIRED_PERMISSIONS) {
      expect(MODULE_ACTIONS[retired.module]).not.toContain(retired.action);
      expect(idForStorage(retired.module, retired.action)).toBeNull();
    }
  });

  it("round-trips every id between the hierarchical and stored forms", () => {
    expect(ALL_PERMISSION_IDS.length).toBe(RESOURCES.reduce((sum, resource) => sum + resource.actions.length, 0));
    for (const id of ALL_PERMISSION_IDS) {
      const parsed = parsePermissionId(id);
      expect(parsed, id).not.toBeNull();
      expect(idForStorage(parsed!.resource.module, parsed!.action)).toBe(id);
    }
  });

  it("keeps products and SEO granular", () => {
    expect(parsePermissionId("catalogue.products:view")?.storageKey).toBe("PRODUCTS:VIEW");
    expect(parsePermissionId("catalogue.products:delete")?.storageKey).toBe("PRODUCTS:DELETE");
    expect(parsePermissionId("seo.metadata:edit")?.storageKey).toBe("SEO:EDIT");
    expect(parsePermissionId("seo.redirects:edit")?.storageKey).toBe("SEO_REDIRECTS:EDIT");
  });
});

describe("parsing identifiers", () => {
  it("refuses anything the registry does not define", () => {
    for (const bad of [
      "LEADS:VIEW",
      "sales.leads",
      "sales.leads:CREATE",
      "sales.leads:create", // retired
      "seo.indexation:edit", // not an action of that resource
      "sales.nothing:view",
      "nothing.leads:view",
      "Sales.Leads:view",
      "sales.leads:view ",
      "sales.leads:view;drop",
      "*",
      "",
      42,
      null,
      undefined,
      { id: "sales.leads:view" },
      `sales.leads:${"v".repeat(100)}`,
    ]) {
      expect(parsePermissionId(bad), String(bad)).toBeNull();
    }
  });

  it("knows which actions need View", () => {
    expect(requiredFor("catalogue.products:delete")).toBe("catalogue.products:view");
    expect(requiredFor("catalogue.products:view")).toBeNull();
    expect(requiredFor("nonsense")).toBeNull();
  });
});

describe("resolution rules in the defaults", () => {
  it("never relies on parent access: SEO metadata does not include redirects", () => {
    const content = SYSTEM_ROLES.find((role) => role.key === "CONTENT_MANAGER")!.permissions as string[];
    expect(content).toContain("SEO:VIEW");
    expect(content).not.toContain("SEO_REDIRECTS:EDIT");
    expect(content).not.toContain("PRODUCTS:DELETE");
    expect(content).toContain("PRODUCTS:EDIT");
  });

  it("only grants defined pairs, with View wherever another action is granted", () => {
    for (const role of SYSTEM_ROLES) {
      if (role.permissions === "ALL") continue;
      const ids = role.permissions.map((key) => {
        const [module, action] = key.split(":") as [PermissionModule, never];
        const id = idForStorage(module, action);
        expect(id, `${role.key} grants undefined ${key}`).not.toBeNull();
        return id!;
      });
      for (const id of ids) {
        const view = requiredFor(id);
        if (view) expect(ids, `${role.key}: ${id} without View`).toContain(view);
      }
    }
  });

  it("matches the SEO split migration exactly", () => {
    const sql = readFileSync(join(root, "prisma/migrations/20261009121901_permission_resources_backfill/migration.sql"), "utf8");
    const mapping = [...sql.matchAll(/\('(VIEW|EDIT)', '(SEO_[A-Z_]+)', '([A-Z]+)'\)/g)];
    const unique = new Map(mapping.map((match) => [`${match[1]}>${match[2]}:${match[3]}`, [match[1], `${match[2]}:${match[3]}`]]));
    for (const role of SYSTEM_ROLES) {
      if (role.permissions === "ALL") continue;
      const held = new Set(role.permissions);
      const expected = new Set<string>();
      for (const [from, to] of unique.values()) if (held.has(permissionKey("SEO", from as "VIEW"))) expected.add(to);
      const actual = role.permissions.filter((key) => /^SEO_/.test(key));
      expect(new Set(actual), role.key).toEqual(expected);
    }
  });
});

describe("navigation follows the registry", () => {
  const pageFile = (href: string) => join(root, "src/app/(admin)", href, "page.tsx");

  it("has no dead links", () => {
    for (const entry of NAV_ENTRIES) expect(existsSync(pageFile(entry.href)), entry.href).toBe(true);
    for (const option of QUICK_CREATE) expect(existsSync(pageFile(option.href)), option.href).toBe(true);
  });

  it("guards each entry's page on the server with the permission that shows the entry", () => {
    for (const group of ADMIN_NAV) {
      for (const item of group.items) {
        const source = readFileSync(pageFile(item.href), "utf8");
        if (item.href === "/admin") {
          // The home screen greets everyone; its figures need Dashboard View.
          expect(source).toContain('can("DASHBOARD", "VIEW")');
          continue;
        }
        const single = source.includes(`requirePermission("${item.module}", "VIEW")`);
        const any = item.visibleWith.every((module) => source.includes(`["${module}", "VIEW"]`)) && source.includes("requireAnyPermission");
        expect(single || any, `${item.href} is not guarded by ${item.visibleWith.join(" | ")}`).toBe(true);
      }
    }
  });

  it("offers Create only where the resource has Create", () => {
    for (const option of QUICK_CREATE) expect(MODULE_ACTIONS[option.module], option.href).toContain("CREATE");
  });

  it("puts every module in the menu in registry order", () => {
    expect(ADMIN_NAV.map((group) => group.label)).toEqual(MODULES.map((module) => module.label));
    expect(resourceByKey("catalogue.categories")?.module).toBe("CATEGORIES");
    const subcategories = ADMIN_NAV.flatMap((group) => group.items).find((item) => item.href === "/admin/subcategories");
    expect(subcategories?.module).toBe("CATEGORIES");
  });
});
