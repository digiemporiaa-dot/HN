import { z } from "zod";

/**
 * Forms an administrator builds, and what a visitor may send to one.
 *
 * Two schemas that look alike and are not. The builder schema validates what a
 * form is allowed to be; the answer schema is generated per form, from the
 * fields actually stored, so a submission is checked against the form as it is
 * rather than as it was posted. Nothing a browser sends decides which fields
 * exist.
 */

export const FORM_FIELD_TYPES = [
  { value: "TEXT", label: "Text" },
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone" },
  { value: "NUMBER", label: "Number" },
  { value: "TEXTAREA", label: "Long text" },
  { value: "SELECT", label: "Dropdown" },
  { value: "CHECKBOX", label: "Checkbox" },
  { value: "RADIO", label: "Choice" },
  { value: "FILE", label: "File" },
  { value: "DATE", label: "Date" },
] as const;

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number]["value"];

export const formFieldTypeSchema = z.enum([
  "TEXT",
  "EMAIL",
  "PHONE",
  "NUMBER",
  "TEXTAREA",
  "SELECT",
  "CHECKBOX",
  "RADIO",
  "FILE",
  "DATE",
]);

/** The types whose answer is one of a list the form itself defines. */
export const CHOICE_TYPES: FormFieldType[] = ["SELECT", "RADIO"];

export const MAX_FIELDS = 40;
export const MAX_OPTIONS = 50;
export const MAX_ANSWER_LENGTH = 4000;
export const MAX_FILES_PER_SUBMISSION = 3;

/**
 * A field's key: what its answers are filed under.
 *
 * Generated from the label rather than typed, and then never changed, so
 * renaming a question does not orphan the answers already given to it.
 */
export const formFieldKeySchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, "Keys are lowercase words joined by _");

export function keyFromLabel(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60) || "field"
  );
}

/** Makes a key unique inside one form without changing the ones already taken. */
export function uniqueKey(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${base}_${suffix}`.slice(0, 60);
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}_${Date.now()}`.slice(0, 60);
}

export const formKeySchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Enter a key")
  .max(60)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and hyphens only",
  );

export const formFieldSchema = z.object({
  /** Blank on a field that has just been added and has no key yet. */
  key: z.string().trim().max(60).default(""),
  type: formFieldTypeSchema,
  label: z.string().trim().min(1, "Every field needs a label").max(160),
  placeholder: z.string().trim().max(160).default(""),
  help: z.string().trim().max(300).default(""),
  required: z.boolean().default(false),
  hidden: z.boolean().default(false),
  /** One choice per line. Ignored unless the type uses them. */
  options: z.string().max(2000).default(""),
});

export const formSchema = z.object({
  name: z.string().trim().min(2, "Name the form").max(120),
  key: formKeySchema,
  description: z.string().trim().max(1000).default(""),
  successMessage: z.string().trim().max(600).default(""),
  submitLabel: z.string().trim().max(40).default(""),
  /** Blank means the site's own enquiry recipients. */
  notifyEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(200)
    .refine(
      (value) => value === "" || z.string().email().safeParse(value).success,
      "Enter an email address we can notify",
    )
    .default(""),
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]),
});

export const formFieldsSchema = z.object({
  formId: z.string().min(1),
  fields: z
    .array(formFieldSchema)
    .max(MAX_FIELDS, `${MAX_FIELDS} fields is the limit`),
});

export const formIdSchema = z.object({ formId: z.string().min(1) });

/** Choices as the builder stores them, as the list the renderer needs. */
export function parseOptions(options: string | null): string[] {
  if (!options) return [];
  return options
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_OPTIONS);
}
