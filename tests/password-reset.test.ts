import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * "Forgot password", with the database, mail and framework mocked. What is
 * checked: the answer never reveals whether an address has an account, the
 * link only ever goes to the account's own address, only a hash is stored,
 * a link works once and only while fresh, and a reset ends every session.
 */

const db = {
  staff: { findUnique: vi.fn(), update: vi.fn(() => "staff.update") },
  staffSession: { updateMany: vi.fn(() => "session.revoke") },
  passwordResetToken: {
    create: vi.fn((_args: { data: { staffId: string; tokenHash: string; expiresAt: Date } }) => "token.create"),
    updateMany: vi.fn(async () => ({ count: 1 })),
    findUnique: vi.fn(),
    count: vi.fn(async () => 0),
  },
  auditLog: { count: vi.fn(async () => 0) },
  $transaction: vi.fn(async (operations: unknown[]) => operations),
};
const afterCallbacks: Array<() => unknown> = [];

vi.mock("@/server/db", () => ({ prisma: db }));
vi.mock("@/server/audit/log", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("@/server/mail/send", () => ({ sendMail: vi.fn() }));
vi.mock("@/server/http/client", () => ({
  requestContext: vi.fn(async () => ({ ipAddress: "203.0.113.9", userAgent: "test" })),
}));
vi.mock("@/server/settings/service", () => ({ getSiteSettings: vi.fn(async () => ({ companyName: "HN Medical" })) }));
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));
vi.mock("@/server/auth/index", () => ({ signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("@/server/auth/guards", () => ({ getCurrentStaff: vi.fn() }));
vi.mock("@/server/auth/password", () => ({
  hashPassword: vi.fn(async (value: string) => `hashed:${value}`),
  verifyPassword: vi.fn(),
}));
vi.mock("next/server", () => ({ after: (callback: () => unknown) => afterCallbacks.push(callback) }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

const { requestPasswordResetAction, resetPasswordAction } = await import("@/server/auth/actions");
const { hashResetToken, isWellFormedResetToken } = await import("@/server/auth/password-reset");
const { sendMail } = await import("@/server/mail/send");
const { recordAuditEvent } = await import("@/server/audit/log");

const request = (email: string) => {
  const data = new FormData();
  data.set("email", email);
  return data;
};

const STAFF = { id: "s1", name: "Asha", email: "asha@hn.test", status: "ACTIVE" };
const TOKEN = "A".repeat(43);

beforeEach(() => {
  vi.clearAllMocks();
  afterCallbacks.length = 0;
  db.passwordResetToken.count.mockResolvedValue(0);
  db.auditLog.count.mockResolvedValue(0);
  db.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
});

describe("requesting a reset link", () => {
  it("answers the same for an unknown address and sends nothing", async () => {
    db.staff.findUnique.mockResolvedValue(null);
    expect(await requestPasswordResetAction({}, request("nobody@hn.test"))).toEqual({ sent: true });
    expect(db.passwordResetToken.create).not.toHaveBeenCalled();
    expect(afterCallbacks).toHaveLength(0);
  });

  it("answers the same for a deactivated account and sends nothing", async () => {
    db.staff.findUnique.mockResolvedValue({ ...STAFF, status: "SUSPENDED" });
    expect(await requestPasswordResetAction({}, request(STAFF.email))).toEqual({ sent: true });
    expect(db.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it("emails the account's own address, after the response, and stores only a hash", async () => {
    db.staff.findUnique.mockResolvedValue(STAFF);
    expect(await requestPasswordResetAction({}, request("  ASHA@hn.test "))).toEqual({ sent: true });

    const created = db.passwordResetToken.create.mock.calls[0][0].data;
    expect(created.staffId).toBe("s1");
    expect(created.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(created.expiresAt.getTime() - Date.now()).toBeGreaterThan(29 * 60_000);
    expect(created.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(30 * 60_000);
    // Earlier links are retired in the same transaction.
    expect(db.passwordResetToken.updateMany).toHaveBeenCalledWith({ where: { staffId: "s1", usedAt: null }, data: { usedAt: expect.any(Date) } });

    expect(sendMail).not.toHaveBeenCalled();
    await afterCallbacks[0]();
    const mail = vi.mocked(sendMail).mock.calls[0][0];
    expect(mail.to).toEqual(["asha@hn.test"]);
    const token = /token=([A-Za-z0-9_-]+)/.exec(mail.text)?.[1] ?? "";
    expect(isWellFormedResetToken(token)).toBe(true);
    // The emailed token is not what was stored; its hash is.
    expect(created.tokenHash).toBe(hashResetToken(token));
    expect(created.tokenHash).not.toContain(token);
  });

  it("stops sending to one account after a few links, without saying so", async () => {
    db.staff.findUnique.mockResolvedValue(STAFF);
    db.passwordResetToken.count.mockResolvedValue(3);
    expect(await requestPasswordResetAction({}, request(STAFF.email))).toEqual({ sent: true });
    expect(db.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it("limits one network, whatever the address", async () => {
    db.staff.findUnique.mockResolvedValue(null);
    db.auditLog.count.mockResolvedValue(10);
    const state = await requestPasswordResetAction({}, request("x@hn.test"));
    expect(state.error).toMatch(/Too many/);
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  it("validates the address", async () => {
    const state = await requestPasswordResetAction({}, request("not-an-email"));
    expect(state.fieldErrors?.email).toBeDefined();
    expect(db.staff.findUnique).not.toHaveBeenCalled();
  });
});

describe("setting a new password", () => {
  const submit = (fields: Record<string, string>) => {
    const data = new FormData();
    for (const [key, value] of Object.entries(fields)) data.set(key, value);
    return data;
  };
  const fresh = () => ({
    id: "t1",
    usedAt: null,
    expiresAt: new Date(Date.now() + 10 * 60_000),
    staff: STAFF,
  });

  it("refuses a malformed token without a lookup", async () => {
    const state = await resetPasswordAction({}, submit({ token: "short", newPassword: "a long new password", confirmPassword: "a long new password" }));
    expect(state.error).toMatch(/expired or has already been used/);
    expect(db.passwordResetToken.findUnique).not.toHaveBeenCalled();
  });

  it("refuses an expired, used or unknown token", async () => {
    for (const record of [
      { ...fresh(), expiresAt: new Date(Date.now() - 1000) },
      { ...fresh(), usedAt: new Date() },
      { ...fresh(), staff: { ...STAFF, status: "SUSPENDED" } },
      null,
    ]) {
      db.passwordResetToken.findUnique.mockResolvedValueOnce(record);
      const state = await resetPasswordAction({}, submit({ token: TOKEN, newPassword: "a long new password", confirmPassword: "a long new password" }));
      expect(state.error).toMatch(/expired or has already been used/);
    }
    expect(db.staff.update).not.toHaveBeenCalled();
  });

  it("enforces the password policy before touching the token", async () => {
    const short = await resetPasswordAction({}, submit({ token: TOKEN, newPassword: "short", confirmPassword: "short" }));
    expect(short.fieldErrors?.newPassword).toBeDefined();
    const mismatch = await resetPasswordAction({}, submit({ token: TOKEN, newPassword: "a long new password", confirmPassword: "a long new passwore" }));
    expect(mismatch.fieldErrors?.confirmPassword).toBeDefined();
    expect(db.passwordResetToken.findUnique).not.toHaveBeenCalled();
  });

  it("loses a race cleanly: only one submission can claim the link", async () => {
    db.passwordResetToken.findUnique.mockResolvedValue(fresh());
    db.passwordResetToken.updateMany.mockResolvedValueOnce({ count: 0 });
    const state = await resetPasswordAction({}, submit({ token: TOKEN, newPassword: "a long new password", confirmPassword: "a long new password" }));
    expect(state.error).toMatch(/expired or has already been used/);
    expect(db.staff.update).not.toHaveBeenCalled();
  });

  it("sets the password, ends every session and retires the link", async () => {
    db.passwordResetToken.findUnique.mockResolvedValue(fresh());
    await expect(
      resetPasswordAction({}, submit({ token: TOKEN, newPassword: "a long new password", confirmPassword: "a long new password" })),
    ).rejects.toThrow("REDIRECT:/login?reason=password-reset");

    expect(db.passwordResetToken.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { tokenHash: hashResetToken(TOKEN) } }));
    expect(db.staff.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { passwordHash: "hashed:a long new password", mustChangePassword: false, tokenVersion: { increment: 1 } },
    });
    expect(db.staffSession.updateMany).toHaveBeenCalledWith({ where: { staffId: "s1", revokedAt: null }, data: { revokedAt: expect.any(Date) } });
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "AUTH_PASSWORD_RESET", entityId: "s1" }));
  });
});
