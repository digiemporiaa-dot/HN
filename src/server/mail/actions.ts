"use server";

import { revalidatePath } from "next/cache";

import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import { sendMail } from "./send";
import { testMessage } from "./templates";

export type MailTestState = {
  error?: string;
  success?: string;
};

/**
 * Sends a test message to the configured notification addresses.
 *
 * Mail settings are the one part of this system whose correctness cannot be
 * checked by reading them back. Whoever configures them needs a way to find out
 * now rather than when the first enquiry goes unanswered.
 */
export async function sendTestMailAction(
  _previous: MailTestState,
  _formData: FormData,
): Promise<MailTestState> {
  const actor = await requirePermission("SETTINGS", "MANAGE_SETTINGS");

  const message = testMessage();
  const result = await sendMail({
    kind: "settings.test",
    subject: message.subject,
    text: message.text,
    html: message.html,
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "MAIL_TEST_SENT",
    module: "SETTINGS",
    summary: `Test email — ${result.status.toLowerCase()}`,
  });

  revalidatePath("/admin/settings");

  if (result.status === "SENT") {
    return {
      success:
        "Test message sent. If it does not arrive within a few minutes, check the spam folder and the sender address.",
    };
  }

  if (result.status === "SKIPPED") {
    return { error: `Nothing was sent. ${result.reason}` };
  }

  return { error: `The mail server refused the message: ${result.error}` };
}
