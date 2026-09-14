"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { changePasswordSchema, loginSchema } from "@/lib/validation/auth";
import { getCurrentStaff } from "./guards";
import { signIn, signOut } from "./index";
import { hashPassword, verifyPassword } from "./password";
import { revokeSession } from "./sessions";
import { checkLoginThrottle } from "./throttle";

/**
 * One message for every authentication failure. Distinguishing "no such user"
 * from "wrong password" would let anyone enumerate staff addresses.
 */
const GENERIC_CREDENTIALS_ERROR =
  "The email address or password is incorrect.";

export type LoginState = {
  error?: string;
  fieldErrors?: { email?: string; password?: string; code?: string };
  /** Set once the password is accepted and an authenticator code is needed. */
  requiresTwoFactor?: boolean;
};

async function requestContext() {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  return {
    ipAddress:
      forwarded?.split(",")[0]?.trim() ?? headerList.get("x-real-ip") ?? null,
    userAgent: headerList.get("user-agent"),
  };
}

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
