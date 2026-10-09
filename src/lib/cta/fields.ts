import { z } from "zod";

import { phoneSchema } from "@/lib/validation/leads";
import type { CtaPopupType } from "./kinds";

/**
 * The fields a call-to-action popup can ask for.
 *
 * A fixed list rather than a form builder: each field lands in a known column
 * on the lead or the quotation, so the sales team reads the same thing in the
 * same place whichever button produced it. Anything bespoke belongs in a
 * custom form (popup type CUSTOM_FORM).
 *
 * Name and email are not in the list because they are not optional: a lead
 * with no name and no address to reply to is not a lead.
 */

export const CONFIGURABLE_FIELDS = [
  "phone",
  "company",
  "country",
  "location",
  "message",
  "deliveryLocation",
  "expectedDate",
  "requirements",
] as const;
export type ConfigurableField = (typeof CONFIGURABLE_FIELDS)[number];

export type FieldDefinition = {
  key: ConfigurableField;
  label: string;
  /** Lead-type popups, the quotation, or both. */
  for: Array<"lead" | "quote">;
  input: "text" | "tel" | "textarea" | "date";
  autoComplete?: string;
  maxLength: number;
};

export const FIELD_DEFINITIONS: Record<ConfigurableField, FieldDefinition> = {
  phone: { key: "phone", label: "Phone", for: ["lead", "quote"], input: "tel", autoComplete: "tel", maxLength: 24 },
  company: { key: "company", label: "Company or hospital", for: ["lead", "quote"], input: "text", autoComplete: "organization", maxLength: 160 },
  country: { key: "country", label: "Country", for: ["lead", "quote"], input: "text", autoComplete: "country-name", maxLength: 80 },
  location: { key: "location", label: "City or location", for: ["lead"], input: "text", autoComplete: "address-level2", maxLength: 120 },
  message: { key: "message", label: "Message", for: ["lead"], input: "textarea", maxLength: 4000 },
  deliveryLocation: { key: "deliveryLocation", label: "Delivery location", for: ["quote"], input: "text", autoComplete: "address-level2", maxLength: 200 },
  expectedDate: { key: "expectedDate", label: "Expected delivery date", for: ["quote"], input: "date", maxLength: 10 },
  requirements: { key: "requirements", label: "Additional requirements", for: ["quote"], input: "textarea", maxLength: 4000 },
};

export type FieldSetting = {
  key: ConfigurableField;
  enabled: boolean;
  required: boolean;
};

const family = (type: CtaPopupType): "lead" | "quote" =>
  type === "REQUEST_QUOTATION" ? "quote" : "lead";

/** The fields a popup type can show, in display order. */
export function fieldsFor(type: CtaPopupType): FieldDefinition[] {
  const wanted = family(type);
  return CONFIGURABLE_FIELDS.map((key) => FIELD_DEFINITIONS[key]).filter(
    (field) => field.for.includes(wanted),
  );
}

/**
 * What each popup type shows when nobody has configured it. These match what
 * the site asked before configurable popups existed, so an unconfigured
 * button behaves exactly as it used to.
 */
export function defaultFieldSettings(type: CtaPopupType): FieldSetting[] {
  const on = (key: ConfigurableField, required = false): FieldSetting => ({
    key,
    enabled: true,
    required,
  });
  const off = (key: ConfigurableField): FieldSetting => ({
    key,
    enabled: false,
    required: false,
  });
  switch (type) {
    case "REQUEST_QUOTATION":
      return [
        on("phone"),
        on("company"),
        on("country"),
        on("deliveryLocation"),
        on("expectedDate"),
        on("requirements"),
      ];
    case "GATED_DOWNLOAD":
      return [on("phone"), on("company"), off("country"), on("location"), off("message")];
    default:
      return [on("phone"), on("company"), off("country"), on("location"), on("message")];
  }
}

const storedSettingSchema = z.object({
  key: z.enum(CONFIGURABLE_FIELDS),
  enabled: z.boolean(),
  required: z.boolean(),
});

/**
 * Reads the stored settings for a popup type, falling back to the default for
 * any field missing from them. Unknown or malformed entries are dropped here
 * (the editor refuses them on the way in); a field that does not belong to the
 * type is ignored.
 */
