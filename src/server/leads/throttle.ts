import { prisma } from "@/server/db";

/**
 * Abuse controls for public forms.
 *
 * No third-party captcha: it would mean sending every visitor's browsing to
 * another company before they have even spoken to us, on a site whose visitors
 * are hospital procurement staff. These three checks — a honeypot, a minimum
 * time on the form, and a per-IP and per-address rate limit — stop the bulk of
 * automated submissions without asking a human to prove anything.
 */

const WINDOW_MINUTES = 60;
const MAX_PER_IP = 8;
const MAX_PER_EMAIL = 5;

/**
 * Below this, nobody read the page before submitting.
 *
 * Measured from when the form was rendered, which for a form inside a dialog
 * means from when the page was served rather than when the dialog opened. That
 * is the honest description of what it catches: a client that fetches a page
 * and posts immediately, including one replaying a captured request with a
 * fresh timestamp of its own.
 */
const MIN_SECONDS_ON_FORM = 3;
/** Above this, the token is stale enough that it is probably replayed. */
const MAX_SECONDS_ON_FORM = 60 * 60 * 6;

export type SubmissionCheck =
  | { ok: true }
  | { ok: false; reason: "honeypot" | "too-fast" | "stale" | "rate-limited" };

export function checkFormTiming(
  honeypot: string,
  startedAt: string,
): SubmissionCheck {
  // A field positioned off-screen and hidden from assistive technology. A
  // person never sees it; a bot filling every input does.
  if (honeypot.trim() !== "") return { ok: false, reason: "honeypot" };

  const started = Number.parseInt(startedAt, 10);
  if (!Number.isFinite(started)) return { ok: false, reason: "stale" };

  const seconds = (Date.now() - started) / 1000;
  if (seconds < MIN_SECONDS_ON_FORM) return { ok: false, reason: "too-fast" };
  if (seconds > MAX_SECONDS_ON_FORM) return { ok: false, reason: "stale" };

  return { ok: true };
}

/**
 * Limits how many enquiries one address or one connection can create.
 *
 * Counted against the leads themselves rather than a separate attempts table:
 * the thing being protected is the sales team's inbox, and a submission that
 * was refused did not fill it.
 */
export async function checkEnquiryRate(
  email: string,
  ipAddress: string | null,
): Promise<SubmissionCheck> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000);

  const byEmail = await prisma.lead.count({
    where: { email, createdAt: { gte: since } },
  });
  if (byEmail >= MAX_PER_EMAIL) return { ok: false, reason: "rate-limited" };

  if (ipAddress) {
    const byIp = await prisma.lead.count({
      where: { ipAddress, createdAt: { gte: since } },
    });
    if (byIp >= MAX_PER_IP) return { ok: false, reason: "rate-limited" };
  }

  return { ok: true };
}

/**
 * The same limit for a built form.
 *
 * Counted against the submissions rather than the leads, because a custom form
 * is not an enquiry and sharing a counter would let a trade-show sign-up sheet
 * lock somebody out of the quotation form.
 */
export async function checkSubmissionRate(
  ipAddress: string | null,
): Promise<SubmissionCheck> {
  if (!ipAddress) return { ok: true };

  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000);
  const count = await prisma.formSubmission.count({
    where: { ipAddress, createdAt: { gte: since } },
  });

  return count >= MAX_PER_IP
    ? { ok: false, reason: "rate-limited" }
    : { ok: true };
}

export const RATE_LIMIT_WINDOW_MINUTES = WINDOW_MINUTES;
