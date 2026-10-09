import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Storing a lead and resolving a download grant, with the database mocked.
 */

const db = {
  lead: { count: vi.fn(async () => 41), create: vi.fn(), findUnique: vi.fn() },
  documentGrant: { findUnique: vi.fn() },
  productDocument: { findFirst: vi.fn() },
  ctaConfig: { findFirst: vi.fn() },
};
vi.mock("@/server/db", () => ({ prisma: db }));
vi.mock("@/server/http/client", () => ({ requestContext: vi.fn() }));

const service = await import("@/server/leads/service");

beforeEach(() => {
  vi.clearAllMocks();
  db.lead.findUnique.mockResolvedValue(null);
});

describe("storeLead", () => {
  it("writes the lead and everything nested in one create", async () => {
    db.lead.create.mockResolvedValue({ id: "l1", reference: "HN-2026-0042" });
    const result = await service.storeLead({ name: "A", email: "a@x.in", source: "RFQ", items: { create: [] } });
    expect(result).toEqual({ id: "l1", reference: "HN-2026-0042", replayed: false });
    expect(db.lead.create).toHaveBeenCalledTimes(1);
    expect(db.lead.create.mock.calls[0][0].data).toMatchObject({ reference: expect.stringMatching(/^HN-\d{4}-0042$/), items: { create: [] } });
  });

  it("returns the first lead for a repeated submission key without writing", async () => {
    db.lead.findUnique.mockResolvedValue({ id: "l1", reference: "HN-2026-0042" });
    const result = await service.storeLead({ name: "A", email: "a@x.in", source: "RFQ", submissionKey: "k".repeat(20) });
    expect(result).toEqual({ id: "l1", reference: "HN-2026-0042", replayed: true });
    expect(db.lead.create).not.toHaveBeenCalled();
  });

  it("answers with the winner when two identical submissions race", async () => {
    db.lead.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "l1", reference: "HN-2026-0042" });
    db.lead.create.mockRejectedValue(new Error("unique constraint"));
    const result = await service.storeLead({ name: "A", email: "a@x.in", source: "RFQ", submissionKey: "k".repeat(20) });
    expect(result).toMatchObject({ id: "l1", replayed: true });
  });

  it("gives up rather than claiming success when it cannot store", async () => {
    db.lead.create.mockRejectedValue(new Error("down"));
    expect(await service.storeLead({ name: "A", email: "a@x.in", source: "RFQ" })).toBeNull();
  });

  it("accepts only well-formed submission keys", () => {
    const data = (value: string) => {
      const form = new FormData();
      form.set("submissionKey", value);
      return form;
    };
    expect(service.readSubmissionKey(data("abcdefghijklmnop-_12"))).toBe("abcdefghijklmnop-_12");
    expect(service.readSubmissionKey(data("short"))).toBeNull();
    expect(service.readSubmissionKey(data("x'; DROP TABLE x;--aaaa"))).toBeNull();
  });
});

describe("download grants", () => {
  const future = new Date(Date.now() + 86_400_000);

  it("resolves a catalogue grant to its media file", async () => {
    db.documentGrant.findUnique.mockResolvedValue({
      id: "g1",
      leadId: "l1",
      expiresAt: future,
      document: null,
      media: { storageKey: "docs/catalogue.pdf", deletedAt: null, title: "2026 Catalogue", originalName: "cat.pdf" },
    });
    expect(await service.resolveGrant("t".repeat(43))).toEqual({ id: "g1", leadId: "l1", title: "2026 Catalogue", storageKey: "docs/catalogue.pdf" });
  });

  it("refuses an expired grant or a deleted file", async () => {
    db.documentGrant.findUnique.mockResolvedValue({ id: "g1", leadId: "l1", expiresAt: new Date(Date.now() - 1000), document: null, media: { storageKey: "a.pdf", deletedAt: null, title: null, originalName: "a.pdf" } });
    expect(await service.resolveGrant("t".repeat(43))).toBeNull();
    db.documentGrant.findUnique.mockResolvedValue({ id: "g1", leadId: "l1", expiresAt: future, document: { title: "B", media: { storageKey: "b.pdf", deletedAt: new Date() } }, media: null });
    expect(await service.resolveGrant("t".repeat(43))).toBeNull();
  });

  it("keeps a file gated by a live CTA popup off the public media route", async () => {
    db.productDocument.findFirst.mockResolvedValue(null);
    db.ctaConfig.findFirst.mockResolvedValue({ id: "c1" });
    expect(await service.isGatedStorageKey("docs/catalogue.pdf")).toBe(true);
    db.ctaConfig.findFirst.mockResolvedValue(null);
    expect(await service.isGatedStorageKey("docs/catalogue.pdf")).toBe(false);
  });
});
