import "server-only";

import { appUrl } from "@/lib/site-config";

/**
 * The message a built form produces.
 *
 * The same rule as every other notification here: nothing a visitor typed goes
 * into a header. The subject carries the form's name, which is ours, and the
 * answers appear in the body as text.
 */
export type SubmissionNotification = {
  formName: string;
  submissionId: string;
  fields: Array<{ key: string; label: string }>;
  answers: Record<string, string | string[]>;
  fileCount: number;
};

const escape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function submissionNotification(input: SubmissionNotification): {
  subject: string;
  text: string;
  html: string;
} {
  const link = new URL(
    `/admin/forms?submission=${input.submissionId}`,
    appUrl(),
  ).toString();

  // Walked in the form's own field order rather than the answers' key order, so
  // the message reads the way the form did.
  const rows = input.fields.map((field): [string, string] => {
    const value = input.answers[field.key];
    return [
      field.label,
      Array.isArray(value) ? value.join(", ") : (value ?? "—"),
    ];
  });

  const text = [
    `${input.formName} — new submission`,
    "",
    ...rows.map(([label, value]) => `${label}: ${value || "—"}`),
    ...(input.fileCount > 0
      ? [
          "",
          `${input.fileCount} file(s) attached — open the admin to download.`,
        ]
      : []),
    "",
    `Open in the admin: ${link}`,
  ].join("\n");

  const html = [
    `<p style="margin:0 0 16px"><strong>${escape(input.formName)}</strong> — new submission</p>`,
    '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font:14px/1.5 system-ui,sans-serif">',
    ...rows.map(
      ([label, value]) =>
        `<tr><td style="padding:2px 16px 2px 0;color:#667;vertical-align:top">${escape(label)}</td><td style="padding:2px 0;white-space:pre-wrap">${escape(value || "—")}</td></tr>`,
    ),
    "</table>",
    ...(input.fileCount > 0
      ? [
          `<p style="margin:16px 0 0;color:#667;font:14px/1.5 system-ui,sans-serif">${input.fileCount} file(s) attached — open the admin to download.</p>`,
        ]
      : []),
    `<p style="margin:24px 0 0"><a href="${escape(link)}">Open in the admin</a></p>`,
  ].join("");

  return {
    // The form's name is ours; nothing the visitor typed shapes a header.
    subject: `${input.formName} — new submission`,
    text,
    html,
  };
}
