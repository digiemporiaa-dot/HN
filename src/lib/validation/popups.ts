import { z } from "zod";

import { parseIstDateTime } from "@/lib/dates/ist";
import { parseRules } from "@/lib/popups/rules";

export const POPUP_TYPES = ["ENQUIRY", "PRODUCT_SPOTLIGHT", "RESOURCE", "ANNOUNCEMENT"] as const;
export const POPUP_TRIGGERS = ["DELAY", "SCROLL", "EXIT_INTENT", "IMMEDIATE"] as const;
export const POPUP_DEVICES = ["ALL", "DESKTOP", "MOBILE"] as const;
export const POPUP_TARGET_MODES = ["EXCLUDE", "INCLUDE"] as const;

export const POPUP_TYPE_LABELS: Record<(typeof POPUP_TYPES)[number], string> = {
  ENQUIRY: "Enquiry form",
  PRODUCT_SPOTLIGHT: "Product spotlight",
  RESOURCE: "Resource",
  ANNOUNCEMENT: "Announcement",
};

export const POPUP_TRIGGER_LABELS: Record<(typeof POPUP_TRIGGERS)[number], string> = {
  DELAY: "After a delay",
  SCROLL: "On scroll",
  EXIT_INTENT: "Exit intent",
  IMMEDIATE: "Immediately",
};

export const POPUP_DEVICE_LABELS: Record<(typeof POPUP_DEVICES)[number], string> = {
  ALL: "All devices",
  DESKTOP: "Desktop",
  MOBILE: "Mobile",
};

/**
 * Where a call to action may point: a path on this site, an https address,
 * or an email or phone link. `javascript:`, `data:` and plain http are refused.
 */
export function isSafeHref(value: string): boolean {
  if (value.startsWith("/")) return !value.startsWith("//") && !/[\s\\]/.test(value);
  return (
    /^https:\/\/[^\s/$.?#][^\s]*$/i.test(value) ||
    /^mailto:[^\s@]+@[^\s@]+$/i.test(value) ||
    /^tel:\+?[0-9 ()-]{5,20}$/i.test(value)
  );
}

const text = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters`);

const whole = (min: number, max: number, message: string) =>
  z.coerce
    .number({ error: message })
    .int(message)
    .min(min, message)
    .max(max, message);

const optionalDateTime = z
  .string()
  .trim()
  .default("")
  .refine((value) => value === "" || parseIstDateTime(value) !== null, "Enter a valid date and time")
  .transform((value) => (value ? parseIstDateTime(value) : null));

/**
 * The editor's fields. Whether a popup is active is deliberately absent: it
 * is never read from this form, only switched by its own action, which
 * checks POPUPS:PUBLISH.
 */
export const popupSchema = z
  .object({
    name: text(120).min(2, "Enter a name staff will recognise"),
    type: z.enum(POPUP_TYPES, { error: "Choose a popup type" }),
    eyebrow: text(60).default(""),
    heading: text(120).min(2, "Enter a heading"),
    description: text(600).default(""),
    imageId: text(40).default(""),
    productId: text(40).default(""),
    formId: text(40).default(""),
    ctaLabel: text(40).default(""),
    ctaHref: text(500)
      .default("")
      .refine(
        (value) => value === "" || isSafeHref(value),
        "Use a site path (/contact), an https:// address, mailto: or tel:",
      ),
    trigger: z.enum(POPUP_TRIGGERS, { error: "Choose a trigger" }),
    delaySeconds: whole(0, 600, "Enter whole seconds from 0 to 600"),
    scrollPercent: whole(5, 100, "Enter a percentage from 5 to 100"),
    device: z.enum(POPUP_DEVICES, { error: "Choose the devices" }),
    frequencyDays: whole(0, 365, "Enter whole days from 0 to 365"),
    priority: whole(-100, 100, "Enter a whole number from -100 to 100"),
    startsAt: optionalDateTime,
    endsAt: optionalDateTime,
    targetMode: z.enum(POPUP_TARGET_MODES),
    targetRules: z.string().max(12000).default(""),
  })
  .superRefine((value, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });

    if (value.startsAt && value.endsAt && value.endsAt.getTime() <= value.startsAt.getTime()) {
      issue("endsAt", "The end must be after the start");
    }

    const rules = parseRules(value.targetRules);
    if (rules.errors.length > 0) issue("targetRules", rules.errors[0]);
    else if (value.targetMode === "INCLUDE" && rules.rules.length === 0) {
      issue("targetRules", "Add at least one page, or show it on all pages");
    }

    if (value.ctaHref && !value.ctaLabel) issue("ctaLabel", "Enter the button text");
    if (value.ctaLabel && !value.ctaHref && value.type !== "PRODUCT_SPOTLIGHT") {
      issue("ctaHref", "Enter where the button goes");
    }

    if (value.type === "ENQUIRY" && !value.formId) issue("formId", "Choose a published form");
    if (value.type === "PRODUCT_SPOTLIGHT" && !value.productId) {
      issue("productId", "Choose a published product");
    }
    if (value.type === "RESOURCE" && !value.ctaHref) {
      issue("ctaHref", "A resource needs a link to the resource");
    }
  })
  .transform((value) => ({
    ...value,
    targetRules: parseRules(value.targetRules).rules,
    // Fields that mean nothing for the chosen type are not kept, so a popup
    // never carries a hidden form or product an editor cannot see.
    formId: value.type === "ENQUIRY" ? value.formId : "",
    productId: value.type === "PRODUCT_SPOTLIGHT" ? value.productId : "",
  }));

export type PopupInput = z.infer<typeof popupSchema>;

export function readPopupForm(formData: FormData) {
  const get = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : undefined;
  };
  return {
    name: get("name"),
    type: get("type"),
    eyebrow: get("eyebrow"),
    heading: get("heading"),
    description: get("description"),
    imageId: get("imageId"),
    productId: get("productId"),
    formId: get("formId"),
    ctaLabel: get("ctaLabel"),
    ctaHref: get("ctaHref"),
    trigger: get("trigger"),
    delaySeconds: get("delaySeconds") ?? "8",
    scrollPercent: get("scrollPercent") ?? "50",
    device: get("device"),
    frequencyDays: get("frequencyDays") ?? "7",
    priority: get("priority") ?? "0",
    startsAt: get("startsAt"),
    endsAt: get("endsAt"),
    targetMode: get("targetMode"),
    targetRules: get("targetRules"),
  };
}

export const popupFiltersSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  state: z.enum(["all", "live", "scheduled", "inactive", "expired"]).catch("all"),
  type: z.enum(["all", ...POPUP_TYPES]).catch("all"),
});
