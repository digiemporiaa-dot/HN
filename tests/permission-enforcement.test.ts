import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Server-side enforcement with the database mocked: effective permission
 * resolution, the role save action, and the RFQ rules on lead actions.
 */

type Pair = { module: string; action: string };
const state = {
  staff: null as null | {
    role: { key: string; permissions: Array<{ permission: Pair }> };
    permissionOverrides: Array<{ effect: "GRANT" | "REVOKE"; permission: Pair }>;
  },
};
const tx = {
  role: { updateMany: vi.fn(async () => ({ count: 1 })) },
  permission: { createMany: vi.fn(), findMany: vi.fn(async () => [{ id: "p1" }, { id: "p2" }]) },
  rolePermission: { deleteMany: vi.fn(), createMany: vi.fn() },
};
const db = {
  staff: { findUnique: vi.fn(async () => state.staff) },
  role: { findUnique: vi.fn() },
  lead: { findFirst: vi.fn(), update: vi.fn(), findMany: vi.fn(async () => []) },
  $transaction: vi.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
};
const actor = { id: "a1", email: "a@hn.test", name: "A", roleKey: "ADMIN" };

vi.mock("@/server/db", () => ({ prisma: db }));
vi.mock("@/server/auth/guards", () => ({ requireStaff: vi.fn(async () => actor), getCurrentStaff: vi.fn(async () => actor) }));
vi.mock("@/server/auth/two-factor", () => ({ isTwoFactorEnabled: vi.fn(async () => true) }));
vi.mock("@/server/settings/service", () => ({ getSetting: vi.fn(async () => "off") }));
vi.mock("@/server/audit/log", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

const permissions = await import("@/server/permissions");
const { updateRolePermissionsAction } = await import("@/server/roles/actions");
const { recordAuditEvent } = await import("@/server/audit/log");
const { revalidatePath } = await import("next/cache");

const grants = (...keys: string[]) =>
  keys.map((key) => {
    const [module, action] = key.split(":");
    return { permission: { module, action } };
  });

beforeEach(() => {
  vi.clearAllMocks();
  actor.roleKey = "ADMIN";
  state.staff = { role: { key: "ADMIN", permissions: [] }, permissionOverrides: [] };
});

describe("effective permissions", () => {
  it("adds GRANT overrides, and REVOKE wins over the role", async () => {
    state.staff = {
      role: { key: "CONTENT_MANAGER", permissions: grants("PRODUCTS:VIEW", "PRODUCTS:EDIT", "PAGES:VIEW") },
      permissionOverrides: [
        { effect: "REVOKE", permission: { module: "PRODUCTS", action: "EDIT" } },
        { effect: "GRANT", permission: { module: "PRODUCTS", action: "DELETE" } },
      ],
    };
    const effective = await permissions.getEffectivePermissions("s1");
    expect([...effective].sort()).toEqual(["PAGES:VIEW", "PRODUCTS:DELETE", "PRODUCTS:VIEW"]);
  });

  it("ignores retired or unknown pairs: they grant nothing", async () => {
    state.staff = {
      role: { key: "SALES_EXECUTIVE", permissions: grants("LEADS:VIEW", "LEADS:CREATE", "ROLES:DELETE") },
      permissionOverrides: [{ effect: "GRANT", permission: { module: "PRODUCTS", action: "EXPORT" } }],
    };
    expect([...(await permissions.getEffectivePermissions("s1"))]).toEqual(["LEADS:VIEW"]);
  });

  it("gives Super Admin everything, independent of seeded rows", async () => {
    state.staff = { role: { key: "SUPER_ADMIN", permissions: [] }, permissionOverrides: [] };
    expect([...(await permissions.getEffectivePermissions("s1"))]).toEqual(["*"]);
  });

  it("reads the database on every request, so changes apply without signing out", async () => {
    state.staff = { role: { key: "VIEWER", permissions: grants("LEADS:VIEW") }, permissionOverrides: [] };
    expect((await permissions.getEffectivePermissions("s1")).has("LEADS:VIEW")).toBe(true);
    state.staff = { role: { key: "VIEWER", permissions: [] }, permissionOverrides: [] };
    expect((await permissions.getEffectivePermissions("s1")).has("LEADS:VIEW")).toBe(false);
  });

  it("does not let a parent imply a child", async () => {
    state.staff = { role: { key: "X", permissions: grants("SEO:VIEW", "SEO:EDIT") }, permissionOverrides: [] };
    await expect(permissions.requirePermission("SEO_REDIRECTS", "VIEW")).rejects.toThrow("REDIRECT:/access-denied");
    await expect(permissions.requirePermission("SEO", "EDIT")).resolves.toBe(actor);
  });

  it("lets a combined screen in on any one of its resources", async () => {
    state.staff = { role: { key: "X", permissions: grants("SEO_INDEXATION:VIEW") }, permissionOverrides: [] };
    await expect(permissions.requireAnyPermission([["SEO", "VIEW"], ["SEO_INDEXATION", "VIEW"]])).resolves.toBe(actor);
    state.staff = { role: { key: "X", permissions: grants("PAGES:VIEW") }, permissionOverrides: [] };
    await expect(permissions.requireAnyPermission([["SEO", "VIEW"], ["SEO_INDEXATION", "VIEW"]])).rejects.toThrow("REDIRECT:/access-denied");
  });
});

describe("updateRolePermissionsAction", () => {
  const VERSION = "2026-10-09T10:00:00.000Z";
  const submit = (permissionsList: string[], extra: Record<string, string> = {}) => {
    const data = new FormData();
    data.set("roleId", "r1");
    data.set("version", VERSION);
    for (const key of permissionsList) data.append("permissions", key);
    for (const [key, value] of Object.entries(extra)) data.set(key, value);
    return data;
  };
  const role = (key = "CONTENT_MANAGER", held = grants("PRODUCTS:VIEW")) => ({
    id: "r1",
    key,
    name: "Content Manager",
    updatedAt: new Date(VERSION),
    permissions: held,
  });

  it("is refused without ROLES:EDIT, before reading anything", async () => {
    state.staff = { role: { key: "ADMIN", permissions: grants("ROLES:VIEW") }, permissionOverrides: [] };
    await expect(updateRolePermissionsAction({}, submit([]))).rejects.toThrow("REDIRECT:/access-denied");
    expect(db.role.findUnique).not.toHaveBeenCalled();
  });

  it("never modifies Super Admin", async () => {
    actor.roleKey = "SUPER_ADMIN";
    state.staff = { role: { key: "SUPER_ADMIN", permissions: [] }, permissionOverrides: [] };
    db.role.findUnique.mockResolvedValue(role("SUPER_ADMIN"));
    expect(await updateRolePermissionsAction({}, submit([]))).toEqual({ error: "The Super Admin role cannot be modified." });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("refuses unknown keys and escalation without writing", async () => {
    state.staff = { role: { key: "ADMIN", permissions: grants("ROLES:VIEW", "ROLES:EDIT", "PRODUCTS:VIEW") }, permissionOverrides: [] };
    db.role.findUnique.mockResolvedValue(role());
    expect((await updateRolePermissionsAction({}, submit(["catalogue.products:view", "PRODUCTS:EDIT"]))).error).toContain("Unknown");
    expect((await updateRolePermissionsAction({}, submit(["catalogue.products:view", "system.backups:view"]))).error).toContain("hold yourself");
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("refuses a stale editor instead of overwriting another save", async () => {
    actor.roleKey = "SUPER_ADMIN";
    state.staff = { role: { key: "SUPER_ADMIN", permissions: [] }, permissionOverrides: [] };
    db.role.findUnique.mockResolvedValue(role());
    tx.role.updateMany.mockResolvedValueOnce({ count: 0 });
    const result = await updateRolePermissionsAction({}, submit(["catalogue.products:view", "catalogue.products:edit"]));
    expect(result.error).toContain("Someone else saved");
    expect(tx.rolePermission.deleteMany).not.toHaveBeenCalled();
  });

  it("saves atomically, audits the difference and refreshes the admin", async () => {
    actor.roleKey = "SUPER_ADMIN";
    state.staff = { role: { key: "SUPER_ADMIN", permissions: [] }, permissionOverrides: [] };
    db.role.findUnique.mockResolvedValue(role("CONTENT_MANAGER", grants("PRODUCTS:VIEW", "LEADS:CREATE")));
    const result = await updateRolePermissionsAction({}, submit(["catalogue.products:view", "catalogue.products:edit"]));
    expect(result.success).toContain("1 granted, 0 revoked");
    expect(tx.role.updateMany).toHaveBeenCalledWith({ where: { id: "r1", updatedAt: new Date(VERSION) }, data: { updatedAt: expect.any(Date) } });
    expect(tx.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: "r1", permissionId: { notIn: ["p1", "p2"] } } });
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ROLE_PERMISSIONS_CHANGED",
        metadata: expect.objectContaining({ granted: ["catalogue.products:edit"], revoked: [], retiredDropped: ["LEADS:CREATE"] }),
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/admin", "layout");
  });
});
