import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

import { prisma } from "@/server/db";

/**
 * Builds the outgoing mail transport from settings.
 *
 * The password is read here rather than through getSiteSettings, which is
 * handed to client components and serialised into every page. A secret that
 * lives in that object is a secret that ships to the browser.
 */
export type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string | null;
  password: string | null;
  from: string;
  notifyTo: string[];
};

/**
 * Splits a configured recipient list.
 *
 * Only ever applied to a setting an administrator typed. Nothing a visitor
 * submits reaches an address header anywhere in this module — see the note in
 * templates.ts for why that rule exists.
 */
function parseRecipients(raw: string | null): string[] {
  return (raw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.includes("@") && value.length <= 200)
    .slice(0, 10);
}

export async function mailConfig(): Promise<MailConfig | null> {
  const rows = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          "mail.host",
          "mail.port",
          "mail.secure",
          "mail.user",
          "mail.password",
          "mail.from",
          "mail.notifyTo",
          "contact.email",
        ],
      },
    },
    select: { key: true, value: true },
  });

  const values = new Map(rows.map((row) => [row.key, row.value ?? ""]));
  const host = (values.get("mail.host") ?? "").trim();
  if (!host) return null;

  const from = (values.get("mail.from") ?? "").trim();
  if (!from) return null;

  // Falling back to the public contact address means one setting gets a site
  // notified rather than two.
  const notifyTo = parseRecipients(
    values.get("mail.notifyTo") || values.get("contact.email") || null,
  );
  if (notifyTo.length === 0) return null;

  return {
    host,
    port: Number.parseInt(values.get("mail.port") ?? "587", 10) || 587,
    secure: values.get("mail.secure") === "true",
    user: values.get("mail.user") || null,
    password: values.get("mail.password") || null,
    from,
    notifyTo,
  };
}

export function createTransport(config: MailConfig): Transporter {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    ...(config.user
      ? { auth: { user: config.user, pass: config.password ?? "" } }
      : {}),
    // A hung relay must not hold a request open; the delivery is recorded as
    // failed and can be retried rather than blocking the person who submitted
    // the form.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}
