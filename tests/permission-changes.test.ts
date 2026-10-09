import { describe, expect, it } from "vitest";

import { planOverrideChange, planRoleChange, type Actor, type StoredPair } from "@/server/permissions/changes";
import { groupState, selectionDiff, setGroup, toggleAction } from "@/lib/permissions/selection";

const SUPER: Actor = { isSuperAdmin: true, permissions: new Set(["*"]) };
const limited = (...keys: string[]): Actor => ({ isSuperAdmin: false, permissions: new Set(keys) });
const pair = (key: string) => {
  const [module, action] = key.split(":");
  return { module, action } as StoredPair;
};

describe("saving a role", () => {
  it("refuses unknown, malformed and retired identifiers by name", () => {
    for (const bad of ["PRODUCTS:VIEW", "catalogue.products:fly", "sales.leads:create", "x"]) {
      const plan = planRoleChange({ current: [], submitted: [bad], actor: SUPER });
      expect(plan.ok, bad).toBe(false);
      if (!plan.ok) expect(plan.error).toContain("Unknown or unsupported");
    }
  });

  it("requires View for any other action on the same resource", () => {
    const plan = planRoleChange({ current: [], submitted: ["catalogue.products:delete"], actor: SUPER });
    expect(plan).toMatchObject({ ok: false });
    if (!plan.ok) expect(plan.error).toContain("Products: Delete");
  });

  it("computes what is granted and revoked, and drops retired pairs", () => {
    const plan = planRoleChange({
      current: [pair("PRODUCTS:VIEW"), pair("PRODUCTS:EDIT"), pair("LEADS:CREATE")],
      submitted: ["catalogue.products:view", "catalogue.products:delete", "catalogue.products:view"],
      actor: SUPER,
    });
    expect(plan).toEqual({
      ok: true,
      desired: ["PRODUCTS:VIEW", "PRODUCTS:DELETE"],
      added: ["catalogue.products:delete"],
      removed: ["catalogue.products:edit"],
      retired: ["LEADS:CREATE"],
    });
  });

  it("stops anyone granting a permission they do not hold", () => {
    const plan = planRoleChange({
      current: [],
      submitted: ["system.backups:view", "system.backups:restore"],
      actor: limited("BACKUPS:VIEW", "ROLES:EDIT"),
    });
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.error).toContain("Backups: Restore");
  });

  it("stops anyone removing a permission they do not hold", () => {
    const plan = planRoleChange({
      current: [pair("BACKUPS:VIEW"), pair("BACKUPS:RESTORE")],
      submitted: ["system.backups:view"],
      actor: limited("BACKUPS:VIEW"),
    });
    expect(plan.ok).toBe(false);
  });

  it("lets them leave untouched what they do not hold", () => {
    const plan = planRoleChange({
      current: [pair("BACKUPS:VIEW"), pair("BACKUPS:RESTORE"), pair("PRODUCTS:VIEW")],
      submitted: ["system.backups:view", "system.backups:restore", "catalogue.products:view", "catalogue.products:edit"],
      actor: limited("PRODUCTS:VIEW", "PRODUCTS:EDIT"),
    });
    expect(plan).toMatchObject({ ok: true, added: ["catalogue.products:edit"], removed: [] });
  });

  it("caps the request size", () => {
    const plan = planRoleChange({ current: [], submitted: Array.from({ length: 1000 }, () => "catalogue.products:view"), actor: SUPER });
    expect(plan.ok).toBe(false);
  });
});

describe("saving one person's overrides", () => {
  const role = [pair("PRODUCTS:VIEW"), pair("PRODUCTS:EDIT"), pair("LEADS:VIEW")];

  it("stores only real differences from the role", () => {
    const plan = planOverrideChange({
      role,
      current: [],
      granted: ["catalogue.products:view", "catalogue.products:delete"],
      revoked: ["catalogue.products:edit", "catalogue.brands:view"],
      actor: SUPER,
    });
    expect(plan).toMatchObject({
      ok: true,
      rows: [
        { storageKey: "PRODUCTS:DELETE", effect: "GRANT" },
        { storageKey: "PRODUCTS:EDIT", effect: "REVOKE" },
      ],
    });
  });

  it("refuses contradictions and unknown identifiers", () => {
    expect(planOverrideChange({ role, current: [], granted: ["sales.leads:edit"], revoked: ["sales.leads:edit"], actor: SUPER }).ok).toBe(false);
    expect(planOverrideChange({ role, current: [], granted: ["LEADS:EDIT"], revoked: [], actor: SUPER }).ok).toBe(false);
  });

  it("refuses a result that leaves an action without its View", () => {
    const plan = planOverrideChange({ role, current: [], granted: [], revoked: ["catalogue.products:view"], actor: SUPER });
    expect(plan.ok).toBe(false);
  });

  it("checks the actor against what changes, not what stays", () => {
    const current = [{ ...pair("BACKUPS:RESTORE"), effect: "GRANT" as const }, { ...pair("BACKUPS:VIEW"), effect: "GRANT" as const }];
    // Re-saving an existing grant the actor lacks is fine...
    expect(
      planOverrideChange({
        role,
        current,
        granted: ["system.backups:view", "system.backups:restore", "sales.leads:edit"],
        revoked: [],
        actor: limited("LEADS:EDIT", "LEADS:VIEW"),
      }),
    ).toMatchObject({ ok: true, changed: ["sales.leads:edit"] });
    // ...dropping it is not.
    expect(
      planOverrideChange({ role, current, granted: ["system.backups:view"], revoked: [], actor: limited("BACKUPS:VIEW") }).ok,
    ).toBe(false);
  });

  it("never applies to Super Admin", () => {
    expect(planOverrideChange({ role, current: [], granted: [], revoked: [], actor: SUPER, roleIsSuperAdmin: true }).ok).toBe(false);
  });
});

describe("editor selection rules", () => {
  it("ticks View with any action and clears dependants with View", () => {
    let selected = toggleAction(new Set(), "catalogue.products:delete", true);
    expect([...selected].sort()).toEqual(["catalogue.products:delete", "catalogue.products:view"]);
    selected = toggleAction(selected, "catalogue.products:view", false);
    expect(selected.size).toBe(0);
  });

  it("selects only valid, changeable descendants for a group", () => {
    const ids = ["system.backups:view", "system.backups:restore", "system.backups:export"];
    const locked = new Set(["system.backups:restore"]);
    const selected = setGroup(new Set(), [...ids, "bogus:view"], true, locked);
    expect([...selected].sort()).toEqual(["system.backups:export", "system.backups:view"]);
    expect(groupState(selected, ids)).toBe("some");
  });

  it("keeps View when clearing would orphan a locked action", () => {
    const locked = new Set(["system.backups:restore"]);
    const start = new Set(["system.backups:view", "system.backups:restore", "system.backups:export"]);
    const cleared = setGroup(start, [...start], false, locked);
    expect([...cleared].sort()).toEqual(["system.backups:restore", "system.backups:view"]);
    expect(toggleAction(start, "system.backups:view", false, locked).has("system.backups:view")).toBe(true);
  });

  it("reports the difference from the saved state", () => {
    const diff = selectionDiff(new Set(["catalogue.products:view"]), new Set(["catalogue.brands:view"]));
    expect(diff).toEqual({ granted: ["catalogue.brands:view"], revoked: ["catalogue.products:view"] });
    expect(groupState(new Set(), [])).toBe("none");
  });
});
