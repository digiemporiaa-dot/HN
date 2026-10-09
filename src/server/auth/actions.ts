"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requestContext } from "@/server/http/client";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";
import { appUrl } from "@/lib/site-config";
import { sendMail } from "@/server/mail/send";
import { passwordResetMessage } from "@/server/mail/templates";
import { getSiteSettings } from "@/server/settings/service";
import { getCurrentStaff } from "./guards";
import { signIn, signOut } from "./index";
import { hashPassword, verifyPassword } from "./password";
import { revokeSession } from "./sessions";
import { checkLoginThrottle } from "./throttle";
import {
  findUsableResetToken,
  issueResetToken,
  resetRequestAllowed,
  RESET_TTL_MINUTES,
} from "./password-reset";

/**
 * One message for every authentication failure. Distinguishing "no such user"
 * from "wrong password" would let anyone enumerate staff addresses.
 */
const GENERIC_CREDENTIALS_ERROR = "The email address or password is incorrect.";

export type LoginState = {
  error?: string;
  fieldErrors?: { email?: string; password?: string; code?: string };
  /** Set once the password is accepted and an authenticator code is needed. */
  requiresTwoFactor?: boolean;
};

export async function loginAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        email: flattened.email?.[0],
        password: flattened.password?.[0],
      },
    };
  }

  const { email, password } = parsed.data;
  const { ipAddress, userAgent } = await requestContext();

  const throttle = await checkLoginThrottle(email, ipAddress);
  if (!throttle.allowed) {
    await recordAuditEvent({
      actorEmail: email,
      action: "AUTH_LOGIN_THROTTLED",
      ipAddress,
      userAgent,
    });
    return {
      error: `Too many sign-in attempts. Please try again in ${throttle.retryAfterMinutes} minutes.`,
    };
  }

  const code = String(formData.get("code") ?? "").trim();

  try {
    await signIn("credentials", { email, password, code, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      const reason = (error as { code?: string }).code;

      // Raised only after the password was accepted, so surfacing it leaks
      // nothing an attacker could not already determine.
      if (reason === "two_factor_required") {
        return { requiresTwoFactor: true };
      }

      if (reason === "two_factor_invalid") {
        return {
          requiresTwoFactor: true,
          fieldErrors: {
            code: "That code is not valid. Try the next one, or use a recovery code.",
          },
        };
      }

      await recordAuditEvent({
        actorEmail: email,
        action: "AUTH_LOGIN_FAILED",
        ipAddress,
        userAgent,
      });
      return { error: GENERIC_CREDENTIALS_ERROR };
    }
    throw error;
  }

  // Outside the try block: redirect signals by throwing, and catching it here
  // would swallow the navigation.
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  const staff = await getCurrentStaff();
  const { ipAddress, userAgent } = await requestContext();

  if (staff) {
    // Signing out ends this device's session server-side too, so its record
    // does not linger in the active sessions list.
    await revokeSession(staff.sessionId, staff.id);

    await recordAuditEvent({
      actorId: staff.id,
      actorEmail: staff.email,
      action: "AUTH_LOGOUT",
      entityType: "Staff",
      entityId: staff.id,
      ipAddress,
      userAgent,
    });
  }

  await signOut({ redirectTo: "/login" });
}

export type ChangePasswordState = {
  error?: string;
  fieldErrors?: Partial<
    Record<"currentPassword" | "newPassword" | "confirmPassword", string>
  >;
};

export async function changePasswordAction(
  _previous: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/login?reason=session-expired");

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        currentPassword: flattened.currentPassword?.[0],
        newPassword: flattened.newPassword?.[0],
        confirmPassword: flattened.confirmPassword?.[0],
      },
    };
  }

  const record = await prisma.staff.findUnique({
    where: { id: staff.id },
    select: { passwordHash: true },
  });

  if (!record) redirect("/login?reason=session-expired");

  const currentValid = await verifyPassword(
    parsed.data.currentPassword,
    record.passwordHash,
  );

  if (!currentValid) {
    return {
      fieldErrors: { currentPassword: "That password is incorrect." },
    };
  }

  const { ipAddress, userAgent } = await requestContext();

  await prisma.staff.update({
    where: { id: staff.id },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword),
      mustChangePassword: false,
      // Retires every session, including this one — the user signs in again
      // with the new password, and any session an attacker held is dropped.
      tokenVersion: { increment: 1 },
    },
  });

  await recordAuditEvent({
    actorId: staff.id,
    actorEmail: staff.email,
    action: "AUTH_PASSWORD_CHANGED",
    entityType: "Staff",
    entityId: staff.id,
    summary: "Password changed by the account holder",
    ipAddress,
    userAgent,
  });

  await signOut({ redirectTo: "/login?reason=password-changed" });
  return {};
}

