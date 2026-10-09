import "server-only";

import { appUrl } from "@/lib/site-config";
import { LEAD_SOURCE_LABELS } from "@/lib/validation/leads";

/**
 * The message a new enquiry produces.
 *
 * One rule shapes all of this: nothing a visitor typed is ever put in a header.
 * Not the To, not the Reply-To, not the subject. The enquirer's address appears
 * in the body as text, and the sales team replies from the admin screen, which
 * has a mailto link for exactly that. Address headers are parsed by the mail
 * library before they are sent, and keeping untrusted text out of that parser
 * removes a whole class of problem rather than arguing about which inputs are
 * safe enough for it.
 */
export type LeadNotification = {
  reference: string;
  name: string;
  email: string;
  phone: string | null;
  organisation: string | null;
  city: string | null;
  message: string | null;
  productName: string | null;
  categoryName?: string | null;
  landingCityName?: string | null;
  landingPage?: string | null;
  /** The list on a quotation request. Names come from the catalogue, notes do not. */
  items?: Array<{
    productName: string;
    modelNumber: string | null;
    quantity: number;
    notes: string | null;
  }>;
  source: string;
  leadId: string;
};

const SOURCE_LABELS = LEAD_SOURCE_LABELS;

/** Escapes text for the HTML part. The plain-text part needs no escaping. */
const escape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function leadNotification(lead: LeadNotification): {
  subject: string;
  text: string;
  html: string;
} {
  const label = SOURCE_LABELS[lead.source] ?? "Enquiry";
  const about = lead.productName ? ` — ${lead.productName}` : "";
  const link = new URL(`/admin/leads/${lead.leadId}`, appUrl()).toString();

  const rows: Array<[string, string]> = [
    ["Reference", lead.reference],
    ["Name", lead.name],
    ["Email", lead.email],
    ...(lead.phone ? ([["Phone", lead.phone]] as Array<[string, string]>) : []),
    ...(lead.organisation
      ? ([["Organisation", lead.organisation]] as Array<[string, string]>)
      : []),
    ...(lead.city ? ([["City", lead.city]] as Array<[string, string]>) : []),
    ...(lead.productName
      ? ([["Product", lead.productName]] as Array<[string, string]>)
      : []),
    ...(lead.categoryName
      ? ([["Category", lead.categoryName]] as Array<[string, string]>)
      : []),
    ...(lead.landingCityName
      ? ([["City page", lead.landingCityName]] as Array<[string, string]>)
      : []),
    ...(lead.landingPage
      ? ([["Sent from", lead.landingPage]] as Array<[string, string]>)
      : []),
    ["Source", label],
  ];

  const items = lead.items ?? [];
  const itemLine = (item: NonNullable<LeadNotification["items"]>[number]) =>
    [
      `${item.quantity} \u00d7 ${item.productName}`,
      item.modelNumber ? ` (${item.modelNumber})` : "",
      item.notes ? ` — ${item.notes}` : "",
    ].join("");

  const text = [
    `${label}${about}`,
    "",
    ...rows.map(([key, value]) => `${key}: ${value}`),
    "",
    ...(items.length
      ? [
          "Products requested:",
          ...items.map((item) => `  ${itemLine(item)}`),
          "",
        ]
      : []),
    ...(lead.message ? ["Message:", lead.message, ""] : []),
    `Open in the admin: ${link}`,
  ].join("\n");

  const html = [
    `<p style="margin:0 0 16px"><strong>${escape(label)}</strong>${
      about ? escape(about) : ""
    }</p>`,
    '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font:14px/1.5 system-ui,sans-serif">',
    ...rows.map(
      ([key, value]) =>
        `<tr><td style="padding:2px 16px 2px 0;color:#667">${escape(key)}</td><td style="padding:2px 0">${escape(value)}</td></tr>`,
    ),
    "</table>",
    ...(items.length
      ? [
          '<p style="margin:16px 0 4px;color:#667">Products requested</p>',
          '<ul style="margin:0;padding-left:20px;font:14px/1.6 system-ui,sans-serif">',
          ...items.map((item) => `<li>${escape(itemLine(item))}</li>`),
          "</ul>",
        ]
      : []),
    ...(lead.message
      ? [
          '<p style="margin:16px 0 4px;color:#667">Message</p>',
          `<p style="margin:0;white-space:pre-wrap">${escape(lead.message)}</p>`,
        ]
      : []),
    `<p style="margin:24px 0 0"><a href="${escape(link)}">Open in the admin</a></p>`,
  ].join("");

  return {
    // The reference and the product are ours; the enquirer's own words are not
    // in the subject, so nothing they type can shape a header.
    subject: `${label}${about} — ${lead.reference}`,
    text,
    html,
  };
}

