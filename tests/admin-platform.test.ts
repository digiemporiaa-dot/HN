import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MODULE_ACTIONS, permissionKey, SYSTEM_ROLES } from "@/server/permissions/catalogue";
import { isEditTarget } from "@/lib/admin/unsaved-changes";
import { normaliseQuery, SEARCH_MAX_QUERY, sortHits } from "@/lib/admin/search";
import { resolveTheme, ADMIN_THEME_SCRIPT } from "@/lib/admin/theme";
import { placePopover } from "@/components/ui/popover";

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("POPUPS permissions", () => {
  const role = (key: string) => {
    const definition = SYSTEM_ROLES.find((item) => item.key === key);
    if (!definition) throw new Error(key);
    return definition.permissions;
  };
  const popupKeys = (key: string) => {
    const permissions = role(key);
    return permissions === "ALL" ? "ALL" : permissions.filter((item) => item.startsWith("POPUPS:")).sort();
  };

  it("defines the five popup actions", () => {
    expect(MODULE_ACTIONS.POPUPS).toEqual(["VIEW", "CREATE", "EDIT", "DELETE", "PUBLISH"]);
  });

  it("gives content managers and admins everything, SEO and viewers view only, sales nothing", () => {
    const all = MODULE_ACTIONS.POPUPS.map((action) => permissionKey("POPUPS", action)).sort();
    expect(popupKeys("SUPER_ADMIN")).toBe("ALL");
    expect(popupKeys("ADMIN")).toEqual(all);
    expect(popupKeys("CONTENT_MANAGER")).toEqual(all);
    expect(popupKeys("SEO_MANAGER")).toEqual(["POPUPS:VIEW"]);
    expect(popupKeys("VIEWER")).toEqual(["POPUPS:VIEW"]);
    expect(popupKeys("SALES_MANAGER")).toEqual([]);
    expect(popupKeys("SALES_EXECUTIVE")).toEqual([]);
  });

  it("the data migration grants exactly what the catalogue says", () => {
    const dir = readdirSync(join(root, "prisma/migrations")).find((name) => name.endsWith("_popup_permissions"));
    expect(dir).toBeDefined();
    const sql = read(`prisma/migrations/${dir}/migration.sql`);
    expect(sql).toContain("'VIEW'), ('CREATE'), ('EDIT'), ('DELETE'), ('PUBLISH')");
    expect(sql).toContain("r.\"key\" IN ('SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER')");
    expect(sql).toContain("r.\"key\" IN ('SEO_MANAGER', 'VIEWER') AND p.\"action\" = 'VIEW'");
    expect(sql).not.toMatch(/SALES/);
    expect(sql).not.toMatch(/\bDELETE FROM\b|\bDROP\b|\bTRUNCATE\b/i);
    // The enum value is added in an earlier migration, not this one.
    expect(sql).not.toMatch(/ALTER TYPE/);
  });
});

