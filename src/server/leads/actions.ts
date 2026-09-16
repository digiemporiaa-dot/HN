"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import { fieldErrorsFrom } from "@/lib/validation/field-errors";
import {
  CONSENT_TEXT,
  enquirySchema,
  leadIdSchema,
  leadNoteSchema,
  leadUpdateSchema,
} from "@/lib/validation/leads";
import {
  checkEnquiryRate,
  checkFormTiming,
  RATE_LIMIT_WINDOW_MINUTES,
} from "./throttle";
import { GRANT_TTL_DAYS, newGrantToken, nextLeadReference } from "./service";
import { sendMail } from "@/server/mail/send";
import { leadNotification } from "@/server/mail/templates";

export type EnquiryState = {
  error?: string;
  /** Set once the enquiry is stored, so the form can say what happens next. */
  reference?: string;
  /** A download link, when the enquiry was made to reach a gated document. */
  downloadUrl?: string;
  fieldErrors?: Record<string, string>;
};

async function requestContext() {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  return {
    ipAddress:
      forwarded?.split(",")[0]?.trim() ?? headerList.get("x-real-ip") ?? null,
    userAgent: headerList.get("user-agent")?.slice(0, 512) ?? null,
  };
}

/**
 * Captures an enquiry from the public site.
 *
 * Two things are deliberate. A submission caught by the abuse checks is told it
 * succeeded and stores nothing: an automated submitter that learns which of its
 * attempts were refused learns how to get past the check. And a rate-limited
 * person is told plainly, because they are a person.
 */
