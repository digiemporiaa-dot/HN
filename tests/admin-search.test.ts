import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The admin search checks each category against the signed-in staff
 * member's permissions on the server. A category they cannot view is never
 * queried, so nothing about it — not even a count — can leak.
 */

const granted = new Set<string>();
const models = ["lead", "product", "category", "brand", "specialty", "solution", "application", "page", "blogPost", "city", "form", "popup", "mediaAsset", "staff"] as const;
const db = Object.fromEntries(models.map((model) => [model, { findMany: vi.fn(async () => []) }])) as Record<
  (typeof models)[number],
  { findMany: ReturnType<typeof vi.fn> }
>;

vi.mock("@/server/db", () => ({ prisma: db }));
vi.mock("@/server/permissions", () => ({
  currentPermissions: vi.fn(async () => ({
    staff: { id: "s1" },
    can: (module: string, action: string) => granted.has(`${module}:${action}`),
  })),
}));

const { adminSearch } = await import("@/server/admin-search");

beforeEach(() => {
  granted.clear();
  vi.clearAllMocks();
});

describe("adminSearch", () => {
  it("queries nothing for a query under two characters", async () => {
    granted.add("PRODUCTS:VIEW");
    expect(await adminSearch("a")).toEqual([]);
    expect(db.product.findMany).not.toHaveBeenCalled();
  });

  it("only queries the categories the staff member may view", async () => {
    granted.add("PRODUCTS:VIEW");
    granted.add("POPUPS:VIEW");
    db.product.findMany.mockResolvedValue([{ id: "p1", name: "Ventilator", modelNumber: "V-1", status: "PUBLISHED" }]);
    const hits = await adminSearch("vent");
    expect(hits).toEqual([{ id: "p1", type: "Product", title: "Ventilator", subtitle: "V-1 · Published", href: "/admin/products/p1" }]);
    expect(db.popup.findMany).toHaveBeenCalled();
    for (const model of ["lead", "staff", "mediaAsset", "form", "page", "city"] as const) {
      expect(db[model].findMany).not.toHaveBeenCalled();
    }
  });

  it("selects only the fields a result row shows", async () => {
    granted.add("STAFF:VIEW");
    await adminSearch("asha");
    const args = db.staff.findMany.mock.calls[0][0];
    expect(args.select).toEqual({ id: true, name: true, email: true });
    expect(args.take).toBe(5);
  });

  it("separates RFQs from other leads by permission", async () => {
    granted.add("RFQ:VIEW");
    await adminSearch("hospital");
    expect(db.lead.findMany).toHaveBeenCalledTimes(1);
    expect(db.lead.findMany.mock.calls[0][0].where.source).toBe("RFQ");
  });
});
