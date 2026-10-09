import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The server side of the popups and quotations, with the database mocked:
 * a download is released only after a lead is stored, nothing the browser says
 * about files, prices, staff or permissions is trusted, and the admin actions
 * are guarded and cannot be pointed at records outside their module.
 */

const granted = new Set<string>();
const actor = { id: "staff0001", email: "s@hn.test", name: "Staff", roleKey: "SALES_MANAGER" };

const db = {
  product: { findFirst: vi.fn() },
  productDocument: { findFirst: vi.fn() },
  documentGrant: { findFirst: vi.fn() },
  lead: { findFirst: vi.fn(), update: vi.fn() },
  staff: { findFirst: vi.fn() },
  quoteRequest: { upsert: vi.fn() },
  leadActivity: { create: vi.fn() },
  leadNote: { create: vi.fn() },
  ctaConfig: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  mediaAsset: { findFirst: vi.fn() },
  form: { findFirst: vi.fn() },
  $transaction: vi.fn(async (arg: unknown) => (typeof arg === "function" ? (arg as (tx: unknown) => unknown)(db) : Promise.all(arg as unknown[]))),
};

const serverCta = {
  value: {} as Record<string, unknown>,
};

vi.mock("@/server/db", () => ({ prisma: db }));
vi.mock("@/server/permissions", () => ({
  requirePermission: vi.fn(async (module: string, action: string) => {
    if (!granted.has(`${module}:${action}`)) throw new Error(`DENIED:${module}:${action}`);
    return actor;
  }),
}));
vi.mock("@/server/audit/log", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("@/server/leads/activity", () => ({ recordLeadActivity: vi.fn() }));
vi.mock("@/server/leads/notify", () => ({ notifyAssignee: vi.fn() }));
vi.mock("@/server/mail/templates", () => ({ leadNotification: vi.fn(() => ({ subject: "s", text: "t", html: "h" })) }));
vi.mock("@/server/leads/service", () => ({
  GRANT_TTL_DAYS: 14,
  newGrantToken: vi.fn(() => "grant-token-123456789012345678901234"),
  readLeadContext: vi.fn(() => ({ landingPage: "/products/ventilator" })),
  readSubmissionKey: vi.fn((data: FormData) => String(data.get("submissionKey") ?? "") || null),
  storeLead: vi.fn(async () => ({ id: "lead0001", reference: "HN-2026-0042", replayed: false })),
}));
vi.mock("@/server/cta/intake", () => ({
  screenSubmission: vi.fn(async () => ({ ok: true, context: { ipAddress: "203.0.113.9", userAgent: "test" } })),
  pathFromLanding: vi.fn(() => "/products/ventilator"),
  sendCustomerConfirmation: vi.fn(),
  sendTeamNotification: vi.fn(),
}));
vi.mock("@/server/cta/service", () => ({ resolveServerCta: vi.fn(async () => serverCta.value) }));
vi.mock("@/server/products/public", () => ({
  quoteLineProducts: vi.fn(async (ids: string[]) =>
    ids
      .filter((id) => id !== "withdrawn")
      .map((id) => ({ id, name: `Product ${id}`, slug: id, modelNumber: `M-${id}`, categoryName: "ICU", brandName: null, image: null })),
  ),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

const { builtInCta } = await import("@/lib/cta/effective");
const { submitCtaLeadAction } = await import("@/server/cta/actions");
const { submitQuotationAction } = await import("@/server/quotes/actions");
const quoteAdmin = await import("@/server/quotes/admin-actions");
const ctaAdmin = await import("@/server/cta/admin-actions");
const leadService = await import("@/server/leads/service");
const intake = await import("@/server/cta/intake");
const { recordAuditEvent } = await import("@/server/audit/log");

const storeLead = vi.mocked(leadService.storeLead);

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

const person = { name: "Dr Asha Rao", email: "asha@hospital.in", consent: "on", submissionKey: "abcdefghijklmnop1234" };

beforeEach(() => {
  vi.clearAllMocks();
  granted.clear();
  serverCta.value = { ...builtInCta("DOWNLOAD_BROCHURE"), file: null, formId: null };
  db.product.findFirst.mockResolvedValue({ id: "prod0001", name: "Ventilator", modelNumber: "V-1" });
  db.productDocument.findFirst.mockResolvedValue({ id: "doc00001", title: "Ventilator brochure" });
  storeLead.mockResolvedValue({ id: "lead0001", reference: "HN-2026-0042", replayed: false });
});

describe("gated brochure download", () => {
  const brochure = (extra: Record<string, string> = {}) =>
    form({ kind: "DOWNLOAD_BROCHURE", placement: "product.documents.download", productId: "prod0001", documentId: "doc00001", ...person, ...extra });

  it("stores the lead with its grant in one write, then returns the download address", async () => {
    const result = await submitCtaLeadAction({}, brochure());
    expect(result).toMatchObject({ reference: "HN-2026-0042", downloadUrl: "/api/documents/grant-token-123456789012345678901234" });
    const stored = storeLead.mock.calls[0][0] as Record<string, unknown>;
    expect(stored).toMatchObject({
      source: "DOCUMENT_DOWNLOAD",
      productId: "prod0001",
      ctaPlacement: "product.documents.download",
      submissionKey: "abcdefghijklmnop1234",
      consentText: expect.any(String),
      grants: { create: expect.objectContaining({ documentId: "doc00001", mediaId: null }) },
      activities: { create: expect.objectContaining({ kind: "CREATED" }) },
    });
    // The document was looked up against the product the button is on.
    expect(db.productDocument.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: "doc00001", productId: "prod0001" }) }),
    );
  });

  it("releases nothing for an invalid submission", async () => {
    const result = await submitCtaLeadAction({}, brochure({ email: "not-an-email", consent: "" }));
    expect(result.fieldErrors).toMatchObject({ email: expect.any(String), consent: expect.any(String) });
    expect(result.downloadUrl).toBeUndefined();
    expect(storeLead).not.toHaveBeenCalled();
  });

  it("refuses a document that does not belong to the product", async () => {
    db.productDocument.findFirst.mockResolvedValue(null);
    const result = await submitCtaLeadAction({}, brochure({ documentId: "otherdoc1" }));
    expect(result.error).toBeDefined();
    expect(result.downloadUrl).toBeUndefined();
    expect(storeLead).not.toHaveBeenCalled();
  });

  it("refuses a document with no product, and a malformed id", async () => {
    expect((await submitCtaLeadAction({}, brochure({ productId: "" }))).error).toBeDefined();
    expect((await submitCtaLeadAction({}, brochure({ documentId: "../../etc/passwd" }))).error).toBeDefined();
    expect(storeLead).not.toHaveBeenCalled();
  });

  it("releases nothing if the lead cannot be stored", async () => {
    storeLead.mockResolvedValue(null);
    const result = await submitCtaLeadAction({}, brochure());
    expect(result.error).toBeDefined();
    expect(result.downloadUrl).toBeUndefined();
  });

  it("answers an automated submission with silence and no file", async () => {
    vi.mocked(intake.screenSubmission).mockResolvedValueOnce({ ok: false, silent: true });
    const result = await submitCtaLeadAction({}, brochure());
    expect(result).toEqual({ reference: "" });
    expect(storeLead).not.toHaveBeenCalled();
  });

  it("answers a repeated submission with the first one, writing nothing", async () => {
    storeLead.mockResolvedValue({ id: "lead0001", reference: "HN-2026-0042", replayed: true });
    db.documentGrant.findFirst.mockResolvedValue({ token: "first-token-1234567890123456789" });
    const result = await submitCtaLeadAction({}, brochure());
    expect(result).toMatchObject({ reference: "HN-2026-0042", downloadUrl: "/api/documents/first-token-1234567890123456789" });
    expect(recordAuditEvent).not.toHaveBeenCalled();
    expect(intake.sendCustomerConfirmation).not.toHaveBeenCalled();
  });

  it("hands out the configured catalogue file, never one the browser names", async () => {
    serverCta.value = { ...builtInCta("DOWNLOAD_CATALOGUE"), file: { id: "media0001", storageKey: "docs/cat.pdf" }, formId: null };
    const result = await submitCtaLeadAction({}, form({ kind: "DOWNLOAD_CATALOGUE", fileId: "evilfile1", documentId: "doc00001", ...person }));
    expect(result.downloadUrl).toBeDefined();
    expect((storeLead.mock.calls[0][0] as { grants: { create: unknown } }).grants.create).toMatchObject({ mediaId: "media0001", documentId: null });
  });

  it("refuses a catalogue with no configured file", async () => {
    serverCta.value = { ...builtInCta("DOWNLOAD_CATALOGUE"), file: null, formId: null };
    expect((await submitCtaLeadAction({}, form({ kind: "DOWNLOAD_CATALOGUE", ...person }))).error).toBeDefined();
    expect(storeLead).not.toHaveBeenCalled();
  });

  it("refuses an unknown kind", async () => {
    expect((await submitCtaLeadAction({}, form({ kind: "DELETE_EVERYTHING", ...person }))).error).toBeDefined();
  });
});

