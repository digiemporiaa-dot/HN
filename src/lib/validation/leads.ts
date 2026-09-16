import { z } from "zod";

/**
 * What a visitor is asked for, and what the server insists on.
 *
 * Deliberately short. Every extra field on an enquiry form costs enquiries, and
 * a name, a way to reply and what they want to know is enough to start a
 * conversation — the rest is what the conversation is for.
 */

export const LEAD_SOURCES = [
  "PRODUCT_ENQUIRY",
  "DOCUMENT_DOWNLOAD",
  "CONTACT_FORM",
  "RFQ",
] as const;

export const LEAD_STATUSES = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "QUOTED", label: "Quoted" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
] as const;

export const leadStatusSchema = z.enum([
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "QUOTED",
  "WON",
  "LOST",
]);

/**
 * Indian mobile and landline numbers, with or without the country code, and
 * with the spaces and hyphens people actually type. Stored as entered: a
 * number normalised into a shape the sales team does not recognise is worse
 * than one they can read.
 */
export const phoneSchema = z
  .string()
  .trim()
  .max(24, "That phone number is too long")
  .refine(
    (value) => value === "" || /^[+0-9][0-9\s()-]{6,23}$/.test(value),
    "Enter a phone number we can call",
  );

export const enquirySchema = z.object({
  name: z.string().trim().min(2, "Tell us your name").max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "We need an email address to reply to")
    .max(200)
    .email("Enter a valid email address"),
  phone: phoneSchema.default(""),
  organisation: z.string().trim().max(160).default(""),
  city: z.string().trim().max(120).default(""),
  message: z.string().trim().max(4000).default(""),
  /**
   * Consent is a decision, so it is required rather than pre-ticked. An
   * unticked box is a refusal, and the form says so rather than silently
   * storing the enquiry anyway.
   */
  consent: z
    .boolean()
    .refine((value) => value, "Please agree before sending your enquiry"),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;

export const leadUpdateSchema = z.object({
  leadId: z.string().min(1),
  status: leadStatusSchema,
  /** Empty means unassigned. */
  assignedToId: z.string().trim().max(40).default(""),
});

export const leadNoteSchema = z.object({
  leadId: z.string().min(1),
  body: z.string().trim().min(1, "Write something first").max(4000),
});

export const leadIdSchema = z.object({ leadId: z.string().min(1) });

/** The wording a visitor agrees to, stored with the lead so it can be shown back. */
export const CONSENT_TEXT =
  "I agree to be contacted about this enquiry and to my details being stored for that purpose.";