export function testMessage(): { subject: string; text: string; html: string } {
  return {
    subject: "Test message from your website",
    text: [
      "This is a test of the website's outgoing mail settings.",
      "",
      "If you are reading it, enquiries submitted on the site will reach this address.",
    ].join("\n"),
    html: '<p style="font:14px/1.5 system-ui,sans-serif">This is a test of the website\'s outgoing mail settings.</p><p style="font:14px/1.5 system-ui,sans-serif">If you are reading it, enquiries submitted on the site will reach this address.</p>',
  };
}

/**
 * The message a salesperson gets when a lead becomes theirs.
 *
 * Nothing the enquirer typed is in the subject — the reference and the stage
 * are ours. The body carries the contact details because the point of the
 * message is that somebody can act on it without opening anything first.
 */
export function assignmentNotification(input: {
  reference: string;
  leadId: string;
  assigneeName: string;
  assignedBy: string;
  name: string;
  email: string;
  phone: string | null;
  organisation: string | null;
  about: string | null;
  stage: string;
}): { subject: string; text: string; html: string } {
  const link = new URL(`/admin/leads/${input.leadId}`, appUrl()).toString();

  const rows: Array<[string, string]> = [
    ["Reference", input.reference],
    ["Contact", input.name],
    ["Email", input.email],
    ...(input.phone
      ? ([["Phone", input.phone]] as Array<[string, string]>)
      : []),
    ...(input.organisation
      ? ([["Organisation", input.organisation]] as Array<[string, string]>)
      : []),
    ...(input.about
      ? ([["About", input.about]] as Array<[string, string]>)
      : []),
    ["Stage", input.stage],
    ["Assigned by", input.assignedBy],
  ];

  const text = [
    `${input.assigneeName}, ${input.reference} is now yours.`,
    "",
    ...rows.map(([key, value]) => `${key}: ${value}`),
    "",
    `Open in the admin: ${link}`,
  ].join("\n");

  const html = [
    `<p style="margin:0 0 16px;font:14px/1.5 system-ui,sans-serif">${escape(input.assigneeName)}, <strong>${escape(input.reference)}</strong> is now yours.</p>`,
    '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font:14px/1.5 system-ui,sans-serif">',
    ...rows.map(
      ([key, value]) =>
        `<tr><td style="padding:2px 16px 2px 0;color:#667">${escape(key)}</td><td style="padding:2px 0">${escape(value)}</td></tr>`,
    ),
    "</table>",
    `<p style="margin:24px 0 0"><a href="${escape(link)}">Open in the admin</a></p>`,
  ].join("");

  return {
    subject: `${input.reference} assigned to you`,
    text,
    html,
  };
}

/**
 * A "forgot password" link. Sent only to the address on the account; the
 * address someone typed into the form is never the recipient.
 */
export function passwordResetMessage(input: {
  name: string;
  link: string;
  minutes: number;
  companyName: string;
}): { subject: string; text: string; html: string } {
  const text = [
    `Hello ${input.name},`,
    "",
    `Someone asked to reset the password for your ${input.companyName} admin account.`,
    `To choose a new password, open this link within ${input.minutes} minutes:`,
    "",
    input.link,
    "",
    "The link works once. If you did not ask for this, ignore this message: your password has not changed.",
    "Two-factor authentication, if you use it, is still required when you sign in.",
  ].join("\n");

  const p = (body: string) => `<p style="font:14px/1.6 system-ui,sans-serif;margin:0 0 14px">${body}</p>`;
  const html = [
    p(`Hello ${escape(input.name)},`),
    p(`Someone asked to reset the password for your ${escape(input.companyName)} admin account. To choose a new password, use the button below within ${input.minutes} minutes.`),
    `<p style="margin:20px 0"><a href="${escape(input.link)}" style="display:inline-block;background:#0b0d0f;color:#ffffff;text-decoration:none;font:600 14px system-ui,sans-serif;padding:12px 20px;border-radius:999px">Choose a new password</a></p>`,
    p(`Or paste this address into your browser:<br><span style="word-break:break-all;color:#45505a">${escape(input.link)}</span>`),
    p("The link works once. If you did not ask for this, ignore this message: your password has not changed."),
  ].join("");

  return { subject: `Reset your ${input.companyName} admin password`, text, html };
}
