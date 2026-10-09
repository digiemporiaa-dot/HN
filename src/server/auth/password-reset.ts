import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/server/db";

/**
 * "Forgot password" tokens.
 *
 * The link carries 32 random bytes; the database keeps only their SHA-256.
 * A token works once, for RESET_TTL_MINUTES, for an active account, and
 * asking again retires every earlier token for that account.
 */

export const RESET_TTL_MINUTES = 30;
const WINDOW_MINUTES = 15;
/** Links one account can be sent per window. */
const MAX_PER_ACCOUNT = 3;
/** Requests one address can make per window, for any email at all. */
const MAX_PER_IP = 10;

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** A shape check before any lookup: base64url, the length we issue. */
export function isWellFormedResetToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}

export async function issueResetToken(staffId: string, ipAddress: string | null): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await prisma.$transaction([
    // Only the newest link works.
    prisma.passwordResetToken.updateMany({
      where: { staffId, usedAt: null },
      data: { usedAt: now },
    }),
    prisma.passwordResetToken.create({
      data: {
        staffId,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(now.getTime() + RESET_TTL_MINUTES * 60_000),
        ipAddress,
      },
    }),
  ]);
  return token;
}

/** The account a token may reset, or null for anything not usable now. */
export async function findUsableResetToken(token: unknown) {
  if (!isWellFormedResetToken(token)) return null;
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    select: {
      id: true,
      usedAt: true,
      expiresAt: true,
      staff: { select: { id: true, email: true, name: true, status: true } },
    },
  });
  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) return null;
  if (record.staff.status !== "ACTIVE") return null;
  return { id: record.id, staff: record.staff };
}

/**
 * Whether another link may be sent. Per address it counts every request,
 * known email or not (from the audit log), so the limit cannot be used to
 * tell which emails have accounts; per account it counts links issued.
 */
export async function resetRequestAllowed(params: {
  ipAddress: string | null;
  staffId: string | null;
}): Promise<{ ipAllowed: boolean; accountAllowed: boolean }> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000);
  const [ipCount, accountCount] = await Promise.all([
    params.ipAddress
      ? prisma.auditLog.count({
          where: { action: "AUTH_PASSWORD_RESET_REQUESTED", ipAddress: params.ipAddress, createdAt: { gte: since } },
        })
      : 0,
    params.staffId
      ? prisma.passwordResetToken.count({ where: { staffId: params.staffId, createdAt: { gte: since } } })
      : 0,
  ]);
  return { ipAllowed: ipCount < MAX_PER_IP, accountAllowed: accountCount < MAX_PER_ACCOUNT };
}
