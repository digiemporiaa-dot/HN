"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import { recordLeadActivity } from "@/server/leads/activity";
import { notifyAssignee } from "@/server/leads/notify";
import { leadStageFor, quoteStatusLabel, quoteStatusSchema } from "@/lib/quotes/status";
import { LEAD_STATUSES } from "@/lib/validation/leads";

export type QuoteActionState = { error?: string; success?: string; fieldErrors?: Record<string, string> };

const idSchema = z.string().trim().regex(/^[a-z0-9]{8,40}$/i);

/**
 * A quotation request by id. Only leads whose source is RFQ: an id belonging
 * to any other enquiry is "not found" here, so these actions cannot be pointed
 * at records outside the Quotations module.
 */
async function findQuotation(leadId: unknown) {
  const id = idSchema.safeParse(leadId);
  if (!id.success) return null;
  return prisma.lead.findFirst({
    where: { id: id.data, source: "RFQ", deletedAt: null },
    select: {
      id: true,
      reference: true,
      status: true,
      assignedToId: true,
      assignedTo: { select: { name: true } },
      quote: { select: { status: true } },
    },
  });
}

function revalidateQuote(id: string) {
  revalidatePath("/admin/rfqs");
  revalidatePath(`/admin/rfqs/${id}`);
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
}

const stageLabel = (value: string) => LEAD_STATUSES.find((entry) => entry.value === value)?.label ?? value;

/** Moves a quotation to another status. Never creates an order. */
export async function updateQuoteStatusAction(_previous: QuoteActionState, formData: FormData): Promise<QuoteActionState> {
  const actor = await requirePermission("RFQ", "EDIT");
  const status = quoteStatusSchema.safeParse(formData.get("status"));
  if (!status.success) return { error: "Choose a status from the list." };

  const lead = await findQuotation(formData.get("leadId"));
  if (!lead) return { error: "That quotation request no longer exists." };

  const from = lead.quote?.status ?? "NEW";
  if (from === status.data) return { success: "No change." };

  const stage = leadStageFor(status.data);
  const moveStage = stage !== null && stage !== lead.status;

  await prisma.$transaction(async (tx) => {
    await tx.quoteRequest.upsert({
      where: { leadId: lead.id },
      create: { leadId: lead.id, status: status.data, statusChangedAt: new Date() },
      update: { status: status.data, statusChangedAt: new Date() },
    });
    if (moveStage) await tx.lead.update({ where: { id: lead.id }, data: { status: stage } });
    await tx.leadActivity.create({
      data: {
        leadId: lead.id,
        kind: "STAGE_CHANGED",
        summary: `Quotation moved from ${quoteStatusLabel(from)} to ${quoteStatusLabel(status.data)}${
          moveStage ? `; stage set to ${stageLabel(stage!)}` : ""
        }`,
        actorId: actor.id,
        actorName: actor.name,
      },
    });
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "QUOTE_STATUS_CHANGED",
    module: "RFQ",
    entityType: "Lead",
    entityId: lead.id,
    summary: `${lead.reference} — ${quoteStatusLabel(from)} → ${quoteStatusLabel(status.data)}`,
    metadata: { from, to: status.data, leadStage: moveStage ? stage : null },
  });

  revalidateQuote(lead.id);
  return { success: `Status set to ${quoteStatusLabel(status.data)}.` };
}

/** Assigns a quotation to an active member of staff, or to nobody. */
export async function assignQuoteAction(_previous: QuoteActionState, formData: FormData): Promise<QuoteActionState> {
  const actor = await requirePermission("RFQ", "ASSIGN");
  const lead = await findQuotation(formData.get("leadId"));
  if (!lead) return { error: "That quotation request no longer exists." };

  const posted = String(formData.get("assignedToId") ?? "");
  // The assignee is looked up, never trusted: an unknown or inactive id is
  // refused rather than stored.
  const assignee = posted
    ? idSchema.safeParse(posted).success
      ? await prisma.staff.findFirst({ where: { id: posted, status: "ACTIVE" }, select: { id: true, name: true } })
      : null
    : null;
  if (posted && !assignee) return { fieldErrors: { assignedToId: "That staff member is not active." } };
  if ((assignee?.id ?? null) === lead.assignedToId) return { success: "No change." };

  await prisma.lead.update({ where: { id: lead.id }, data: { assignedToId: assignee?.id ?? null } });
  await recordLeadActivity({
    leadId: lead.id,
    kind: "ASSIGNED",
    summary: assignee ? `Assigned to ${assignee.name}` : `Unassigned from ${lead.assignedTo?.name ?? "nobody"}`,
    actorId: actor.id,
    actorName: actor.name,
  });
  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "QUOTE_ASSIGNED",
    module: "RFQ",
    entityType: "Lead",
    entityId: lead.id,
    summary: `${lead.reference} — ${assignee ? `assigned to ${assignee.name}` : "unassigned"}`,
    metadata: { from: lead.assignedToId, to: assignee?.id ?? null },
  });
  if (assignee && assignee.id !== actor.id) await notifyAssignee(lead.id, assignee.id, actor.name);

  revalidateQuote(lead.id);
  return { success: assignee ? `Assigned to ${assignee.name}.` : "Unassigned." };
}

const noteSchema = z.string().trim().min(1, "Write something first").max(4000, "Keep a note under 4,000 characters");

/** An internal note: for the team only, never exported or sent to the customer. */
export async function addQuoteNoteAction(_previous: QuoteActionState, formData: FormData): Promise<QuoteActionState> {
  const actor = await requirePermission("RFQ", "EDIT");
  const body = noteSchema.safeParse(formData.get("body"));
  if (!body.success) return { fieldErrors: { body: body.error.issues[0]?.message ?? "Write something first" } };
  const lead = await findQuotation(formData.get("leadId"));
  if (!lead) return { error: "That quotation request no longer exists." };

  await prisma.$transaction([
    prisma.leadNote.create({
      data: { leadId: lead.id, kind: "INTERNAL", body: body.data, authorId: actor.id, authorName: actor.name },
    }),
    prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        kind: "COMMENT_ADDED",
        summary: "Internal note added",
        actorId: actor.id,
        actorName: actor.name,
      },
    }),
  ]);
  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "QUOTE_NOTE_ADDED",
    module: "RFQ",
    entityType: "Lead",
    entityId: lead.id,
    // The note itself is not copied into the audit log.
    summary: `${lead.reference} — internal note added`,
  });

  revalidateQuote(lead.id);
  return { success: "Note added." };
}
