import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The popup server actions, with the database, permissions and framework
 * mocked. What is checked is the server's own enforcement: an action called
 * directly — no admin screen involved — must refuse without the permission
 * and must not trust what the client posts.
 */

const granted = new Set<string>();
const db = {
  popup: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};
const links = { errors: {} as Record<string, string> };

vi.mock("@/server/permissions", () => ({
  requirePermission: vi.fn(async (module: string, action: string) => {
    if (!granted.has(`${module}:${action}`)) throw new Error("ACCESS_DENIED");
    return { id: "staff1", email: "qa@example.test" };
  }),
}));
vi.mock("@/server/db", () => ({ prisma: db }));
vi.mock("@/server/audit/log", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("@/server/media/service", () => ({ clearUsage: vi.fn(), recordUsage: vi.fn() }));
vi.mock("@/server/popups/service", () => ({ checkPopupLinks: vi.fn(async () => links.errors) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

const actions = await import("@/server/popups/actions");
const { recordAuditEvent } = await import("@/server/audit/log");

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const VALID = {
  name: "QA",
  type: "ANNOUNCEMENT",
  heading: "Planning an ICU upgrade?",
  ctaLabel: "Talk to us",
  ctaHref: "/contact",
  trigger: "DELAY",
  delaySeconds: "8",
  scrollPercent: "50",
  device: "ALL",
  frequencyDays: "7",
  priority: "0",
  targetMode: "EXCLUDE",
  targetRules: "",
};

beforeEach(() => {
  granted.clear();
  links.errors = {};
  vi.clearAllMocks();
});

describe("setPopupActiveAction", () => {
  it("refuses without POPUPS:PUBLISH and changes nothing", async () => {
    granted.add("POPUPS:EDIT");
    await expect(actions.setPopupActiveAction("p1", true)).rejects.toThrow("ACCESS_DENIED");
    expect(db.popup.findFirst).not.toHaveBeenCalled();
    expect(db.popup.update).not.toHaveBeenCalled();
  });

  it("activates, audits and reports the stored state", async () => {
    granted.add("POPUPS:PUBLISH");
    db.popup.findFirst.mockResolvedValue({ id: "p1", name: "QA", type: "ANNOUNCEMENT", active: false, imageId: null, productId: null, formId: null, startsAt: null, endsAt: null });
    db.popup.update.mockResolvedValue({ id: "p1", name: "QA", active: true, startsAt: null, endsAt: null });
    const result = await actions.setPopupActiveAction("p1", true);
    expect(result).toEqual({ ok: true, active: true, state: "live" });
    expect(db.popup.update).toHaveBeenCalledWith(expect.objectContaining({ data: { active: true } }));
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "POPUP_ACTIVATED", module: "POPUPS" }));
  });

  it("refuses to activate an enquiry popup whose form is no longer published, keeping it off", async () => {
    granted.add("POPUPS:PUBLISH");
    db.popup.findFirst.mockResolvedValue({ id: "p1", name: "QA", type: "ENQUIRY", active: false, imageId: null, productId: null, formId: "f1", startsAt: null, endsAt: null });
    links.errors = { formId: "That form is not published" };
    const result = await actions.setPopupActiveAction("p1", true);
    expect(result).toMatchObject({ ok: false, active: false });
    expect(db.popup.update).not.toHaveBeenCalled();
  });

  it("refuses an enquiry popup with no form at all", async () => {
    granted.add("POPUPS:PUBLISH");
    db.popup.findFirst.mockResolvedValue({ id: "p1", name: "QA", type: "ENQUIRY", active: false, imageId: null, productId: null, formId: null, startsAt: null, endsAt: null });
    expect(await actions.setPopupActiveAction("p1", true)).toMatchObject({ ok: false, active: false });
  });

  it("treats a deleted popup as missing", async () => {
    granted.add("POPUPS:PUBLISH");
    db.popup.findFirst.mockResolvedValue(null);
    expect(await actions.setPopupActiveAction("gone", false)).toMatchObject({ ok: false });
    expect(db.popup.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "gone", deletedAt: null } }));
  });
});

