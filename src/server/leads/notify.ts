import "server-only";

import { prisma } from "@/server/db";
import { sendMail } from "@/server/mail/send";
import { assignmentNotification } from "@/server/mail/templates";
import { LEAD_STATUSES } from "@/lib/validation/leads";

/**
 * Tells a salesperson a lead is now theirs.
 *
 * Reads the lead again rather than taking what the caller has: the fields the
 * message carries are not the fields an update was about, and one query is
 * cheaper than threading six of them through every call site. Never throws —
 * the assignment is already saved, and losing that to a mail server's bad
 * afternoon would be the worse failure.
 */
export async function notifyAssignee(
  leadId: string,
  assigneeId: string,
  assignedBy: string,
): Promise<void> {
  const [lead, assignee] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        reference: true,
        name: true,
        email: true,
        phone: true,
        organisation: true,
        productName: true,
        categoryName: true,
        status: true,
      },
    }),
    prisma.staff.findUnique({
      where: { id: assigneeId },
      select: { name: true, email: true, status: true },
    }),
  ]);

  if (!lead || !assignee || assignee.status !== "ACTIVE") return;

  const message = assignmentNotification({
    reference: lead.reference,
    leadId,
    assigneeName: assignee.name,
    assignedBy,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    organisation: lead.organisation,
    about: lead.productName ?? lead.categoryName,
    stage: LEAD_STATUSES.find((entry) => entry.value === lead.status)?.label ?? lead.status,
  });

  await sendMail({
    kind: "lead.assigned",
    subject: message.subject,
    text: message.text,
    html: message.html,
    entityType: "Lead",
    entityId: leadId,
    // To the person it was assigned to, not to the enquiry list: this is a
    // message for one colleague about their own work.
    to: [assignee.email],
  });
}
