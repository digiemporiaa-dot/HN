"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { fieldErrorsFrom } from "@/lib/validation/field-errors";
import { MAX_RFQ_LINES, mergeLines, rfqLinesSchema } from "@/lib/validation/rfq";
import { isCtaKey } from "@/lib/cta/kinds";
import { isPlacementId } from "@/lib/cta/placements";
import { submissionFromForm, submissionSchema, type Submission } from "@/lib/cta/fields";
import { readLeadContext, readSubmissionKey, storeLead } from "@/server/leads/service";
import { quoteLineProducts, type QuoteLineProduct } from "@/server/products/public";
import { leadNotification } from "@/server/mail/templates";
import { resolveServerCta } from "@/server/cta/service";
import {
  pathFromLanding,
  screenSubmission,
  sendCustomerConfirmation,
  sendTeamNotification,
} from "@/server/cta/intake";

export type QuoteState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Set once the request is stored. Empty for one the abuse checks refused. */
  reference?: string;
  redirectHref?: string;
};

/**
 * Catalogue search for the quotation builder: published products only, and
 * only what a card would show. Nothing is recorded.
 */
export async function searchQuoteProductsAction(query: unknown): Promise<QuoteLineProduct[]> {
  if (typeof query !== "string") return [];
  const text = query.trim().slice(0, 80);
  if (text.length < 2) return [];
  const rows = await prisma.product.findMany({
    where: {
      deletedAt: null,
      status: "PUBLISHED",
      OR: [
        { name: { contains: text, mode: "insensitive" } },
        { modelNumber: { contains: text, mode: "insensitive" } },
        { brand: { name: { contains: text, mode: "insensitive" }, status: "PUBLISHED" } },
      ],
    },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
    take: 8,
    select: { id: true },
  });
  return quoteLineProducts(rows.map((row) => row.id));
}

/**
 * Stores a quotation request.
 *
 * The browser sends product ids, quantities and notes, and the customer's
 * details. Everything else is the server's: the configuration that decides
 * which details are required, the product names and model numbers stored on
 * each line, the status (New), the owner (nobody) and the reference. No
 * price is accepted or stored; a quotation request never becomes an order.
 *
 * The lead, its lines, its quotation row and its first history entry are one
 * INSERT: the request is stored completely or not at all. A repeat of the same
 * submission returns the first one's reference.
 */
export async function submitQuotationAction(_previous: QuoteState, formData: FormData): Promise<QuoteState> {
  const placement = String(formData.get("placement") ?? "");
  const configKey = String(formData.get("configKey") ?? "");
  const leadContext = readLeadContext(formData);

  const cta = await resolveServerCta({
    kind: "REQUEST_QUOTATION",
    placement: isPlacementId(placement) ? placement : null,
    configKey: isCtaKey(configKey) ? configKey : null,
    productId: null,
    path: pathFromLanding(leadContext.landingPage),
  });
  const parsed = submissionSchema(cta.fields).safeParse(submissionFromForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const data = parsed.data as Submission;

  let posted: unknown = [];
  try {
    posted = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    // Not our JSON: treated as an empty list below.
  }
  const lines = rfqLinesSchema.safeParse(posted);
  if (!lines.success) {
    return { error: "Add at least one product to your quotation before sending it." };
  }
  const merged = mergeLines(lines.data).slice(0, MAX_RFQ_LINES);

  const submissionKey = readSubmissionKey(formData);
  const screening = await screenSubmission(formData, data.email, "quotation request");
  if (!screening.ok) return screening.silent ? { reference: "" } : { error: screening.error };

  // Names, model numbers and availability from the catalogue, in the order
  // the visitor arranged the lines. A withdrawn product is dropped.
  const products = new Map(
    (await quoteLineProducts(merged.map((line) => line.productId))).map((product) => [product.id, product]),
  );
  const items = merged.flatMap((line, index) => {
    const product = products.get(line.productId);
    return product
      ? [
          {
            productId: product.id,
            productName: product.name,
            modelNumber: product.modelNumber,
            quantity: line.quantity,
            notes: line.notes || null,
            order: index,
          },
        ]
      : [];
  });
  if (items.length === 0) {
    return { error: "The products on your list are no longer available. Please add them again from the catalogue." };
  }

  const units = items.reduce((sum, item) => sum + item.quantity, 0);
  const stored = await storeLead({
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    organisation: data.company || null,
    country: data.country || null,
    message: data.requirements || null,
    source: "RFQ",
    // A list has no single product: the lead's own product fields stay empty.
    productId: null,
    productName: null,
    ctaKey: cta.key,
    ctaPlacement: isPlacementId(placement) ? placement : null,
    submissionKey,
    consentedAt: new Date(),
    consentText: cta.consentText,
    ipAddress: screening.context.ipAddress,
    userAgent: screening.context.userAgent,
    ...leadContext,
    items: { create: items },
    quote: {
      create: {
        status: "NEW",
        deliveryLocation: data.deliveryLocation || null,
        expectedDeliveryDate: data.expectedDate ? new Date(`${data.expectedDate}T00:00:00Z`) : null,
      },
    },
    activities: {
      create: {
        kind: "CREATED",
        summary: `Quotation request received — ${items.length} ${items.length === 1 ? "product" : "products"}, ${units} ${units === 1 ? "unit" : "units"}`,
      },
    },
  });

  if (!stored) return { error: "We could not record your request just now. Please try again." };

  const after = cta.afterSubmit === "REDIRECT" && cta.redirectHref ? { redirectHref: cta.redirectHref } : {};
  if (stored.replayed) return { reference: stored.reference, ...after };

  await recordAuditEvent({
    action: "LEAD_CREATED",
    module: "RFQ",
    entityType: "Lead",
    entityId: stored.id,
    summary: `${stored.reference} — quotation request for ${items.length} ${items.length === 1 ? "product" : "products"}`,
    metadata: {
      source: "RFQ",
      lineCount: items.length,
      units,
      ctaKey: cta.key,
      placement: isPlacementId(placement) ? placement : null,
    },
    ...screening.context,
  });

  const notification = leadNotification({
    reference: stored.reference,
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    organisation: data.company || null,
    city: [data.deliveryLocation && `Delivery: ${data.deliveryLocation}`, data.country].filter(Boolean).join(", ") || null,
    message:
      [data.expectedDate ? `Expected delivery: ${data.expectedDate}` : "", data.requirements ?? ""]
        .filter(Boolean)
        .join("\n\n") || null,
    productName: null,
    items: items.map((item) => ({
      productName: item.productName,
      modelNumber: item.modelNumber,
      quantity: item.quantity,
      notes: item.notes,
    })),
    landingPage: leadContext.landingPage,
    source: "RFQ",
    leadId: stored.id,
  });
  await sendTeamNotification({ ...notification, leadId: stored.id });
  await sendCustomerConfirmation({
    to: data.email,
    leadId: stored.id,
    kind: "quotation",
    reference: stored.reference,
    name: data.name,
    items: items.map((item) => ({ productName: item.productName, quantity: item.quantity })),
  });

  revalidatePath("/admin/leads");
  revalidatePath("/admin/rfqs");
  return { reference: stored.reference, ...after };
}
