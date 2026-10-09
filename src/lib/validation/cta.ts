import { z } from "zod";

import {
  afterSubmitOptions,
  CTA_AFTER_SUBMIT,
  CTA_KEY_MAX,
  CTA_KEY_PATTERN,
  CTA_KINDS,
  CTA_MODES,
  CTA_POPUP_TYPES,
  POPUP_TYPES_FOR_KIND,
} from "@/lib/cta/kinds";
import { parseFieldSettings, type FieldSetting } from "@/lib/cta/fields";
import { isPlacementId, placementById } from "@/lib/cta/placements";
import { parseRules } from "@/lib/popups/rules";

/**
 * What the CTA popup editor may save. Strict: an unknown placement, a field
 * that does not belong to the popup type, or a popup type the button kind
 * does not offer is refused with a message, never quietly dropped.
 */

/** A site path or an https:// address; nothing else ends up in an href. */
const hrefSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => value === "" || (/^\/(?!\/)[^\s]*$/.test(value) || /^https:\/\/[^\s]+$/i.test(value)),
    "Use a path starting with / or an https:// address",
  );

const optionalId = z
  .string()
  .trim()
  .refine((value) => value === "" || /^[a-z0-9]{8,40}$/i.test(value), "Choose from the list");

export const ctaConfigSchema = z
  .object({
    key: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Give it a key")
      .max(CTA_KEY_MAX, `At most ${CTA_KEY_MAX} characters`)
      .regex(CTA_KEY_PATTERN, "Lower-case letters, digits and dashes only"),
    name: z.string().trim().min(1, "Give it a name").max(120),
    kind: z.enum(CTA_KINDS),
    isDefault: z.boolean(),
    mode: z.enum(CTA_MODES),
    popupType: z.enum(CTA_POPUP_TYPES),
    heading: z.string().trim().min(1, "Write a heading").max(160),
    description: z.string().trim().max(400).default(""),
    submitLabel: z.string().trim().max(40).default(""),
    successMessage: z.string().trim().max(300).default(""),
    consentText: z.string().trim().max(500).default(""),
    privacyHref: hrefSchema.default(""),
    afterSubmit: z.enum(CTA_AFTER_SUBMIT),
    redirectHref: hrefSchema.default(""),
    directHref: hrefSchema.default(""),
    placements: z.array(z.string()).max(20).default([]),
    targetProductId: optionalId.default(""),
    targetPaths: z.string().max(4000).default(""),
    fileId: optionalId.default(""),
    formId: optionalId.default(""),
    fields: z.unknown(),
  })
  .superRefine((value, context) => {
    const issue = (path: string, message: string) => context.addIssue({ code: "custom", path: [path], message });

    if (!POPUP_TYPES_FOR_KIND[value.kind].includes(value.popupType)) {
      issue("popupType", "That popup type is not available for this kind of button");
    }
    if (!afterSubmitOptions(value.popupType).includes(value.afterSubmit)) {
      issue("afterSubmit", "That is not available for this popup type");
    }
    if (value.afterSubmit === "REDIRECT" && !value.redirectHref) issue("redirectHref", "Where should the visitor go?");
    if (value.popupType === "CUSTOM_FORM" && !value.formId) issue("formId", "Choose a published form");
    if (value.kind === "DOWNLOAD_CATALOGUE" && !value.fileId) issue("fileId", "Choose the catalogue file");
    if (value.isDefault && (value.placements.length > 0 || value.targetProductId || value.targetPaths.trim())) {
      // A default applies everywhere its kind appears; restricting one makes
      // it something other than a default.
      issue("isDefault", "A default applies everywhere. Clear the placements and targeting, or untick Default.");
    }
    for (const placement of value.placements) {
      if (!isPlacementId(placement)) {
        issue("placements", `Unknown button placement: ${placement.slice(0, 60)}`);
        continue;
      }
      const known = placementById(placement)!;
      if (known.kind !== "CUSTOM" && known.kind !== value.kind) {
        issue("placements", `${known.label} is not a ${value.kind.toLowerCase().replace(/_/g, " ")} button`);
      }
    }
    if (new Set(value.placements).size !== value.placements.length) issue("placements", "A placement is listed twice");
    const rules = parseRules(value.targetPaths);
    if (rules.errors.length > 0) issue("targetPaths", rules.errors[0]);
    const fields = parseFieldSettings(value.fields, value.popupType);
    if (!fields.ok) issue("fields", fields.error);
  })
  .transform((value) => ({
    ...value,
    targetPaths: parseRules(value.targetPaths).rules,
    fields: (parseFieldSettings(value.fields, value.popupType) as { ok: true; settings: FieldSetting[] }).settings,
  }));

export type CtaConfigInput = z.infer<typeof ctaConfigSchema>;

/** Reads the editor's form post into the schema's shape. */
export function readCtaConfigForm(formData: FormData): Record<string, unknown> {
  const text = (key: string) => String(formData.get(key) ?? "");
  let fields: unknown = null;
  try {
    fields = JSON.parse(text("fields") || "null");
  } catch {
    fields = "invalid";
  }
  return {
    key: text("key"),
    name: text("name"),
    kind: text("kind"),
    isDefault: formData.get("isDefault") === "on",
    mode: text("mode"),
    popupType: text("popupType"),
    heading: text("heading"),
    description: text("description"),
    submitLabel: text("submitLabel"),
    successMessage: text("successMessage"),
    consentText: text("consentText"),
    privacyHref: text("privacyHref"),
    afterSubmit: text("afterSubmit"),
    redirectHref: text("redirectHref"),
    directHref: text("directHref"),
    placements: formData.getAll("placements").map(String),
    targetProductId: text("targetProductId"),
    targetPaths: text("targetPaths"),
    fileId: text("fileId"),
    formId: text("formId"),
    fields,
  };
}
