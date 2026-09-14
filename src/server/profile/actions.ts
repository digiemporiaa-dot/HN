"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requireStaff } from "@/server/auth/guards";
import { verifyPassword } from "@/server/auth/password";
import { signOut } from "@/server/auth";
import {
  revokeOtherSessions,
  revokeSession,
} from "@/server/auth/sessions";
import {
  beginEnrolment,
  confirmEnrolment,
  disableTwoFactor,
  regenerateRecoveryCodes,
} from "@/server/auth/two-factor";
import { clearUsage, recordUsage } from "@/server/media/service";

export type ProfileState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
};

export type TwoFactorState = ProfileState & {
  qrCodeDataUrl?: string;
  manualKey?: string;
  recoveryCodes?: string[];
};

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(120, "Name must be 120 characters or fewer"),
  phone: z
    .string()
    .trim()
    .max(32, "Phone number is too long")
    .regex(/^[0-9+()\-.\s]*$/, "Phone number contains invalid characters")
    .optional()
    .transform((value) => (value ? value : null)),
});

const codeSchema = z
  .string()
  .trim()
  .min(6, "Enter the 6-digit code")
  .max(32);

export async function updateProfileAction(
  _previous: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const staff = await requireStaff();

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") ?? undefined,
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        ...(flattened.name?.[0] ? { name: flattened.name[0] } : {}),
        ...(flattened.phone?.[0] ? { phone: flattened.phone[0] } : {}),
      },
    };
  }

  await prisma.staff.update({
    where: { id: staff.id },
    data: { name: parsed.data.name, phone: parsed.data.phone },
  });

  await recordAuditEvent({
    actorId: staff.id,
    actorEmail: staff.email,
    action: "PROFILE_UPDATED",
    entityType: "Staff",
    entityId: staff.id,
    summary: "Updated own profile details",
  });

  revalidatePath("/admin/profile");
  return { success: "Profile updated." };
}

/**
 * Sets or clears the profile photo from an already-uploaded media asset.
 *
 * Usage is recorded so the media library can warn before someone deletes a file
 * that is still someone's avatar.
 */
export async function updateProfilePhotoAction(
  _previous: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const staff = await requireStaff();
  const raw = formData.get("assetId");
  const assetId = typeof raw === "string" && raw ? raw : null;

  if (assetId) {
    const asset = await prisma.mediaAsset.findFirst({
      where: { id: assetId, deletedAt: null, kind: { in: ["IMAGE", "VECTOR"] } },
      select: { id: true },
    });
    if (!asset) return { error: "Choose an image from the media library." };
  }

  await prisma.staff.update({
    where: { id: staff.id },
    data: { avatarId: assetId },
  });

  await clearUsage({
    entityType: "Staff",
    entityId: staff.id,
    field: "avatar",
  });

  if (assetId) {
    await recordUsage({
      assetId,
      entityType: "Staff",
      entityId: staff.id,
      field: "avatar",
    });
  }

  await recordAuditEvent({
    actorId: staff.id,
    actorEmail: staff.email,
    action: assetId ? "PROFILE_PHOTO_SET" : "PROFILE_PHOTO_CLEARED",
    entityType: "Staff",
    entityId: staff.id,
  });

  revalidatePath("/admin/profile");
  return { success: assetId ? "Profile photo updated." : "Profile photo removed." };
}

/**
 * Email changes are deliberately not self-service: the address is the sign-in
 * identifier, so changing it is an account-takeover vector and belongs with an
 * administrator until a verify-by-email flow exists.
 */
export async function startTwoFactorEnrolmentAction(
  _previous: TwoFactorState,
): Promise<TwoFactorState> {
  const staff = await requireStaff();

  const { qrCodeDataUrl, secret } = await beginEnrolment({
    staffId: staff.id,
    email: staff.email,
  });

  await recordAuditEvent({
    actorId: staff.id,
    actorEmail: staff.email,
    action: "TWO_FACTOR_ENROLMENT_STARTED",
    entityType: "Staff",
    entityId: staff.id,
  });

  return { qrCodeDataUrl, manualKey: secret };
}

