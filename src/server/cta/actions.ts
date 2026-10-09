"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { fieldErrorsFrom } from "@/lib/validation/field-errors";
import { LEAD_SOURCE_LABELS } from "@/lib/validation/leads";
import { isCtaKey, isCtaKind, isDownloadKind, leadSourceFor } from "@/lib/cta/kinds";
import { isPlacementId } from "@/lib/cta/placements";
import { submissionFromForm, submissionSchema, type Submission } from "@/lib/cta/fields";
import {
  GRANT_TTL_DAYS,
  newGrantToken,
  readLeadContext,
  readSubmissionKey,
  storeLead,
} from "@/server/leads/service";
import { leadNotification } from "@/server/mail/templates";
import { resolveServerCta } from "./service";
import {
  pathFromLanding,
  screenSubmission,
  sendCustomerConfirmation,
  sendTeamNotification,
} from "./intake";

export type CtaState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Set once the lead is stored. Empty for a submission the abuse checks refused. */
  reference?: string;
  /** A download grant's address, issued only after the lead is stored. */
  downloadUrl?: string;
  /** Where to go next, for a configuration that redirects. */
  redirectHref?: string;
};

const NOT_AVAILABLE = "That download is not available any more. Please refresh the page and try again.";

const idOrNull = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "");
  return text && text.length <= 40 && /^[a-z0-9]+$/i.test(text) ? text : null;
};

/**
 * Accepts a lead-capture or gated-download popup.
 *
 * Nothing the browser says about the popup is trusted. It names the kind of
 * button, its placement and the product and document it sits beside; the
 * server resolves the configuration from those itself, validates against that
 * configuration's fields, checks the document belongs to the product, and
 * only then stores the lead and the download grant together. A failure at any
 * step stores nothing and releases nothing.
 */
