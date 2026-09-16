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
  "CATEGORY_ENQUIRY",
  "DOCUMENT_DOWNLOAD",
  "CONTACT_FORM",
  "CUSTOM_FORM",
  "CITY_LANDING",
  "RFQ",
  "WHATSAPP",
] as const;

/** What each source is called on a screen a salesperson reads. */
export const LEAD_SOURCE_LABELS: Record<string, string> = {
  PRODUCT_ENQUIRY: "Product enquiry",
  CATEGORY_ENQUIRY: "Category enquiry",
  DOCUMENT_DOWNLOAD: "Brochure download",
  CONTACT_FORM: "Contact form",
  CUSTOM_FORM: "Custom form",
  CITY_LANDING: "City landing page",
  RFQ: "Quotation request",
  WHATSAPP: "WhatsApp",
};

/**
 * The pipeline, in the order it is worked.
 *
 * Declared here rather than taken from the database enum so a stage added later
 * lands where it belongs rather than at the end. `open` marks the stages a deal
 * is still live in, which is what "how much is in the pipeline" means.
 */
export const LEAD_STATUSES = [
  { value: "NEW", label: "New", open: true },
  { value: "CONTACTED", label: "Contacted", open: true },
  { value: "QUALIFIED", label: "Qualified", open: true },
  { value: "QUOTATION_SENT", label: "Quotation sent", open: true },
  { value: "NEGOTIATION", label: "Negotiation", open: true },
  { value: "WON", label: "Won", open: false },
  { value: "LOST", label: "Lost", open: false },
] as const;

export const leadStatusSchema = z.enum([
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "QUOTATION_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
]);

export const LEAD_PRIORITIES = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
] as const;

export const leadPrioritySchema = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

/**
 * Where an enquiry was sent from, and the campaign that brought them.
 *
 * Every field is optional and every one is clamped: these come off the address
 * bar, so they are whatever somebody put there. They are read by people and
 * never matched against anything, so a value that is merely odd is stored as
 * it is rather than rejected.
 */
export const leadContextSchema = z.object({
  landingPage: z
    .string()
    .trim()
    .max(300)
    // A path on this site, never an absolute URL: an enquiry cannot claim to
    // have come from somebody else's page.
    .refine((value) => value === "" || value.startsWith("/"), "")
    .catch("")
    .default(""),
  utmSource: z.string().trim().max(120).catch("").default(""),
  utmMedium: z.string().trim().max(120).catch("").default(""),
  utmCampaign: z.string().trim().max(160).catch("").default(""),
  utmTerm: z.string().trim().max(160).catch("").default(""),
  utmContent: z.string().trim().max(160).catch("").default(""),
});

export type LeadContext = z.infer<typeof leadContextSchema>;

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
  priority: leadPrioritySchema,
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