describe("createPopupAction", () => {
  it("refuses without POPUPS:CREATE", async () => {
    await expect(actions.createPopupAction({}, form(VALID))).rejects.toThrow("ACCESS_DENIED");
    expect(db.popup.create).not.toHaveBeenCalled();
  });

  it("always creates switched off, whatever was posted", async () => {
    granted.add("POPUPS:CREATE");
    db.popup.create.mockResolvedValue({ id: "new1", name: "QA" });
    await expect(actions.createPopupAction({}, form({ ...VALID, active: "true" }))).rejects.toThrow("REDIRECT:/admin/popups/new1?created=1");
    expect(db.popup.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ active: false }) }));
  });

  it("returns field errors and writes nothing for invalid input", async () => {
    granted.add("POPUPS:CREATE");
    const state = await actions.createPopupAction({}, form({ ...VALID, ctaHref: "javascript:alert(1)" }));
    expect(state.fieldErrors?.ctaHref).toBeDefined();
    expect(db.popup.create).not.toHaveBeenCalled();
  });

  it("refuses records that are not published or not in the library", async () => {
    granted.add("POPUPS:CREATE");
    links.errors = { productId: "That product is not published" };
    const state = await actions.createPopupAction({}, form({ ...VALID, type: "PRODUCT_SPOTLIGHT", productId: "p1" }));
    expect(state.fieldErrors?.productId).toBe("That product is not published");
    expect(db.popup.create).not.toHaveBeenCalled();
  });
});

describe("updatePopupAction", () => {
  it("refuses without POPUPS:EDIT", async () => {
    await expect(actions.updatePopupAction({}, form({ ...VALID, popupId: "p1" }))).rejects.toThrow("ACCESS_DENIED");
  });

  it("never changes activation", async () => {
    granted.add("POPUPS:EDIT");
    db.popup.findFirst.mockResolvedValue({ id: "p1", active: false });
    db.popup.update.mockResolvedValue({ id: "p1", name: "QA" });
    const state = await actions.updatePopupAction({}, form({ ...VALID, popupId: "p1", active: "true" }));
    expect(state.success).toBeDefined();
    const data = db.popup.update.mock.calls[0][0].data;
    expect("active" in data).toBe(false);
  });
});

describe("delete and duplicate", () => {
  it("refuses delete without POPUPS:DELETE", async () => {
    granted.add("POPUPS:EDIT");
    await expect(actions.deletePopupAction(form({ popupId: "p1" }))).rejects.toThrow("ACCESS_DENIED");
    expect(db.popup.update).not.toHaveBeenCalled();
  });

  it("soft-deletes, switches off and audits", async () => {
    granted.add("POPUPS:DELETE");
    db.popup.findFirst.mockResolvedValue({ id: "p1", name: "QA" });
    await expect(actions.deletePopupAction(form({ popupId: "p1" }))).rejects.toThrow("REDIRECT:/admin/popups?deleted=1");
    expect(db.popup.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ active: false, deletedAt: expect.any(Date) }) }),
    );
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "POPUP_DELETED" }));
  });

  it("duplicates switched off", async () => {
    granted.add("POPUPS:CREATE");
    db.popup.findFirst.mockResolvedValue({
      id: "p1", name: "QA", active: true, imageId: null, targetRules: ["/a"], createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    });
    db.popup.create.mockResolvedValue({ id: "p2", name: "QA (copy)" });
    await expect(actions.duplicatePopupAction(form({ popupId: "p1" }))).rejects.toThrow("REDIRECT:/admin/popups/p2?created=1");
    const data = db.popup.create.mock.calls[0][0].data;
    expect(data.active).toBe(false);
    expect(data.id).toBeUndefined();
    expect(data.name).toBe("QA (copy)");
  });
});
