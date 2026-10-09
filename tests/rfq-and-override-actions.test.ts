import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * RFQs are leads with source RFQ: working one needs the RFQ permission as
 * well as the Leads one. And staff overrides are saved through the same
 * registry checks as roles.
 */

const granted = new Set<string>();
const actor = { id: "a1", email: "a@hn.test", name: "A", roleKey: "SALES_EXECUTIVE" };
const db = {
  lead: { findFirst: vi.fn(), update: vi.fn(), findMany: vi.fn(async () => []), updateMany: vi.fn() },
  staff: { findUnique: vi.fn(), findFirst: vi.fn() },
  rolePermission: { findMany: vi.fn(async () => []) },
  staffPermissionOverride: { findMany: vi.fn(async () => []), deleteMany: vi.fn(), createMany: vi.fn() },
  permission: { createMany: vi.fn(), findMany: vi.fn(async () => [{ id: "pid", module: "PRODUCTS", action: "DELETE" }]) },
  $transaction: vi.fn(async (fn: (client: unknown) => unknown) => fn(db)),
};

vi.mock("@/server/db", () => ({ prisma: db }));
vi.mock("@/server/permissions", () => ({
  requirePermission: vi.fn(async (module: string, action: string) => {
    if (!granted.has(`${module}:${action}`)) throw new Error(`DENIED:${module}:${action}`);
    return actor;
  }),
  hasPermission: vi.fn(async (module: string, action: string) => granted.has(`${module}:${action}`)),
  getEffectivePermissions: vi.fn(async () => new Set(granted)),
  currentPermissions: vi.fn(),
}));
vi.mock("@/server/audit/log", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("@/server/leads/activity", () => ({ recordLeadActivity: vi.fn() }));
vi.mock("@/server/leads/throttle", () => ({ checkEnquiryRate: vi.fn(), checkFormTiming: vi.fn(), RATE_LIMIT_WINDOW_MINUTES: 10 }));
vi.mock("@/server/leads/service", () => ({ createLeadWithReference: vi.fn(), readLeadContext: vi.fn(), requestContext: vi.fn(), issueDocumentGrant: vi.fn() }));
vi.mock("@/server/mail/send", () => ({ sendMail: vi.fn() }));
vi.mock("@/server/mail/templates", () => ({ leadNotification: vi.fn(), assignmentNotification: vi.fn() }));
vi.mock("@/server/auth/password", () => ({ hashPassword: vi.fn() }));
vi.mock("@/server/auth/two-factor", () => ({ disableTwoFactor: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

const leads = await import("@/server/leads/actions");
const staff = await import("@/server/staff/actions");

const form = (fields: Record<string, string | string[]>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
};

beforeEach(() => {
  vi.clearAllMocks();
  granted.clear();
  actor.roleKey = "SALES_EXECUTIVE";
});

describe("RFQ permissions on lead actions", () => {
  it("deleting an RFQ needs RFQ Delete as well as Leads Delete", async () => {
    granted.add("LEADS:DELETE");
    db.lead.findFirst.mockResolvedValue({ id: "l1", reference: "HN-1", source: "RFQ" });
    await expect(leads.deleteLeadAction(form({ leadId: "l1" }))).rejects.toThrow("DENIED:RFQ:DELETE");
    expect(db.lead.update).not.toHaveBeenCalled();
  });

  it("deleting an ordinary enquiry needs only Leads Delete", async () => {
    granted.add("LEADS:DELETE");
    db.lead.findFirst.mockResolvedValue({ id: "l1", reference: "HN-1", source: "CONTACT" });
    await expect(leads.deleteLeadAction(form({ leadId: "l1" }))).rejects.toThrow("REDIRECT:/admin/leads");
    expect(db.lead.update).toHaveBeenCalled();
  });

  it("adding a note to an RFQ needs RFQ Edit", async () => {
    granted.add("LEADS:EDIT");
    db.lead.findFirst.mockResolvedValue({ id: "l1", reference: "HN-1", source: "RFQ" });
    await expect(leads.addLeadNoteAction({}, form({ leadId: "l1", body: "Called the hospital" }))).rejects.toThrow("DENIED:RFQ:EDIT");
  });

  it("leaves RFQs out of a bulk reassignment by someone who cannot edit them", async () => {
    granted.add("LEADS:ASSIGN");
    await leads.bulkAssignLeadsAction(form({ ids: ["l1", "l2"], bulkAction: "mine" }));
    expect(db.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ source: { not: "RFQ" } }) }),
    );
  });
});

describe("staff override action", () => {
  const target = { id: "t1", email: "t@hn.test", role: { key: "CONTENT_MANAGER" } };

  it("refuses identifiers outside the registry", async () => {
    granted.add("STAFF:EDIT");
    db.staff.findUnique.mockResolvedValue(target);
    const result = await staff.updateStaffOverridesAction({}, form({ staffId: "t1", granted: ["PRODUCTS:DELETE"] }));
    expect(result.error).toContain("Unknown or unsupported");
    expect(db.staffPermissionOverride.deleteMany).not.toHaveBeenCalled();
  });

  it("refuses granting what the actor does not hold", async () => {
    granted.add("STAFF:EDIT");
    db.staff.findUnique.mockResolvedValue(target);
    db.rolePermission.findMany.mockResolvedValue([{ permission: { module: "PRODUCTS", action: "VIEW" } }] as never);
    const result = await staff.updateStaffOverridesAction({}, form({ staffId: "t1", granted: ["catalogue.products:delete"] }));
    expect(result.error).toContain("hold yourself");
  });

  it("refuses overrides on a Super Admin account", async () => {
    actor.roleKey = "SUPER_ADMIN";
    granted.add("STAFF:EDIT");
    db.staff.findUnique.mockResolvedValue({ ...target, role: { key: "SUPER_ADMIN" } });
    const result = await staff.updateStaffOverridesAction({}, form({ staffId: "t1" }));
    expect(result.error).toContain("Super Admin");
  });

  it("saves a permitted override in one transaction", async () => {
    granted.add("STAFF:EDIT");
    granted.add("PRODUCTS:DELETE");
    db.staff.findUnique.mockResolvedValue(target);
    db.rolePermission.findMany.mockResolvedValue([{ permission: { module: "PRODUCTS", action: "VIEW" } }] as never);
    const result = await staff.updateStaffOverridesAction({}, form({ staffId: "t1", granted: ["catalogue.products:delete"] }));
    expect(result.success).toBeDefined();
    expect(db.staffPermissionOverride.createMany).toHaveBeenCalledWith({
      data: [{ staffId: "t1", permissionId: "pid", effect: "GRANT" }],
    });
  });
});
