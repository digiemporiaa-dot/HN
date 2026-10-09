import "server-only";

import { recordAuditEvent } from "@/server/audit/log";
import {
  checkEnquiryRate,
  checkFormTiming,
  RATE_LIMIT_WINDOW_MINUTES,
} from "@/server/leads/throttle";
import { requestContext } from "@/server/leads/service";
import { getSiteSettings } from "@/server/settings/service";
import { sendMail } from "@/server/mail/send";
import { customerConfirmation } from "@/server/mail/templates";
import { normalizePath } from "@/lib/popups/rules";

/**
 * The checks every public popup submission passes before anything is stored,
 * in the same order as the existing enquiry form: the abuse checks answer a
 * submission they distrust with a silent success, and the rate limit answers a
 * person plainly.
 */
export type Screening =
  | { ok: true; context: { ipAddress: string | null; userAgent: string | null } }
  | { ok: false; silent: true }
  | { ok: false; silent: false; error: string };

export async function screenSubmission(
  formData: FormData,
  email: string,
  what: string,
): Promise<Screening> {
  const timing = checkFormTiming(
    String(formData.get("website") ?? ""),
    String(formData.get("startedAt") ?? ""),
  );
  const context = await requestContext();
  if (!timing.ok) {
    await recordAuditEvent({
      action: "LEAD_SUBMISSION_REFUSED",
      module: "LEADS",
      summary: `Automated ${what} refused (${timing.reason})`,
      ...context,
    });
    return { ok: false, silent: true };
  }
  const rate = await checkEnquiryRate(email, context.ipAddress);
  if (!rate.ok) {
    return {
      ok: false,
      silent: false,
      error: `We have already received several requests from you in the last ${RATE_LIMIT_WINDOW_MINUTES} minutes. Please call us instead, or try again later.`,
    };
  }
  return { ok: true, context };
}

/** The page a submission says it came from, as a bare path for resolution. */
export function pathFromLanding(landingPage: string | null): string {
  if (!landingPage) return "/";
  return normalizePath(landingPage.split(/[?#]/)[0] || "/");
}

/**
 * The visitor's acknowledgement. Never throws and never changes the answer:
 * the record is already committed, and a mail failure shows on the
 * deliveries screen rather than in front of the customer.
 */
export async function sendCustomerConfirmation(input: {
  to: string;
  leadId: string;
  kind: "quotation" | "download" | "enquiry";
  reference: string;
  name: string;
  items?: Array<{ productName: string; quantity: number }>;
  documentTitle?: string | null;
}): Promise<void> {
  try {
    const { companyName } = await getSiteSettings();
    const message = customerConfirmation({ ...input, companyName });
    await sendMail({
      kind: "lead.confirmation",
      subject: message.subject,
      text: message.text,
      html: message.html,
      entityType: "Lead",
      entityId: input.leadId,
      to: [input.to],
    });
  } catch (error) {
    console.error("Customer confirmation could not be queued", {
      leadId: input.leadId,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}

/** The team notification, on the same terms. */
export async function sendTeamNotification(message: {
  subject: string;
  text: string;
  html: string;
  leadId: string;
}): Promise<void> {
  try {
    await sendMail({
      kind: "lead.notification",
      subject: message.subject,
      text: message.text,
      html: message.html,
      entityType: "Lead",
      entityId: message.leadId,
    });
  } catch (error) {
    console.error("Lead notification could not be queued", {
      leadId: message.leadId,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}