export function readFieldSettings(raw: unknown, type: CtaPopupType): FieldSetting[] {
  const stored = new Map<ConfigurableField, FieldSetting>();
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      const parsed = storedSettingSchema.safeParse(entry);
      if (parsed.success) stored.set(parsed.data.key, parsed.data);
    }
  }
  const allowed = new Set(fieldsFor(type).map((field) => field.key));
  return defaultFieldSettings(type)
    .filter((setting) => allowed.has(setting.key))
    .map((fallback) => {
      const setting = stored.get(fallback.key) ?? fallback;
      // A field that is not shown cannot be required.
      return { ...setting, required: setting.enabled && setting.required };
    });
}

/**
 * Parses settings submitted from the editor. Strict: an unknown key, a field
 * that does not belong to the popup type or a duplicate is an error rather than
 * something quietly dropped.
 */
export function parseFieldSettings(
  raw: unknown,
  type: CtaPopupType,
): { ok: true; settings: FieldSetting[] } | { ok: false; error: string } {
  const parsed = z.array(storedSettingSchema).max(CONFIGURABLE_FIELDS.length).safeParse(raw);
  if (!parsed.success) return { ok: false, error: "The field settings could not be read." };
  const allowed = new Set(fieldsFor(type).map((field) => field.key));
  const seen = new Set<string>();
  for (const setting of parsed.data) {
    if (!allowed.has(setting.key)) {
      return { ok: false, error: `${FIELD_DEFINITIONS[setting.key].label} is not a field of this popup type.` };
    }
    if (seen.has(setting.key)) return { ok: false, error: "A field is listed twice." };
    seen.add(setting.key);
  }
  return { ok: true, settings: readFieldSettings(parsed.data, type) };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Today in India, as YYYY-MM-DD: the sales team's calendar, not the server's. */
export function todayIso(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function dateSchema(now: Date) {
  return z
    .string()
    .trim()
    .refine((value) => value === "" || ISO_DATE.test(value), "Enter a date")
    .refine((value) => {
      if (value === "") return true;
      const date = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }, "Enter a real date")
    .refine((value) => value === "" || value >= todayIso(now), "Choose a date from today onwards")
    .refine((value) => {
      if (value === "") return true;
      const limit = new Date(now);
      limit.setUTCFullYear(limit.getUTCFullYear() + 5);
      return value <= limit.toISOString().slice(0, 10);
    }, "Choose a date within the next five years");
}

const REQUIRED_MESSAGES: Record<ConfigurableField, string> = {
  phone: "We need a phone number to call you on",
  company: "Tell us your company or hospital",
  country: "Tell us your country",
  location: "Tell us your city or location",
  message: "Tell us what you need",
  deliveryLocation: "Tell us where the equipment is going",
  expectedDate: "Choose a delivery date",
  requirements: "Tell us your requirements",
};

/**
 * The validation for one submission, built from the configuration the server
 * resolved. The browser shows the same rules, but this is the one that counts:
 * a field the configuration hides is discarded whatever was posted in it, and
 * a required one is required whatever the page claimed.
 */
export function submissionSchema(settings: FieldSetting[], now = new Date()) {
  const shape: Record<string, z.ZodTypeAny> = {
    name: z.preprocess((value) => value ?? "", z.string().trim().min(2, "Tell us your name").max(120)),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "We need an email address to reply to")
      .max(200)
      .email("Enter a valid email address"),
    consent: z.boolean().refine((value) => value, "Please agree before sending"),
  };

  for (const setting of settings) {
    const definition = FIELD_DEFINITIONS[setting.key];
    if (!setting.enabled) {
      // Accepted and thrown away, so a stale page posting a field that has
      // since been switched off still submits.
      shape[setting.key] = z.preprocess(() => "", z.string());
      continue;
    }
    let schema: z.ZodType<string> =
      setting.key === "phone"
        ? phoneSchema
        : setting.key === "expectedDate"
          ? dateSchema(now)
          : z.string().trim().max(definition.maxLength, `${definition.label} is too long`);
    if (setting.required) {
      schema = schema.refine((value) => value.length > 0, REQUIRED_MESSAGES[setting.key]);
    }
    // A field left out of the post altogether reads as empty.
    shape[setting.key] = z.preprocess((value) => value ?? "", schema);
  }

  return z.object(shape);
}

export type Submission = {
  name: string;
  email: string;
  consent: boolean;
} & Partial<Record<ConfigurableField, string>>;

/** Reads a submission's fields out of a form post. */
export function submissionFromForm(formData: FormData): Record<string, unknown> {
  const value: Record<string, unknown> = {
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    consent: formData.get("consent") === "on",
  };
  for (const key of CONFIGURABLE_FIELDS) value[key] = formData.get(key) ?? "";
  return value;
}