export async function submitCtaLeadAction(_previous: CtaState, formData: FormData): Promise<CtaState> {
  const kind = String(formData.get("kind") ?? "");
  if (!isCtaKind(kind)) return { error: "This form could not be sent. Please refresh the page and try again." };

  const placement = String(formData.get("placement") ?? "");
  const configKey = String(formData.get("configKey") ?? "");
  const productId = idOrNull(formData.get("productId"));
  const documentId = idOrNull(formData.get("documentId"));
  const leadContext = readLeadContext(formData);

  const cta = await resolveServerCta({
    kind,
    placement: isPlacementId(placement) ? placement : null,
    configKey: isCtaKey(configKey) ? configKey : null,
    productId,
    path: pathFromLanding(leadContext.landingPage),
  });

  if (cta.popupType === "REQUEST_QUOTATION" || cta.popupType === "CUSTOM_FORM") {
    return { error: "This form could not be sent. Please refresh the page and try again." };
  }

  const parsed = submissionSchema(cta.fields).safeParse(submissionFromForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const data = parsed.data as Submission;

  // The file, resolved before anything is stored: an unavailable download is
  // refused outright rather than taking the visitor's details for nothing.
  const product = productId
    ? await prisma.product.findFirst({
        where: { id: productId, deletedAt: null, status: "PUBLISHED" },
        select: { id: true, name: true, modelNumber: true },
      })
    : null;

  let file: { documentId: string | null; mediaId: string | null; title: string } | null = null;
  if (isDownloadKind(kind)) {
    if (kind === "DOWNLOAD_BROCHURE") {
      // The document must be attached to the product the button is on. An id
      // from another product, a deleted file or an unpublished product is the
      // same refusal.
      const document =
        documentId && product
          ? await prisma.productDocument.findFirst({
              where: { id: documentId, productId: product.id, media: { deletedAt: null } },
              select: { id: true, title: true },
            })
          : null;
      if (!document) return { error: NOT_AVAILABLE };
      file = { documentId: document.id, mediaId: null, title: document.title };
    } else {
      // A catalogue is whatever file the configuration names. The request
      // cannot choose one.
      if (!cta.file) return { error: NOT_AVAILABLE };
      file = { documentId: null, mediaId: cta.file.id, title: cta.heading };
    }
  }

  const submissionKey = readSubmissionKey(formData);
  const screening = await screenSubmission(formData, data.email, "popup submission");
  if (!screening.ok) {
    // Told it succeeded, and nothing written or released.
    return screening.silent ? { reference: "" } : { error: screening.error };
  }

  const source = leadSourceFor(kind, Boolean(product));
  const productName = product
    ? product.modelNumber
      ? `${product.name} (${product.modelNumber})`
      : product.name
    : null;
  const token = file ? newGrantToken() : null;

  const stored = await storeLead({
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    organisation: data.company || null,
    city: data.location || null,
    country: data.country || null,
    message: data.message || null,
    source,
    productId: product?.id ?? null,
    productName,
    ctaKey: cta.key,
    ctaPlacement: isPlacementId(placement) ? placement : null,
    submissionKey,
    consentedAt: new Date(),
    consentText: cta.consentText,
    ipAddress: screening.context.ipAddress,
    userAgent: screening.context.userAgent,
    ...leadContext,
    activities: {
      create: {
        kind: "CREATED",
        summary: file
          ? `Download requested — ${file.title}`
          : `Enquiry received — ${LEAD_SOURCE_LABELS[source] ?? source}`,
      },
    },
    ...(file && token
      ? {
          grants: {
            create: {
              token,
              documentId: file.documentId,
              mediaId: file.mediaId,
              expiresAt: new Date(Date.now() + GRANT_TTL_DAYS * 86_400_000),
            },
          },
        }
      : {}),
  });

  if (!stored) return { error: "We could not record your details just now. Please try again." };

  const after = {
    redirectHref: cta.afterSubmit === "REDIRECT" && cta.redirectHref ? cta.redirectHref : undefined,
  };

  if (stored.replayed) {
    // The same submission again: answer as the first time, write nothing.
    const grant = file
      ? await prisma.documentGrant.findFirst({
          where: {
            leadId: stored.id,
            documentId: file.documentId,
            mediaId: file.mediaId,
            expiresAt: { gt: new Date() },
          },
          select: { token: true },
        })
      : null;
    return {
      reference: stored.reference,
      ...(grant ? { downloadUrl: `/api/documents/${grant.token}` } : {}),
      ...after,
    };
  }

  await recordAuditEvent({
    action: "LEAD_CREATED",
    module: "LEADS",
    entityType: "Lead",
    entityId: stored.id,
    summary: `${stored.reference} — ${(LEAD_SOURCE_LABELS[source] ?? source).toLowerCase()}`,
    metadata: {
      source,
      ctaKey: cta.key,
      ctaKind: kind,
      placement: isPlacementId(placement) ? placement : null,
      productId: product?.id ?? null,
      documentId: file?.documentId ?? null,
      mediaId: file?.mediaId ?? null,
    },
    ...screening.context,
  });

  const notification = leadNotification({
    reference: stored.reference,
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    organisation: data.company || null,
    city: [data.location, data.country].filter(Boolean).join(", ") || null,
    message: [file ? `Requested: ${file.title}` : "", data.message ?? ""].filter(Boolean).join("\n\n") || null,
    productName,
    landingPage: leadContext.landingPage,
    source,
    leadId: stored.id,
  });
  await sendTeamNotification({ ...notification, leadId: stored.id });
  await sendCustomerConfirmation({
    to: data.email,
    leadId: stored.id,
    kind: file ? "download" : "enquiry",
    reference: stored.reference,
    name: data.name,
    documentTitle: file?.title ?? null,
  });

  revalidatePath("/admin/leads");
  return {
    reference: stored.reference,
    ...(token ? { downloadUrl: `/api/documents/${token}` } : {}),
    ...after,
  };
}
