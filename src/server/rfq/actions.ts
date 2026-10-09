"use server";

import { MAX_RFQ_LINES } from "@/lib/validation/rfq";
import { quoteLineProducts } from "@/server/products/public";
import type { QuoteLineProduct } from "@/server/products/public";

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

// Quotation requests are submitted through submitQuotationAction in
// src/server/quotes/actions.ts, which the quotation modal and the /rfq page
// share.
