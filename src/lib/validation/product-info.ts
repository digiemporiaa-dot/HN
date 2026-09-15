import { z } from "zod";

/**
 * The child collections of a product.
 *
 * Every one of these is an ordered list, which form encoding cannot express, so
 * each editor posts its whole collection as JSON and the server rewrites the
 * table. That is deliberate: a per-row action would mean a round trip per
 * keystroke-sized edit, and reordering would need its own endpoint.
 */

export const DOCUMENT_KINDS = [
  { value: "BROCHURE", label: "Brochure" },
  { value: "DATASHEET", label: "Datasheet" },
  { value: "MANUAL", label: "User manual" },
  { value: "CERTIFICATE", label: "Certificate" },
  { value: "CASE_STUDY", label: "Case study" },
  { value: "OTHER", label: "Other" },
] as const;

export const documentKindSchema = z.enum([
  "BROCHURE",
  "DATASHEET",
  "MANUAL",
  "CERTIFICATE",
  "CASE_STUDY",
  "OTHER",
]);

const specItemSchema = z.object({
  label: z.string().trim().min(1, "Every specification needs a label").max(160),
  /** Left blank on purpose when a template has been applied but not filled in. */
  value: z.string().trim().max(400).default(""),
  unit: z.string().trim().max(40).default(""),
});

const specGroupSchema = z.object({
  label: z.string().trim().min(1, "Every group needs a heading").max(120),
  items: z.array(specItemSchema).max(60, "60 rows is the limit for one group"),
});

export const productSpecsSchema = z.object({
  productId: z.string().min(1),
  groups: z.array(specGroupSchema).max(20, "20 groups is the limit"),
});

export const productDocumentsSchema = z.object({
  productId: z.string().min(1),
  documents: z
    .array(
      z.object({
        mediaId: z.string().min(1),
        title: z.string().trim().min(1, "Give the document a title").max(200),
        kind: documentKindSchema,
        gated: z.boolean(),
      }),
    )
    .max(30, "30 documents is the limit"),
});

export const productApplicationsSchema = z.object({
  productId: z.string().min(1),
  applicationIds: z.array(z.string().min(1)).max(100),
});

export const productRelatedSchema = z.object({
  productId: z.string().min(1),
  relatedIds: z
    .array(z.string().min(1))
    .max(12, "12 related products is the limit"),
});

export const productFaqsSchema = z.object({
  productId: z.string().min(1),
  faqs: z
    .array(
      z.object({
        question: z
          .string()
          .trim()
          .min(1, "Every FAQ needs a question")
          .max(300),
        answer: z.string().trim().min(1, "Every FAQ needs an answer").max(4000),
      }),
    )
    .max(30, "30 questions is the limit"),
});

export const specTemplateSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(2, "Name the template").max(120),
  groups: z
    .array(
      z.object({
        label: z.string().trim().min(1, "Every group needs a heading").max(120),
        fields: z
          .array(
            z.object({
              label: z
                .string()
                .trim()
                .min(1, "Every field needs a label")
                .max(160),
              unit: z.string().trim().max(40).default(""),
            }),
          )
          .max(60, "60 fields is the limit for one group"),
      }),
    )
    .max(20, "20 groups is the limit"),
});

/**
 * Parses a JSON payload posted by one of the editors.
 *
 * Returns an empty array rather than throwing: a malformed payload is a bug or
 * a forged request, and in both cases the schema below should reject it with a
 * field error rather than a stack trace.
 */
export function readJsonArray(value: FormDataEntryValue | null): unknown[] {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
