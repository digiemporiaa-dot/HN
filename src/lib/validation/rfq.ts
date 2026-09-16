import { z } from "zod";

/**
 * A quotation request: the enquiry fields, plus the list being quoted.
 *
 * Only the product id, the quantity and the note cross the wire. The name and
 * model number are read from the database when the request is stored, so a
 * hand-edited basket cannot put words into a record the sales team will read as
 * the customer's.
 */
export const MAX_RFQ_LINES = 50;
export const MAX_QUANTITY = 999;

export const rfqLineSchema = z.object({
  productId: z.string().min(1),
  quantity: z
    .number()
    .int("Quantities are whole numbers")
    .min(1, "At least one")
    .max(MAX_QUANTITY, `At most ${MAX_QUANTITY}`),
  notes: z.string().trim().max(500).default(""),
});

export const rfqLinesSchema = z
  .array(rfqLineSchema)
  .min(1, "Add at least one product before sending")
  .max(MAX_RFQ_LINES, `A request can carry ${MAX_RFQ_LINES} products at most`);

export type RfqLine = z.infer<typeof rfqLineSchema>;

/** The shape the browser keeps in storage. Validated on the way back in. */
export const storedBasketSchema = z.array(
  z.object({
    productId: z.string().min(1).max(40),
    quantity: z.number().int().min(1).max(MAX_QUANTITY).catch(1),
    notes: z.string().max(500).catch(""),
  }),
);
