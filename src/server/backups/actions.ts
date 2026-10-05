"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { RESTORE_CONFIRMATION } from "@/lib/backups/constants";
import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requestContext } from "@/server/http/client";
import { signOut } from "@/server/auth";
import { verifyPassword } from "@/server/auth/password";
import { requirePermission } from "@/server/permissions";
import { invalidateMissingCache } from "@/server/seo/not-found-log";
import { invalidateRedirectCache } from "@/server/seo/redirect-cache";
import { backupConfigured } from "./paths";
import {
  BackupError,
  createBackup,
  deleteBackupFile,
  restoreBackup,
} from "./service";

export type BackupActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
};

function failure(error: unknown, fallback: string): BackupActionState {
  if (error instanceof BackupError) return { error: error.message };
  console.error(fallback, error instanceof Error ? error.message : "unknown");
  return { error: `${fallback} The server log has the details.` };
}

export async function createBackupAction(
  _previous: BackupActionState,
  formData: FormData,
): Promise<BackupActionState> {
  const actor = await requirePermission("BACKUPS", "CREATE");
  if (!backupConfigured()) {
    return { error: "BACKUP_ROOT is not configured on this server." };
  }

  const note = String(formData.get("note") ?? "").trim();
  if (note.length > 200) {
    return { fieldErrors: { note: "Keep the note under 200 characters." } };
  }

  try {
    const backup = await createBackup({
      kind: "MANUAL",
      actor: { id: actor.id, name: actor.name },
      note: note || null,
    });
    await recordAuditEvent({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "BACKUP_CREATED",
      module: "BACKUPS",
      entityType: "Backup",
      entityId: backup.id,
      summary: `Backup ${backup.filename} created`,
      ...(await requestContext()),
    });
    revalidatePath("/admin/backups");
    return { success: "Backup created." };
  } catch (error) {
    revalidatePath("/admin/backups");
    return failure(error, "The backup failed.");
  }
}

export async function deleteBackupAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("BACKUPS", "DELETE");
  const id = String(formData.get("id") ?? "");

  const backup = await prisma.backup.findUnique({
    where: { id },
    select: { id: true, filename: true, status: true },
  });
  if (!backup || backup.status === "RUNNING") {
    redirect("/admin/backups");
  }

  await deleteBackupFile(backup.filename);
  await prisma.backup.delete({ where: { id: backup.id } });
  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "BACKUP_DELETED",
    module: "BACKUPS",
    entityType: "Backup",
    entityId: backup.id,
    summary: `Backup ${backup.filename} deleted`,
    ...(await requestContext()),
  });
  revalidatePath("/admin/backups");
}

/**
 * Replaces the whole site — every table and every uploaded file — with an
 * archive's contents. Requires the RESTORE permission, the staff member's
 * password, and the confirmation word: an unattended session or a misclick
 * must not be able to do this.
 */
export async function restoreBackupAction(
  _previous: BackupActionState,
  formData: FormData,
): Promise<BackupActionState> {
  const actor = await requirePermission("BACKUPS", "RESTORE");
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (confirmation !== RESTORE_CONFIRMATION) {
    fieldErrors.confirmation = `Type ${RESTORE_CONFIRMATION} to confirm.`;
  }
  const record = await prisma.staff.findUnique({
    where: { id: actor.id },
    select: { passwordHash: true },
  });
  if (!record || !(await verifyPassword(password, record.passwordHash))) {
    fieldErrors.password = "That password is incorrect.";
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const backup = await prisma.backup.findUnique({
    where: { id },
    select: { id: true, filename: true },
  });
  if (!backup) return { error: "That backup no longer exists." };

  const context = await requestContext();
  let result;
  try {
    result = await restoreBackup({
      backupId: backup.id,
      actor: { id: actor.id, name: actor.name },
    });
  } catch (error) {
    await recordAuditEvent({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "BACKUP_RESTORE_FAILED",
      module: "BACKUPS",
      entityType: "Backup",
      entityId: backup.id,
      summary: `Restore of ${backup.filename} failed`,
      ...context,
    });
    revalidatePath("/admin/backups");
    return failure(error, "The restore failed; nothing was changed.");
  }

  // Everything held in memory describes the data that was just replaced.
  invalidateRedirectCache();
  invalidateMissingCache();
  revalidatePath("/", "layout");

  // The restored staff table may not contain this account.
  const stillExists = await prisma.staff.findUnique({
    where: { id: actor.id },
    select: { id: true },
  });
  await recordAuditEvent({
    actorId: stillExists ? actor.id : null,
    actorEmail: actor.email,
    action: "BACKUP_RESTORED",
    module: "BACKUPS",
    entityType: "Backup",
    entityId: backup.id,
    summary: `Site restored from ${backup.filename}`,
    metadata: {
      preRestoreBackupId: result.preRestoreId,
      tables: result.tables,
      rows: result.rows,
      files: result.files,
    },
    ...context,
  });

  // The restore signed everyone out, this session included.
  await signOut({ redirectTo: "/login?reason=site-restored" });
  return {};
}
