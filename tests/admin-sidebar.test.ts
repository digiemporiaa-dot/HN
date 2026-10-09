import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { ADMIN_NAV, activeNavEntry, locateRoute, moduleIcon, type VisibleNav } from "@/components/admin/navigation";
import { FLYOUT_EDGE, placeFlyout } from "@/components/admin/sidebar-flyout";
import { MODULES } from "@/lib/permissions/registry";

const visible: VisibleNav = ADMIN_NAV.map((group) => ({
  key: group.key,
  label: group.label,
  nested: group.nested,
  items: group.items.map((item) => ({ label: item.label, href: item.href, available: true })),
}));

describe("sidebar modules come from the registry", () => {
  it("has one module per registry module, with its icon, in order", () => {
    expect(ADMIN_NAV.map((group) => group.key)).toEqual(MODULES.map((definition) => definition.key));
    for (const definition of MODULES) expect(moduleIcon(definition.key)).toBe(definition.icon);
  });

  it("makes a dropdown only of modules with several entries", () => {
    const nested = Object.fromEntries(ADMIN_NAV.map((group) => [group.key, group.nested]));
    expect(nested.overview).toBe(false);
    expect(nested.sales).toBe(true);
    expect(nested.catalogue).toBe(true);
    for (const group of ADMIN_NAV) expect(group.nested).toBe(group.items.length > 1);
  });

  it("keeps the sidebar free of its own module list", () => {
    const source = readFileSync(join(__dirname, "../src/components/admin/admin-sidebar.tsx"), "utf8");
    expect(source).not.toMatch(/"\/admin\/(products|leads|pages|staff)"/);
  });

  it("sends only what the server filtered: hidden entries never reach the menu", () => {
    const shell = readFileSync(join(__dirname, "../src/components/admin/admin-shell.tsx"), "utf8");
    expect(shell).toContain('item.visibleWith.some((module) => can(module, "VIEW"))');
    expect(shell).toContain(".filter((group) => group.items.length > 0)");
  });
});

describe("the active module and entry", () => {
  it("finds the entry and its module from any page below it", () => {
    expect(activeNavEntry("/admin/products/abc/edit", visible)).toMatchObject({ groupKey: "catalogue", item: { href: "/admin/products" } });
    expect(activeNavEntry("/admin/rfqs/xyz", visible)).toMatchObject({ groupKey: "sales", item: { href: "/admin/rfqs" } });
    expect(activeNavEntry("/admin", visible)).toMatchObject({ groupKey: "overview" });
    expect(activeNavEntry("/admin/profile", visible)).toBeNull();
  });

  it("prefers the longest match and never confuses neighbours", () => {
    expect(activeNavEntry("/admin/subcategories", visible)?.item.href).toBe("/admin/subcategories");
    expect(activeNavEntry("/admin/popups", visible)?.item.href).toBe("/admin/popups");
    expect(activeNavEntry("/admin/cta-popups/new", visible)?.item.href).toBe("/admin/cta-popups");
  });

  it("still drives the breadcrumbs", () => {
    expect(locateRoute("/admin/leads/1", visible)).toMatchObject({ group: "Sales", item: { label: "Leads", href: "/admin/leads" }, leaf: "Details" });
  });
});

describe("placing a floating submenu", () => {
  it("sits beside the rail, level with its icon", () => {
    expect(placeFlyout({ triggerTop: 200, railRight: 88, menuHeight: 240, viewportHeight: 900 })).toEqual({ top: 194, left: 88, maxHeight: 900 - FLYOUT_EDGE * 2 });
  });

  it("moves up to stay on screen", () => {
    const { top } = placeFlyout({ triggerTop: 800, railRight: 88, menuHeight: 300, viewportHeight: 900 });
    expect(top).toBe(900 - FLYOUT_EDGE - 300);
  });

  it("never exceeds the window, and scrolls instead", () => {
    const placed = placeFlyout({ triggerTop: 500, railRight: 88, menuHeight: 2000, viewportHeight: 600 });
    expect(placed.top).toBe(FLYOUT_EDGE);
    expect(placed.maxHeight).toBe(600 - FLYOUT_EDGE * 2);
  });
});