describe("quotation request", () => {
  const quote = (lines: unknown, extra: Record<string, string> = {}) =>
    form({ lines: JSON.stringify(lines), placement: "product.hero.quote", ...person, company: "City Hospital", ...extra });

  beforeEach(() => {
    serverCta.value = { ...builtInCta("REQUEST_QUOTATION"), file: null, formId: null };
  });

  it("stores a guest's multi-product request atomically, with items, quotation row and history", async () => {
    const result = await submitQuotationAction(
      {},
      quote(
        [
          { productId: "prod0001", quantity: 2, notes: "With humidifier" },
          { productId: "prod0002", quantity: 5, notes: "" },
          { productId: "prod0001", quantity: 1, notes: "Spare" },
        ],
        { deliveryLocation: "Pune", expectedDate: "2027-06-15", requirements: "Installation included" },
      ),
    );
    expect(result).toEqual({ reference: "HN-2026-0042" });
    expect(storeLead).toHaveBeenCalledTimes(1);
    const stored = storeLead.mock.calls[0][0] as unknown as Record<string, unknown>;
    expect(stored).toMatchObject({
      source: "RFQ",
      organisation: "City Hospital",
      message: "Installation included",
      items: {
        create: [
          { productId: "prod0001", productName: "Product prod0001", modelNumber: "M-prod0001", quantity: 3, notes: "With humidifier; Spare", order: 0 },
          { productId: "prod0002", productName: "Product prod0002", modelNumber: "M-prod0002", quantity: 5, notes: null, order: 1 },
        ],
      },
      quote: { create: { status: "NEW", deliveryLocation: "Pune", expectedDeliveryDate: new Date("2027-06-15T00:00:00Z") } },
    });
    // Nobody is assigned by a visitor.
    expect(stored).not.toHaveProperty("assignedToId");
  });

  it("ignores prices, owners and statuses the browser sends", async () => {
    await submitQuotationAction(
      {},
      quote([{ productId: "prod0001", quantity: 1, notes: "", price: 1, productName: "Free MRI" }], {
        price: "0",
        assignedToId: "staff0001",
        status: "WON",
      }),
    );
    const stored = JSON.stringify(storeLead.mock.calls[0][0]);
    expect(stored).not.toContain("price");
    expect(stored).not.toContain("Free MRI");
    expect(stored).not.toContain("staff0001");
    expect(stored).toContain('"status":"NEW"');
  });

  it("creates nothing for an invalid request", async () => {
    expect((await submitQuotationAction({}, quote([]))).error).toBeDefined();
    expect((await submitQuotationAction({}, quote([{ productId: "prod0001", quantity: 0 }]))).error).toBeDefined();
    expect((await submitQuotationAction({}, form({ lines: "not json", ...person }))).error).toBeDefined();
    expect((await submitQuotationAction({}, quote([{ productId: "prod0001", quantity: 1 }], { email: "x" }))).fieldErrors?.email).toBeDefined();
    expect((await submitQuotationAction({}, quote([{ productId: "withdrawn", quantity: 1 }]))).error).toBeDefined();
    expect(storeLead).not.toHaveBeenCalled();
  });

  it("does not duplicate on a repeated click", async () => {
    storeLead.mockResolvedValue({ id: "lead0001", reference: "HN-2026-0042", replayed: true });
    const result = await submitQuotationAction({}, quote([{ productId: "prod0001", quantity: 1 }]));
    expect(result.reference).toBe("HN-2026-0042");
    expect(intake.sendTeamNotification).not.toHaveBeenCalled();
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  it("notifies the team and confirms to the customer with the reference", async () => {
    await submitQuotationAction({}, quote([{ productId: "prod0001", quantity: 1 }]));
    expect(intake.sendTeamNotification).toHaveBeenCalledWith(expect.objectContaining({ leadId: "lead0001" }));
    expect(intake.sendCustomerConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ to: "asha@hospital.in", reference: "HN-2026-0042", kind: "quotation" }),
    );
  });
});

