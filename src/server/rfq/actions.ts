"use server";

import { revalidatePath } from "next/cache";

import { recordAuditEvent } from "@/server/audit/log";
import { fieldErrorsFrom } from "@/lib/validation/field-errors";
import { CONSENT_TEXT, enquirySchema } from "@/lib/validation/leads";
import { MAX_RFQ_LINES, rfqLinesSchema } from "@/lib/validation/rfq";
import {
  checkEnquiryRate,
  checkFormTiming,
  RATE_LIMIT_WINDOW_MINUTES,
} from "@/server/leads/throttle";
import { createLeadWithReference, requestContext } from "@/server/leads/service";
import { quoteLineProducts } from "@/server/products/public";
import type { QuoteLineProduct } from "@/server/products/public";
import { sendMail } from "@/server/mail/send";
import { leadNotification } from "@/server/mail/templates";
import type { EnquiryState } from "@/server/leads/actions";

/**
 * Turns the ids a browser is holding into products it may display.
 *
 * The basket is the visitor's own list, kept in their browser, so the page has
 * nothing but ids to work with and every name on the quotation page is read
 * from the catalogue through here. Nothing is stored and nothing is recorded:
 * looking at your own shortlist is not an enquiry.
 */
export async function lookupQuoteLinesAction(
  ids: string[],
): Promise<QuoteLineProduct[]> {
  if (!Array.isArray(ids)) return [];
  const safe = ids
    .filter((id): id is string => typeof id === "string" && id.length <= 40)
    .slice(0, MAX_RFQ_LINES);
  return quoteLineProducts(safe);
}

/**
 * Captures a quotation request: an enquiry with a list attached.
 *
 * The one rule that shapes it is that nothing about a product is taken from the
 * submission. The browser sends ids, quantities and notes; the name and model
 * number stored against each line are read from the catalogue here. A
 * hand-edited basket can therefore ask about a different product, or about one
 * quantity rather than another, but it cannot put words into a record the sales
 * team will read as the customer naming a product we sell.
 */
export async function submitRfqAction(
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

  // Same order as the plain enquiry, for the same reason: a person who leaves
  // a field blank should see which one, not a silent success.
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  let posted: unknown = [];
  try {
    posted = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    // Not our JSON. Handled as an empty list below.
  }

  const lines = rfqLinesSchema.safeParse(posted);
  if (!lines.success) {
    return {
      error:
        "Add at least one product to your quotation list before sending it.",
    };
  }

  const timing = checkFormTiming(
    String(formData.get("website") ?? ""),
    String(formData.get("startedAt") ?? ""),
  );

  if (!timing.ok) {
    await recordAuditEvent({
      action: "LEAD_SUBMISSION_REFUSED",
      module: "LEADS",
      summary: `Automated quotation request refused (${timing.reason})`,
      ...(await requestContext()),
    });
    return { reference: "" };
  }

  const context = await requestContext();
  const rate = await checkEnquiryRate(parsed.data.email, context.ipAddress);
  if (!rate.ok) {
    return {
      error: `We have already received several enquiries from you in the last ${RATE_LIMIT_WINDOW_MINUTES} minutes. Please call us instead, or try again later.`,
    };
  }

  // Resolved against the catalogue, in the order the visitor arranged them. A
  // line whose product has since been withdrawn is dropped rather than stored
  // as a request for something we no longer offer.
  const products = new Map(
    (await quoteLineProducts(lines.data.map((line) => line.productId))).map(
      (product) => [product.id, product],
    ),
  );

  const items = lines.data.flatMap((line, index) => {
    const product = products.get(line.productId);
    if (!product) return [];
    return [
      {
        productId: product.id,
        productName: product.name,
        modelNumber: product.modelNumber,
        quantity: line.quantity,
        notes: line.notes || null,
        order: index,
      },
    ];
  });

  if (items.length === 0) {
    return {
      error:
        "The products on your list are no longer available. Please add them again from the catalogue.",
    };
  }

  const lead = await createLeadWithReference(
    {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      organisation: parsed.data.organisation || null,
      city: parsed.data.city || null,
      message: parsed.data.message || null,
      source: "RFQ",
      // The lead's own product fields stay empty: a request covering a list has
      // no single product, and naming the first one would misdescribe the rest.
      productId: null,
      productName: null,
      consentedAt: new Date(),
      consentText: CONSENT_TEXT,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    },
    items,
  );

  if (!lead) {
    return {
      error: "We could not record your request just now. Please try again.",
    };
  }

  await recordAuditEvent({
    action: "LEAD_CREATED",
    module: "LEADS",
    entityType: "Lead",
    entityId: lead.id,
    summary: `${lead.reference} — quotation request for ${items.length} ${
      items.length === 1 ? "product" : "products"
    }`,
    metadata: { source: "RFQ", lineCount: items.length },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  const notification = leadNotification({
    reference: lead.reference,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    organisation: parsed.data.organisation || null,
    city: parsed.data.city || null,
    message: parsed.data.message || null,
    productName: null,
    items: items.map((item) => ({
      productName: item.productName,
      modelNumber: item.modelNumber,
      quantity: item.quantity,
      notes: item.notes,
    })),
    source: "RFQ",
    leadId: lead.id,
  });

  // After the commit, and its outcome never changes the answer: the request is
  // recorded, and a mail server having a bad afternoon is the sales team's
  // problem to see on the deliveries screen.
  await sendMail({
    kind: "lead.notification",
    subject: notification.subject,
    text: notification.text,
    html: notification.html,
    entityType: "Lead",
    entityId: lead.id,
  });

  revalidatePath("/admin/leads");
  return { reference: lead.reference };
}
