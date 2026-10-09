import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * What the public sees of a popup: the /api/public/popups payload and the
 * form inside it. Recipient addresses, lead mappings and staff-only names
 * must never be in it, and a popup whose product or form has been taken down
 * must be left out rather than shown half-empty.
 */

const db = {
  popup: { findMany: vi.fn(), findFirst: vi.fn() },
  form: { findFirst: vi.fn() },
};
vi.mock("@/server/db", () => ({ prisma: db }));

const { livePopups, verifiedPopupForForm } = await import("@/server/popups/service");
const { clientForm } = await import("@/server/forms/service");

const FORM_ROW = {
  id: "f1",
  key: "enquiry",
  name: "Enquiry",
  description: null,
  successMessage: "Thanks",
  submitLabel: null,
  notifyEmail: "private-inbox@internal.test",
  fields: [
    { id: "x1", key: "email", type: "EMAIL", label: "Email", placeholder: null, help: null, required: true, options: null, mapsTo: "EMAIL" },
  ],
};

const popupRow = (overrides: Record<string, unknown> = {}) => ({
  id: "p1",
  type: "ANNOUNCEMENT",
  eyebrow: null,
  heading: "Heading",
  description: null,
  ctaLabel: "Go",
  ctaHref: "/contact",
  trigger: "DELAY",
  delaySeconds: 5,
  scrollPercent: 50,
  device: "ALL",
  frequencyDays: 7,
  startsAt: null,
  endsAt: null,
  targetMode: "EXCLUDE",
  targetRules: ["/blog/*", "https://bad.test"],
  priority: 0,
  formId: null,
  image: null,
  product: null,
  ...overrides,
});

beforeEach(() => vi.clearAllMocks());

describe("livePopups", () => {
  it("asks only for active, undeleted popups inside their schedule", async () => {
    db.popup.findMany.mockResolvedValue([]);
    const now = new Date("2026-10-09T00:00:00Z");
    await livePopups(now);
    const where = db.popup.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ active: true, deletedAt: null });
    expect(JSON.stringify(where.AND)).toContain('"startsAt":{"lte"');
    expect(JSON.stringify(where.AND)).toContain('"endsAt":{"gt"');
  });

  it("returns only public fields, with no recipient, mapping or internal name", async () => {
    db.popup.findMany.mockResolvedValue([popupRow({ id: "p1", type: "ENQUIRY", formId: "f1", ctaLabel: null, ctaHref: null })]);
    db.form.findFirst.mockResolvedValue(FORM_ROW);
    const [popup] = await livePopups();
    const json = JSON.stringify(popup);
    expect(json).not.toContain("private-inbox");
    expect(json).not.toContain("notifyEmail");
    expect(json).not.toContain("mapsTo");
    expect(json).not.toContain("formId");
    expect(Object.keys(popup)).not.toContain("name");
    expect(popup.form?.fields[0]).toEqual({
      id: "x1", key: "email", type: "EMAIL", label: "Email", placeholder: null, help: null, required: true, choices: [],
    });
    // Stored rules are re-checked on the way out.
    expect(popup.targetRules).toEqual(["/blog/*"]);
  });

  it("leaves out an enquiry popup whose form is unpublished", async () => {
    db.popup.findMany.mockResolvedValue([popupRow({ type: "ENQUIRY", formId: "f1" })]);
    db.form.findFirst.mockResolvedValue(null);
    expect(await livePopups()).toEqual([]);
  });

  it("leaves out a product spotlight whose product is unpublished or deleted", async () => {
    db.popup.findMany.mockResolvedValue([
      popupRow({ id: "a", type: "PRODUCT_SPOTLIGHT", product: { name: "X", slug: "x", shortDescription: null, status: "DRAFT", deletedAt: null, primaryImage: null } }),
      popupRow({ id: "b", type: "PRODUCT_SPOTLIGHT", product: { name: "Y", slug: "y", shortDescription: null, status: "PUBLISHED", deletedAt: new Date(), primaryImage: null } }),
      popupRow({ id: "c", type: "PRODUCT_SPOTLIGHT", product: { name: "Z", slug: "z", shortDescription: "Short", status: "PUBLISHED", deletedAt: null, primaryImage: { storageKey: "products/z.webp", altText: "Z", deletedAt: null } } }),
    ]);
    const result = await livePopups();
    expect(result.map((popup) => popup.id)).toEqual(["c"]);
    expect(result[0].product).toEqual({ name: "Z", href: "/products/z", summary: "Short" });
    expect(result[0].image?.url).toBe("/api/media/file/products/z.webp");
  });
});

describe("clientForm", () => {
  it("keeps only what the browser draws", () => {
    const form = clientForm({ ...FORM_ROW, fields: FORM_ROW.fields.map((field) => ({ ...field, choices: [] })) } as never);
    expect(JSON.stringify(form)).not.toContain("private-inbox");
    expect(JSON.stringify(form)).not.toContain("mapsTo");
    expect(Object.keys(form).sort()).toEqual(["description", "fields", "key", "name", "submitLabel", "successMessage"]);
  });
});

describe("verifiedPopupForForm", () => {
  it("does not query for a malformed id", async () => {
    expect(await verifiedPopupForForm("x'; drop", "f1")).toBeNull();
    expect(await verifiedPopupForForm("", "f1")).toBeNull();
    expect(db.popup.findFirst).not.toHaveBeenCalled();
  });

  it("requires a live enquiry popup carrying exactly this form", async () => {
    db.popup.findFirst.mockResolvedValue(null);
    expect(await verifiedPopupForForm("cmv0lrevt0005j07dmuv2kxui", "f1")).toBeNull();
    expect(db.popup.findFirst.mock.calls[0][0].where).toMatchObject({
      id: "cmv0lrevt0005j07dmuv2kxui",
      formId: "f1",
      type: "ENQUIRY",
      active: true,
      deletedAt: null,
    });
  });
});