export async function confirmTwoFactorAction(
  _previous: TwoFactorState,
  formData: FormData,
): Promise<TwoFactorState> {
  const staff = await requireStaff();

  const parsed = codeSchema.safeParse(formData.get("code"));
  if (!parsed.success) {
    return { fieldErrors: { code: "Enter the 6-digit code" } };
  }

  const result = await confirmEnrolment(staff.id, parsed.data);
  if (!result) {
    return {
      fieldErrors: {
        code: "That code is not valid. Check the time on your device and try the next code.",
      },
    };
  }

  await recordAuditEvent({
    actorId: staff.id,
    actorEmail: staff.email,
    action: "TWO_FACTOR_ENABLED",
    entityType: "Staff",
    entityId: staff.id,
    summary: "Two-factor authentication enabled",
  });

  revalidatePath("/admin/profile");
  return {
    success: "Two-factor authentication is on.",
    recoveryCodes: result.recoveryCodes,
  };
}

export async function regenerateRecoveryCodesAction(
  _previous: TwoFactorState,
  formData: FormData,
): Promise<TwoFactorState> {
  const staff = await requireStaff();

  const password = String(formData.get("password") ?? "");
  const record = await prisma.staff.findUnique({
    where: { id: staff.id },
    select: { passwordHash: true },
  });
  if (!record || !(await verifyPassword(password, record.passwordHash))) {
    return { fieldErrors: { password: "That password is incorrect." } };
  }

  const recoveryCodes = await regenerateRecoveryCodes(staff.id);

  await recordAuditEvent({
    actorId: staff.id,
    actorEmail: staff.email,
    action: "TWO_FACTOR_RECOVERY_CODES_REGENERATED",
    entityType: "Staff",
    entityId: staff.id,
    summary: "Recovery codes regenerated",
  });

  revalidatePath("/admin/profile");
  return {
    success: "New recovery codes generated. The previous ones no longer work.",
    recoveryCodes,
  };
}

export async function disableTwoFactorAction(
  _previous: TwoFactorState,
  formData: FormData,
): Promise<TwoFactorState> {
  const staff = await requireStaff();

  // Turning off a security control requires proving identity again, otherwise
  // an unattended session is enough to strip the second factor.
  const password = String(formData.get("password") ?? "");
  const record = await prisma.staff.findUnique({
    where: { id: staff.id },
    select: { passwordHash: true },
  });
  if (!record || !(await verifyPassword(password, record.passwordHash))) {
    return { fieldErrors: { password: "That password is incorrect." } };
  }

  await disableTwoFactor(staff.id);

  await recordAuditEvent({
    actorId: staff.id,
    actorEmail: staff.email,
    action: "TWO_FACTOR_DISABLED",
    entityType: "Staff",
    entityId: staff.id,
    summary: "Two-factor authentication disabled",
  });

  revalidatePath("/admin/profile");
  return { success: "Two-factor authentication is off." };
}

export async function revokeSessionAction(
  _previous: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const staff = await requireStaff();
  const sessionId = String(formData.get("sessionId") ?? "");

  if (sessionId === staff.sessionId) {
    // Ending the current session is signing out, and is offered as such.
    await revokeSession(sessionId, staff.id);
    await signOut({ redirectTo: "/login" });
    return {};
  }

  const revoked = await revokeSession(sessionId, staff.id);
  if (!revoked) return { error: "That session has already ended." };

  await recordAuditEvent({
    actorId: staff.id,
    actorEmail: staff.email,
    action: "SESSION_REVOKED",
    entityType: "StaffSession",
    entityId: sessionId,
    summary: "Revoked one of their own sessions",
  });

  revalidatePath("/admin/profile");
  return { success: "That session has been signed out." };
}

export async function revokeOtherSessionsAction(
  _previous: ProfileState,
): Promise<ProfileState> {
  const staff = await requireStaff();

  const count = await revokeOtherSessions(staff.id, staff.sessionId);

  await recordAuditEvent({
    actorId: staff.id,
    actorEmail: staff.email,
    action: "SESSIONS_REVOKED_OTHERS",
    entityType: "Staff",
    entityId: staff.id,
    summary: `Signed out ${count} other sessions`,
    metadata: { count },
  });

  revalidatePath("/admin/profile");
  return {
    success:
      count === 0
        ? "There were no other active sessions."
        : `Signed out ${count} other ${count === 1 ? "session" : "sessions"}.`,
  };
}

/** Administrator-initiated two-factor reset lives with staff management. */
export async function requireProfileOrRedirect() {
  const staff = await requireStaff();
  if (!staff) redirect("/login");
  return staff;
}