export type ForgotPasswordState = {
  error?: string;
  /** The same answer whether or not the address has an account. */
  sent?: boolean;
  fieldErrors?: { email?: string };
};

/**
 * Sends a reset link to the account's own address, if there is an active
 * account for what was typed.
 *
 * The visitor gets the same answer either way, and the mail goes out after
 * the response, so neither the wording nor the timing says whether an
 * address belongs to a member of staff.
 */
export async function requestPasswordResetAction(
  _previous: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { fieldErrors: { email: parsed.error.flatten().fieldErrors.email?.[0] } };
  }

  const { email } = parsed.data;
  const { ipAddress, userAgent } = await requestContext();

  const staff = await prisma.staff.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, status: true },
  });
  const account = staff?.status === "ACTIVE" ? staff : null;

  const limits = await resetRequestAllowed({ ipAddress, staffId: account?.id ?? null });
  if (!limits.ipAllowed) {
    return { error: "Too many reset requests from this network. Please try again in 15 minutes." };
  }

  const willSend = Boolean(account && limits.accountAllowed);
  await recordAuditEvent({
    actorEmail: email,
    action: "AUTH_PASSWORD_RESET_REQUESTED",
    entityType: account ? "Staff" : null,
    entityId: account?.id ?? null,
    summary: !account
      ? "No active account for this address; nothing sent"
      : willSend
        ? "Reset link sent"
        : "Not sent: too many links requested for this account",
    ipAddress,
    userAgent,
  });

  if (account && willSend) {
    const token = await issueResetToken(account.id, ipAddress);
    const link = new URL(`/reset-password?token=${token}`, appUrl()).toString();
    const { companyName } = await getSiteSettings();
    const message = passwordResetMessage({
      name: account.name,
      link,
      minutes: RESET_TTL_MINUTES,
      companyName,
    });
    // To the address on the account, never the one typed.
    after(() =>
      sendMail({
        kind: "auth.password-reset",
        subject: message.subject,
        text: message.text,
        html: message.html,
        entityType: "Staff",
        entityId: account.id,
        to: [account.email],
      }),
    );
  }

  return { sent: true };
}

export type ResetPasswordState = {
  error?: string;
  fieldErrors?: Partial<Record<"newPassword" | "confirmPassword", string>>;
};

const RESET_LINK_INVALID =
  "This reset link has expired or has already been used. Request a new one.";

/**
 * Sets a new password from a reset link. The link is claimed atomically, so
 * two submissions cannot both use it; every session on the account is ended;
 * and two-factor authentication, if enrolled, is still asked for at the next
 * sign-in — a reset link alone never gets anyone into the admin.
 */
export async function resetPasswordAction(
  _previous: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        newPassword: flattened.newPassword?.[0],
        confirmPassword: flattened.confirmPassword?.[0],
      },
    };
  }

  const record = await findUsableResetToken(formData.get("token"));
  if (!record) return { error: RESET_LINK_INVALID };

  const now = new Date();
  const claimed = await prisma.passwordResetToken.updateMany({
    where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  if (claimed.count !== 1) return { error: RESET_LINK_INVALID };

  const passwordHash = await hashPassword(parsed.data.newPassword);
  const staffId = record.staff.id;
  await prisma.$transaction([
    prisma.staff.update({
      where: { id: staffId },
      data: { passwordHash, mustChangePassword: false, tokenVersion: { increment: 1 } },
    }),
    prisma.staffSession.updateMany({
      where: { staffId, revokedAt: null },
      data: { revokedAt: now },
    }),
    prisma.passwordResetToken.updateMany({
      where: { staffId, usedAt: null },
      data: { usedAt: now },
    }),
  ]);

  const { ipAddress, userAgent } = await requestContext();
  await recordAuditEvent({
    actorId: staffId,
    actorEmail: record.staff.email,
    action: "AUTH_PASSWORD_RESET",
    entityType: "Staff",
    entityId: staffId,
    summary: "Password reset with an emailed link; all sessions ended",
    ipAddress,
    userAgent,
  });

  redirect("/login?reason=password-reset");
}
