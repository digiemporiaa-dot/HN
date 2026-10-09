import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * A popup's form goes through the one submission pipeline the site already
 * has (submitFormAction). Only the popup credit is new, and it must be
 * verified on the server: a posted popupId that does not check out is
 * ignored, never stored.
 */

const verified = { value: null as { id: string; name: string } | null };
const db = { formSubmission: { create: vi.fn(async () => ({ id: "sub1" })) } };
const form = {
  id: "f1",
  key: "enquiry",
  name: "Enquiry",
  description: null,
  successMessage: "Thank you — we will reply within a working day.",
  submitLabel: null,
  notifyEmail: "private-inbox@internal.test",
  fields: [
    { id: "a", key: "name", type: "TEXT", label: "Name", placeholder: null, help: null, required: true, options: null, mapsTo: "NAME", choices: [] },
    { id: "b", key: "email", type: "EMAIL", label: "Email", placeholder: null, help: null, required: true, options: null, mapsTo: "EMAIL", choices: [] },
  ],
};

vi.mock("@/server/db", () => ({ prisma: db }));
vi.mock("@/server/forms/service", () => ({ publicForm: vi.fn(async (key: string) => (key === "enquiry" ? form : null)) }));
vi.mock("@/server/popups/service", () => ({ verifiedPopupForForm: vi.fn(async () => verified.value) }));
vi.mock("@/server/audit/log", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("@/server/storage/files", () => ({ storeFile: vi.fn() }));
vi.mock("@/server/mail/send", () => ({ sendMail: vi.fn() }));
vi.mock("@/server/leads/activity", () => ({ recordLeadActivity: vi.fn() }));
vi.mock("@/server/leads/throttle", () => ({
  checkFormTiming: vi.fn(() => ({ ok: true })),
  checkSubmissionRate: vi.fn(async () => ({ ok: true })),
  RATE_LIMIT_WINDOW_MINUTES: 10,
}));
vi.mock("@/server/leads/service", () => ({
  createLeadWithReference: vi.fn(async () => ({ id: "lead1" })),
  readLeadContext: vi.fn(() => ({})),
  requestContext: vi.fn(async () => ({ ipAddress: "203.0.113.5", userAgent: "test" })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { submitFormAction } = await import("@/server/forms/submit");
const { recordLeadActivity } = await import("@/server/leads/activity");
const { recordAuditEvent } = await import("@/server/audit/log");
const { verifiedPopupForForm } = await import("@/server/popups/service");
const { sendMail } = await import("@/server/mail/send");

function submission(fields: Record<string, string>) {
  const data = new FormData();
  data.set("formKey", "enquiry");
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  verified.value = null;
});

describe("popup form submission", () => {
  it("returns field errors for a bad submission and stores nothing", async () => {
    const state = await submitFormAction({}, submission({ field_name: "", field_email: "nope", popupId: "cmv0lrevt0005j07dmuv2kxui" }));
    expect(state.fieldErrors?.name).toBeDefined();
    expect(state.fieldErrors?.email).toBeDefined();
    expect(db.formSubmission.create).not.toHaveBeenCalled();
  });

  it("refuses an unknown or unpublished form", async () => {
    const data = submission({});
    data.set("formKey", "draft-form");
    expect(await submitFormAction({}, data)).toEqual({ error: "This form is no longer accepting submissions." });
  });

  it("succeeds with the form's own message and credits a verified popup", async () => {
    verified.value = { id: "cmv0lrevt0005j07dmuv2kxui", name: "ICU popup" };
    const state = await submitFormAction({}, submission({ field_name: "Asha", field_email: "asha@hospital.test", popupId: "cmv0lrevt0005j07dmuv2kxui" }));
    expect(state).toEqual({ done: true, message: form.successMessage });
    expect(verifiedPopupForForm).toHaveBeenCalledWith("cmv0lrevt0005j07dmuv2kxui", "f1");
    expect(recordLeadActivity).toHaveBeenCalledWith(expect.objectContaining({ summary: "Submitted through Enquiry (popup: ICU popup)" }));
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "FORM_SUBMITTED", metadata: expect.objectContaining({ popupId: "cmv0lrevt0005j07dmuv2kxui" }) }),
    );
    // The recipient is used server-side for the notification, nowhere else.
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: ["private-inbox@internal.test"] }));
    expect(JSON.stringify(state)).not.toContain("private-inbox");
  });

  it("ignores a popupId that does not verify", async () => {
    verified.value = null;
    const state = await submitFormAction({}, submission({ field_name: "Asha", field_email: "asha@hospital.test", popupId: "made-up-id-123" }));
    expect(state.done).toBe(true);
    expect(recordLeadActivity).toHaveBeenCalledWith(expect.objectContaining({ summary: "Submitted through Enquiry" }));
    const audit = vi.mocked(recordAuditEvent).mock.calls.find(([event]) => event.action === "FORM_SUBMITTED")?.[0];
    expect(audit?.metadata).not.toHaveProperty("popupId");
  });
});
