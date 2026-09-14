import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";

import { prisma } from "@/server/db";
import { siteConfig } from "@/lib/site-config";
import { decryptSecret, encryptSecret } from "./crypto";

/**
 * Standard RFC 6238 defaults: SHA-1, 6 digits, 30-second steps. These are what
 * every authenticator app assumes, so they are not tuned.
 *
 * Tolerance is expressed in seconds, not steps — one step either side, so a
 * code entered as it rolls over is still accepted. A wider window would
 * meaningfully extend the replay opportunity.
 */
const EPOCH_TOLERANCE_SECONDS = 30;

const RECOVERY_CODE_COUNT = 10;

export type TwoFactorStatus = {
  enabled: boolean;
  pendingEnrolment: boolean;
  unusedRecoveryCodes: number;
};

export async function getTwoFactorStatus(
  staffId: string,
): Promise<TwoFactorStatus> {
  const [secret, unusedRecoveryCodes] = await Promise.all([
    prisma.twoFactorSecret.findUnique({
      where: { staffId },
      select: { confirmedAt: true },
    }),
    prisma.recoveryCode.count({ where: { staffId, usedAt: null } }),
  ]);

  return {
    enabled: Boolean(secret?.confirmedAt),
    pendingEnrolment: Boolean(secret && !secret.confirmedAt),
    unusedRecoveryCodes,
  };
}

export async function isTwoFactorEnabled(staffId: string): Promise<boolean> {
  const secret = await prisma.twoFactorSecret.findUnique({
    where: { staffId },
    select: { confirmedAt: true },
  });
  return Boolean(secret?.confirmedAt);
}

/**
 * Starts (or restarts) enrolment. The secret is stored immediately but stays
 * unconfirmed until a valid code proves the authenticator was set up, so a
 * half-finished enrolment can never lock anyone out.
 */
export async function beginEnrolment(params: {
  staffId: string;
  email: string;
}): Promise<{ otpauthUrl: string; qrCodeDataUrl: string; secret: string }> {
  const secret = generateSecret();

  await prisma.twoFactorSecret.upsert({
    where: { staffId: params.staffId },
    update: { secretCiphertext: encryptSecret(secret), confirmedAt: null },
    create: {
      staffId: params.staffId,
      secretCiphertext: encryptSecret(secret),
    },
  });

  const otpauthUrl = generateURI({
    strategy: "totp",
    issuer: siteConfig.name,
    label: params.email,
    secret,
  });

  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
  });

  return { otpauthUrl, qrCodeDataUrl, secret };
}

export async function verifyTotpCode(
  staffId: string,
  code: string,
): Promise<boolean> {
  const record = await prisma.twoFactorSecret.findUnique({
    where: { staffId },
    select: { secretCiphertext: true },
  });
  if (!record) return false;

  const normalised = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalised)) return false;

  try {
    return verifySync({
      strategy: "totp",
      token: normalised,
      secret: decryptSecret(record.secretCiphertext),
      epochTolerance: EPOCH_TOLERANCE_SECONDS,
    }).valid;
  } catch {
    return false;
  }
}

/** Confirms enrolment. Returns the recovery codes, which are shown once. */
export async function confirmEnrolment(
  staffId: string,
  code: string,
): Promise<{ recoveryCodes: string[] } | null> {
  const valid = await verifyTotpCode(staffId, code);
  if (!valid) return null;

  await prisma.twoFactorSecret.update({
    where: { staffId },
    data: { confirmedAt: new Date() },
  });

  return { recoveryCodes: await regenerateRecoveryCodes(staffId) };
}

function hashRecoveryCode(code: string): string {
  return createHash("sha256")
    .update(code.replace(/[\s-]/g, "").toUpperCase())
    .digest("hex");
}

function formatRecoveryCode(raw: string): string {
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

export async function regenerateRecoveryCodes(
  staffId: string,
): Promise<string[]> {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () =>
    // Crockford-ish alphabet: no I, L, O or U, so codes cannot be misread.
    formatRecoveryCode(
      Array.from(randomBytes(10))
        .map((byte) => "0123456789ABCDEFGHJKMNPQRSTVWXYZ"[byte % 32])
        .join(""),
    ),
  );

  await prisma.$transaction([
    prisma.recoveryCode.deleteMany({ where: { staffId } }),
    prisma.recoveryCode.createMany({
      data: codes.map((code) => ({
        staffId,
        codeHash: hashRecoveryCode(code),
      })),
    }),
  ]);

  return codes;
}

/**
 * Consumes a recovery code. Each one works exactly once; marking it used is
 * part of the same check so a replay cannot slip through.
 */
export async function consumeRecoveryCode(
  staffId: string,
  code: string,
): Promise<boolean> {
  const candidate = code.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[0-9A-Z]{10}$/.test(candidate)) return false;

  const hash = hashRecoveryCode(candidate);

  const stored = await prisma.recoveryCode.findUnique({
    where: { staffId_codeHash: { staffId, codeHash: hash } },
    select: { id: true, usedAt: true, codeHash: true },
  });

  if (!stored || stored.usedAt) return false;

  // Constant-time compare even though the lookup already matched, so the code
  // path does not depend on secret-derived data in a measurable way.
  const matches = timingSafeEqual(
    Buffer.from(stored.codeHash, "hex"),
    Buffer.from(hash, "hex"),
  );
  if (!matches) return false;

  const consumed = await prisma.recoveryCode.updateMany({
    where: { id: stored.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  return consumed.count === 1;
}

export async function disableTwoFactor(staffId: string): Promise<void> {
  await prisma.$transaction([
    prisma.twoFactorSecret.deleteMany({ where: { staffId } }),
    prisma.recoveryCode.deleteMany({ where: { staffId } }),
  ]);
}
