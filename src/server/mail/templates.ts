import "server-only";

import { appUrl } from "@/lib/site-config";

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
  source: string;
  leadId: string;
};

const SOURCE_LABELS: Record<string, string> = {
  PRODUCT_ENQUIRY: "Product enquiry",
  DOCUMENT_DOWNLOAD: "Document request",
  CONTACT_FORM: "Contact form",
  RFQ: "Quotation request",
};

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
    ["Source", label],
  ];

  const text = [
    `${label}${about}`,
    "",
    ...rows.map(([key, value]) => `${key}: ${value}`),
    "",
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