describe("quotation administration", () => {
  const rfq = { id: "lead0001", reference: "HN-2026-0042", status: "NEW", assignedToId: null, assignedTo: null, quote: { status: "NEW" } };

  it("needs RFQ Edit to change a status, and RFQ Assign to assign", async () => {
    await expect(quoteAdmin.updateQuoteStatusAction({}, form({ leadId: "lead0001", status: "QUOTED" }))).rejects.toThrow("DENIED:RFQ:EDIT");
    granted.add("RFQ:EDIT");
    await expect(quoteAdmin.assignQuoteAction({}, form({ leadId: "lead0001", assignedToId: "staff0002" }))).rejects.toThrow("DENIED:RFQ:ASSIGN");
  });

  it("only ever finds quotation requests: another lead's id is not found", async () => {
    granted.add("RFQ:EDIT");
    db.lead.findFirst.mockResolvedValue(null);
    const result = await quoteAdmin.updateQuoteStatusAction({}, form({ leadId: "contact01", status: "WON" }));
    expect(result.error).toBeDefined();
    expect(db.lead.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ source: "RFQ", deletedAt: null }) }));
    expect(db.quoteRequest.upsert).not.toHaveBeenCalled();
  });

  it("moves the status and the lead stage together, and audits it", async () => {
    granted.add("RFQ:EDIT");
    db.lead.findFirst.mockResolvedValue(rfq);
    const result = await quoteAdmin.updateQuoteStatusAction({}, form({ leadId: "lead0001", status: "QUOTED" }));
    expect(result.success).toBeDefined();
    expect(db.quoteRequest.upsert).toHaveBeenCalled();
    expect(db.lead.update).toHaveBeenCalledWith({ where: { id: "lead0001" }, data: { status: "QUOTATION_SENT" } });
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "QUOTE_STATUS_CHANGED", module: "RFQ" }));
  });

  it("refuses an unknown status and an inactive assignee", async () => {
    granted.add("RFQ:EDIT");
    granted.add("RFQ:ASSIGN");
    db.lead.findFirst.mockResolvedValue(rfq);
    expect((await quoteAdmin.updateQuoteStatusAction({}, form({ leadId: "lead0001", status: "ORDERED" }))).error).toBeDefined();
    db.staff.findFirst.mockResolvedValue(null);
    expect((await quoteAdmin.assignQuoteAction({}, form({ leadId: "lead0001", assignedToId: "staff0009" }))).fieldErrors).toBeDefined();
    expect(db.lead.update).not.toHaveBeenCalled();
  });
});