describe("admin stylesheet", () => {
  const css = read("src/app/(admin)/admin/admin-ui.css");
  const selectors = css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "")
    // At-rule preludes (@media, @supports) are conditions, not selectors.
    .replace(/@[a-z-]+[^{;]*\{/g, "{")
    .match(/[^{}@;]+(?=\{)/g)
    ?.map((selector) => selector.trim())
    .filter((selector) => selector && !selector.startsWith("@") && !selector.startsWith("from") && !selector.startsWith("to")) ?? [];

  /** Splits a selector list at its own commas, not those inside :is(…). */
  const topLevel = (group: string) => {
    const parts: string[] = [];
    let depth = 0;
    let current = "";
    for (const char of group) {
      if (char === "(") depth += 1;
      if (char === ")") depth -= 1;
      if (char === "," && depth === 0) {
        parts.push(current);
        current = "";
      } else current += char;
    }
    return [...parts, current];
  };

  it("scopes every rule to the admin", () => {
    expect(selectors.length).toBeGreaterThan(40);
    for (const group of selectors) {
      for (const selector of topLevel(group)) {
        expect(selector, `unscoped selector: ${selector}`).toContain(".admin-ui");
      }
    }
  });

  it("has fallbacks for no backdrop filter and reduced transparency", () => {
    expect(css).toContain("@supports not (backdrop-filter: blur(1px))");
    expect(css).toContain("@media (prefers-reduced-transparency: reduce)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("is imported by the admin layout only", () => {
    expect(read("src/app/(admin)/admin/layout.tsx")).toContain('import "./admin-ui.css"');
    expect(read("src/app/layout.tsx")).not.toContain("admin-ui");
    expect(read("src/app/globals.css")).not.toContain("admin-ui");
    expect(read("src/app/(site)/layout.tsx")).not.toContain("admin-ui");
  });

  it("does not duplicate backdrop-filter with a webkit copy (the build would drop the standard one)", () => {
    expect(css).not.toContain("-webkit-backdrop-filter");
  });
});

describe("theme", () => {
  it("resolves the system preference", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
  });

  it("the pre-paint script only ever writes light or dark and survives broken storage", () => {
    const attributes: Record<string, string> = {};
    const run = (stored: string | null, prefersDark: boolean, storageThrows = false) => {
      const localStorage = {
        getItem: () => {
          if (storageThrows) throw new Error("denied");
          return stored;
        },
      };
      const document = { documentElement: { setAttribute: (name: string, value: string) => (attributes[name] = value) } };
      const matchMedia = () => ({ matches: prefersDark });
      new Function("localStorage", "document", "matchMedia", ADMIN_THEME_SCRIPT)(localStorage, document, matchMedia);
      return attributes["data-admin-theme"];
    };
    expect(run(null, true)).toBe("dark");
    expect(run("light", true)).toBe("light");
    expect(run("dark", false)).toBe("dark");
    expect(run("<script>", false)).toBe("light");
    delete attributes["data-admin-theme"];
    expect(run("dark", false, true)).toBeUndefined();
  });
});

describe("unsaved-changes tracker", () => {
  class FakeElement {
    constructor(
      private readonly attrs: { form?: { method?: string } | null; ignored?: boolean; type?: string; name?: string },
    ) {}
    closest(selector: string) {
      if (selector === "form") return this.attrs.form ? { getAttribute: () => this.attrs.form?.method ?? null } : null;
      return this.attrs.ignored ? {} : null;
    }
  }

  beforeEach(() => {
    vi.stubGlobal("HTMLElement", FakeElement);
    vi.stubGlobal("HTMLInputElement", class {});
  });

  const main = { contains: () => true } as unknown as HTMLElement;

  it("counts edits inside an editing form only", () => {
    expect(isEditTarget(new FakeElement({ form: {} }) as never, main)).toBe(true);
    expect(isEditTarget(new FakeElement({ form: null }) as never, main)).toBe(false);
    expect(isEditTarget(new FakeElement({ form: { method: "get" } }) as never, main)).toBe(false);
    expect(isEditTarget(new FakeElement({ form: {}, ignored: true }) as never, main)).toBe(false);
  });
});

describe("search helpers", () => {
  it("caps and tidies the query", () => {
    expect(normaliseQuery("  a   b  ")).toBe("a b");
    expect(normaliseQuery("x".repeat(500))).toHaveLength(SEARCH_MAX_QUERY);
    expect(normaliseQuery(42)).toBe("");
  });

  it("keeps groups in a fixed order", () => {
    const hits = sortHits([
      { id: "1", type: "Staff", title: "", subtitle: null, href: "" },
      { id: "2", type: "Lead", title: "", subtitle: null, href: "" },
      { id: "3", type: "Popup", title: "", subtitle: null, href: "" },
    ]);
    expect(hits.map((hit) => hit.type)).toEqual(["Lead", "Popup", "Staff"]);
  });
});

describe("popover placement", () => {
  const viewport = { width: 390, height: 800 };
  it("opens below when there is room, above when there is more room there", () => {
    expect(placePopover({ top: 100, bottom: 140, left: 20, right: 200 }, { width: 280, height: 300 }, viewport, "start").placement).toBe("below");
    expect(placePopover({ top: 700, bottom: 740, left: 20, right: 200 }, { width: 280, height: 300 }, viewport, "start").placement).toBe("above");
  });

  it("stays inside the viewport horizontally", () => {
    const position = placePopover({ top: 100, bottom: 140, left: 300, right: 380 }, { width: 280, height: 200 }, viewport, "start");
    expect(position.left + 280).toBeLessThanOrEqual(viewport.width - 8);
    expect(placePopover({ top: 100, bottom: 140, left: 2, right: 40 }, { width: 280, height: 200 }, viewport, "end").left).toBe(8);
  });
});

describe("demo popup", () => {
  const seeder = read("scripts/seed-demo.ts");

  it("is created switched off and never switched on", () => {
    const create = seeder.slice(seeder.indexOf("prisma.popup.create"), seeder.indexOf("manifest.popups.push"));
    expect(create).toContain("active: false");
    expect(seeder).not.toMatch(/popup\.update[\s\S]{0,200}active:\s*true/);
  });

  it("is removed by id from the manifest only, never by name or pattern", () => {
    expect(seeder).toContain("prisma.popup.deleteMany({ where: { id: { in: manifest.popups ?? [] } } })");
  });
});
