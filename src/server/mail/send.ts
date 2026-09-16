import "server-only";

import { prisma } from "@/server/db";

import { createTransport, mailConfig } from "./transport";

export type MailRequest = {
  kind: string;
  subject: string;
  text: string;
  html?: string;
  entityType?: string;
  entityId?: string;
  /** Overrides the configured notification list, for a test send. */
  to?: string[];
};

export type MailResult =
  | { status: "SENT"; deliveryId: string }
  | { status: "SKIPPED"; deliveryId: string; reason: string }
  | { status: "FAILED"; deliveryId: string; error: string };

/**
 * Sends a message and records what happened, always.
 *
 * Every path writes a MailDelivery row, including the one where no transport is
 * configured. A site that has not been given SMTP details is not broken, but
 * nobody is being told about its enquiries, and that should be visible as a
 * fact rather than inferred from an empty inbox.
 *
 * This never throws. The caller is generally a form submission that has already
 * stored something the business needs, and losing that to a mail server's bad
 * afternoon would be the worse failure by far.
 */
export async function sendMail(request: MailRequest): Promise<MailResult> {
  const config = await mailConfig();
  const recipients = request.to?.length ? request.to : (config?.notifyTo ?? []);

  const delivery = await prisma.mailDelivery.create({
    data: {
      kind: request.kind,
      recipients: recipients.join(", "),
      subject: request.subject,
      entityType: request.entityType ?? null,
      entityId: request.entityId ?? null,
    },
    select: { id: true },
  });

  if (!config || recipients.length === 0) {
    const reason = !config
      ? "No SMTP host, sender or recipient is configured."
      : "No recipients.";

    await prisma.mailDelivery.update({
      where: { id: delivery.id },
      data: { status: "SKIPPED", error: reason },
    });

    return { status: "SKIPPED", deliveryId: delivery.id, reason };
  }

  try {
    const transport = createTransport(config);
    await transport.sendMail({
      from: config.from,
      to: recipients.join(", "),
      subject: request.subject,
      text: request.text,
      ...(request.html ? { html: request.html } : {}),
    });

    await prisma.mailDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "SENT",
        attempts: { increment: 1 },
        sentAt: new Date(),
      },
    });

    return { status: "SENT", deliveryId: delivery.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 500) : "Unknown error";

    await prisma.mailDelivery.update({
      where: { id: delivery.id },
      data: { status: "FAILED", attempts: { increment: 1 }, error: message },
    });

    // Logged without the message body: a notification carries an enquirer's
    // name, address and what they are buying, and none of that belongs in a
    // server log.
    console.error("Mail delivery failed", {
      deliveryId: delivery.id,
      kind: request.kind,
      message,
    });

    return { status: "FAILED", deliveryId: delivery.id, error: message };
  }
}