export async function submitEnquiryAction(
  _previous: EnquiryState,
  formData: FormData,
): Promise<EnquiryState> {
  const parsed = enquirySchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    organisation: formData.get("organisation") ?? "",
    city: formData.get("city") ?? "",
    message: formData.get("message") ?? "",
    consent: formData.get("consent") === "on",
  });

  // Validation runs before the abuse checks, and this order matters. The
  // checks answer a submission they distrust with a silent success, and a
  // person who leaves a field blank and presses send quickly would otherwise
  // be thanked for an enquiry that was never stored. An automated submitter
  // learns nothing from field errors it could not read off the form anyway.
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const timing = checkFormTiming(
    String(formData.get("website") ?? ""),
    String(formData.get("startedAt") ?? ""),
  );

  if (!timing.ok) {
    await recordAuditEvent({
      action: "LEAD_SUBMISSION_REFUSED",
      module: "LEADS",
      summary: `Automated submission refused (${timing.reason})`,
      ...(await requestContext()),
    });
    // Told it succeeded, and nothing written. A submitter that learns which of
    // its attempts were refused learns how to get past the check.
    return { reference: "" };
  }

  const context = await requestContext();
  const rate = await checkEnquiryRate(parsed.data.email, context.ipAddress);
  if (!rate.ok) {
    return {
      error: `We have already received several enquiries from you in the last ${RATE_LIMIT_WINDOW_MINUTES} minutes. Please call us instead, or try again later.`,
    };
  }

  const productId = String(formData.get("productId") ?? "");
  const documentId = String(formData.get("documentId") ?? "");

  // Both are resolved from the database rather than trusted from the form: the
  // product name stored on the enquiry has to be the real one, and a document
  // id must actually be gated before it earns a download grant.
  const product = productId
    ? await prisma.product.findFirst({
        where: { id: productId, deletedAt: null, status: "PUBLISHED" },
        select: { id: true, name: true, modelNumber: true },
      })
    : null;

  const document = documentId
    ? await prisma.productDocument.findFirst({
        where: { id: documentId, gated: true, media: { deletedAt: null } },
        select: { id: true, title: true, productId: true },
      })
    : null;

  // Derived from what the submission actually carries rather than from a field
  // the form could claim: a request with a gated document is a document
  // request, one naming a product is a product enquiry, and one with neither
  // came from a form on a page.
  const source = document
    ? "DOCUMENT_DOWNLOAD"
    : product
      ? "PRODUCT_ENQUIRY"
      : "CONTACT_FORM";

  // The reference is unique at the column, so a collision between two enquiries
  // arriving together fails the insert rather than duplicating a number.
  let lead: { id: string; reference: string } | null = null;
  for (let attempt = 0; attempt < 5 && !lead; attempt += 1) {
    const reference = await nextLeadReference();
    try {
      lead = await prisma.lead.create({
        data: {
          reference,
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone || null,
          organisation: parsed.data.organisation || null,
          city: parsed.data.city || null,
          message: parsed.data.message || null,
          source,
          productId: product?.id ?? null,
          productName: product
            ? product.modelNumber
              ? `${product.name} (${product.modelNumber})`
              : product.name
            : null,
          consentedAt: new Date(),
          consentText: CONSENT_TEXT,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
        select: { id: true, reference: true },
      });
    } catch {
      // Taken in the moment between counting and inserting; count again.
    }
  }

  if (!lead) {
    return {
      error: "We could not record your enquiry just now. Please try again.",
    };
  }

  let downloadUrl: string | undefined;
  if (document) {
    const token = newGrantToken();
    await prisma.documentGrant.create({
      data: {
        token,
        leadId: lead.id,
        documentId: document.id,
        expiresAt: new Date(Date.now() + GRANT_TTL_DAYS * 86_400_000),
      },
    });
    downloadUrl = `/api/documents/${token}`;
  }

  await recordAuditEvent({
    action: "LEAD_CREATED",
    module: "LEADS",
    entityType: "Lead",
    entityId: lead.id,
    summary: `${lead.reference} — ${source.toLowerCase().replace("_", " ")}`,
    metadata: { source, productId: product?.id ?? null },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  // Notification comes after the enquiry is committed, and its outcome never
  // changes the answer the visitor gets. Their enquiry is safely recorded; a
  // mail server having a bad afternoon is the sales team's problem to see on
  // the deliveries screen, not a reason to tell a hospital that their request
  // failed.
  const notification = leadNotification({
    reference: lead.reference,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    organisation: parsed.data.organisation || null,
    city: parsed.data.city || null,
    message: parsed.data.message || null,
    productName: product
      ? product.modelNumber
        ? `${product.name} (${product.modelNumber})`
        : product.name
      : null,
    source,
    leadId: lead.id,
  });

  await sendMail({
    kind: "lead.notification",
    subject: notification.subject,
    text: notification.text,
    html: notification.html,
    entityType: "Lead",
    entityId: lead.id,
  });

  revalidatePath("/admin/leads");
  return { reference: lead.reference, downloadUrl };
}

/* -------------------------------------------------------------------------
 * Administration
 * ---------------------------------------------------------------------- */

export type LeadActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

function revalidateLeads(): void {
  revalidatePath("/admin/leads");
  revalidatePath("/admin/leads/[id]", "page");
}

export async function updateLeadAction(
  _previous: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const actor = await requirePermission("LEADS", "EDIT");

  const parsed = leadUpdateSchema.safeParse({
    leadId: formData.get("leadId"),
    status: formData.get("status"),
    assignedToId: formData.get("assignedToId") ?? "",
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const lead = await prisma.lead.findFirst({
    where: { id: parsed.data.leadId, deletedAt: null },
    select: { id: true, reference: true, status: true, assignedToId: true },
  });
  if (!lead) return { error: "That enquiry no longer exists." };

  // Reassignment is its own permission: deciding who works a lead is a
  // management act, not an edit.
  if (parsed.data.assignedToId !== (lead.assignedToId ?? "")) {
    await requirePermission("LEADS", "ASSIGN");
  }

  const assignee = parsed.data.assignedToId
    ? await prisma.staff.findFirst({
        where: { id: parsed.data.assignedToId, status: "ACTIVE" },
        select: { id: true, name: true },
      })
    : null;

  if (parsed.data.assignedToId && !assignee) {
    return {
      fieldErrors: { assignedToId: "That staff member is not active." },
    };
  }

  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: parsed.data.status, assignedToId: assignee?.id ?? null },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "LEAD_UPDATED",
    module: "LEADS",
    entityType: "Lead",
    entityId: lead.id,
    summary: `${lead.reference} — ${parsed.data.status}${assignee ? `, ${assignee.name}` : ", unassigned"}`,
    metadata: { from: lead.status, to: parsed.data.status },
  });

  revalidateLeads();
  return { success: "Enquiry updated." };
}

export async function addLeadNoteAction(
  _previous: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const actor = await requirePermission("LEADS", "EDIT");

  const parsed = leadNoteSchema.safeParse({
    leadId: formData.get("leadId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const lead = await prisma.lead.findFirst({
    where: { id: parsed.data.leadId, deletedAt: null },
    select: { id: true, reference: true },
  });
  if (!lead) return { error: "That enquiry no longer exists." };

  await prisma.leadNote.create({
    data: {
      leadId: lead.id,
      authorId: actor.id,
      authorName: actor.name,
      body: parsed.data.body,
    },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "LEAD_NOTE_ADDED",
    module: "LEADS",
    entityType: "Lead",
    entityId: lead.id,
    summary: `Note added to ${lead.reference}`,
  });

  revalidateLeads();
  return { success: "Note added." };
}

export async function deleteLeadAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("LEADS", "DELETE");

  const parsed = leadIdSchema.safeParse({ leadId: formData.get("leadId") });
  if (!parsed.success) redirect("/admin/leads");

  const lead = await prisma.lead.findFirst({
    where: { id: parsed.data.leadId, deletedAt: null },
    select: { id: true, reference: true },
  });
  if (!lead) redirect("/admin/leads");

  await prisma.lead.update({
    where: { id: lead.id },
    data: { deletedAt: new Date() },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "LEAD_DELETED",
    module: "LEADS",
    entityType: "Lead",
    entityId: lead.id,
    summary: `Deleted ${lead.reference}`,
  });

  revalidateLeads();
  redirect("/admin/leads");
}

export async function restoreLeadAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("LEADS", "EDIT");

  const parsed = leadIdSchema.safeParse({ leadId: formData.get("leadId") });
  if (!parsed.success) return;

  const lead = await prisma.lead.findFirst({
    where: { id: parsed.data.leadId, deletedAt: { not: null } },
    select: { id: true, reference: true },
  });
  if (!lead) return;

  await prisma.lead.update({
    where: { id: lead.id },
    data: { deletedAt: null },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "LEAD_RESTORED",
    module: "LEADS",
    entityType: "Lead",
    entityId: lead.id,
    summary: `Restored ${lead.reference}`,
  });

  revalidateLeads();
}