describe("CTA configuration administration", () => {
  const valid = {
    key: "brochure-gated",
    name: "Gated brochures",
    kind: "DOWNLOAD_BROCHURE",
    mode: "POPUP",
    popupType: "GATED_DOWNLOAD",
    heading: "Download the brochure",
    afterSubmit: "DOWNLOAD",
    fields: "[]",
  };

  it("is refused without the CTA popups permission", async () => {
    await expect(ctaAdmin.createCtaConfigAction({}, form(valid))).rejects.toThrow("DENIED:CTA_POPUPS:CREATE");
    await expect(ctaAdmin.setCtaConfigActiveAction("cfg00001", true)).rejects.toThrow("DENIED:CTA_POPUPS:PUBLISH");
  });

  it("creates switched off, whatever is posted", async () => {
    granted.add("CTA_POPUPS:CREATE");
    db.ctaConfig.findFirst.mockResolvedValue(null);
    db.ctaConfig.create.mockResolvedValue({ id: "cfg00001", name: "Gated brochures" });
    await expect(ctaAdmin.createCtaConfigAction({}, form({ ...valid, active: "on" }))).rejects.toThrow("REDIRECT:/admin/cta-popups/cfg00001");
    expect(db.ctaConfig.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ active: false }) }));
  });

  it("refuses unknown field keys and placements rather than ignoring them", async () => {
    granted.add("CTA_POPUPS:CREATE");
    const bad = await ctaAdmin.createCtaConfigAction({}, form({ ...valid, fields: JSON.stringify([{ key: "salary", enabled: true, required: true }]) }));
    expect(bad.fieldErrors?.fields).toBeDefined();
    const data = form(valid);
    data.append("placements", "admin.secret");
    expect((await ctaAdmin.createCtaConfigAction({}, data)).fieldErrors?.placements).toBeDefined();
    expect(db.ctaConfig.create).not.toHaveBeenCalled();
  });
});
