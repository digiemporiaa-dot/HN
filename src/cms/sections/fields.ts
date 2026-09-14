import { z } from "zod";

/**
 * Section content is described by field specifications rather than hand-written
 * per-type forms and per-type schemas.
 *
 * One declaration produces the Zod schema, the editor UI and the defaults, so a
 * new section type cannot drift between what it validates, what it renders and
 * what the editor offers. With thirty-odd section types eventually in the
 * system, three hand-maintained copies of each would guarantee divergence.
 */

export type FieldSpec =
  | {
      kind: "text";
      name: string;
      label: string;
      help?: string;
      placeholder?: string;
      required?: boolean;
      maxLength?: number;
    }
  | {
      kind: "textarea";
      name: string;
      label: string;
      help?: string;
      required?: boolean;
      maxLength?: number;
      rows?: number;
    }
  | {
      /** Plain text with paragraph breaks and a small inline syntax. */
      kind: "richtext";
      name: string;
      label: string;
      help?: string;
      required?: boolean;
      maxLength?: number;
    }
  | {
      kind: "media";
      name: string;
      label: string;
      help?: string;
      required?: boolean;
    }
  | {
      kind: "url";
      name: string;
      label: string;
      help?: string;
      placeholder?: string;
      required?: boolean;
    }
  | {
      kind: "select";
      name: string;
      label: string;
      help?: string;
      options: Array<{ value: string; label: string }>;
    }
  | {
      kind: "repeater";
      name: string;
      label: string;
      help?: string;
      itemLabel: string;
      fields: FieldSpec[];
      min?: number;
      max: number;
    };

/**
 * Links are either site-relative or absolute https. Anything else — most
 * importantly javascript: — is refused, because these values end up in href
 * attributes on the public site.
 */
export const linkSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      value === "" ||
      /^\/[^\s]*$/.test(value) ||
      /^https:\/\/[^\s]+$/i.test(value) ||
      /^mailto:[^\s@]+@[^\s@]+$/i.test(value) ||
      /^tel:[+0-9\s-]+$/i.test(value),
    "Use a path starting with /, an https:// URL, mailto: or tel:",
  );

function schemaForField(field: FieldSpec): z.ZodTypeAny {
  switch (field.kind) {
    case "text":
    case "textarea":
    case "richtext": {
      let schema = z.string().trim().max(field.maxLength ?? 5000);
      if (field.required) schema = schema.min(1, `${field.label} is required`);
      return field.required ? schema : schema.default("");
    }
    case "media":
      return field.required
        ? z.string().min(1, `${field.label} is required`)
        : z.string().default("");
    case "url":
      return field.required
        ? linkSchema.refine((v) => v.length > 0, `${field.label} is required`)
        : linkSchema.default("");
    case "select":
      return z
        .enum(field.options.map((option) => option.value) as [string, ...string[]])
        .catch(field.options[0].value);
    case "repeater":
      return z
        .array(buildContentSchema(field.fields))
        .max(field.max)
        .default([]);
  }
}

export function buildContentSchema(fields: FieldSpec[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    shape[field.name] = schemaForField(field);
  }
  // Unknown keys are stripped rather than rejected, so a section type that
  // drops a field does not break every page that still stores it.
  return z.object(shape).strip();
}

export function buildDefaults(fields: FieldSpec[]): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const field of fields) {
    defaults[field.name] =
      field.kind === "repeater"
        ? Array.from({ length: field.min ?? 0 }, () => buildDefaults(field.fields))
        : field.kind === "select"
          ? field.options[0].value
          : "";
  }
  return defaults;
}
