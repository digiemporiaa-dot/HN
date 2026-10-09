/**
 * The vocabulary of call-to-action popups, shared by the admin editor, the
 * server and the public controller. No server or browser imports.
 */

export const CTA_KINDS = [
  "DOWNLOAD_BROCHURE",
  "DOWNLOAD_CATALOGUE",
  "REQUEST_QUOTATION",
  "CONTACT_US",
  "GET_PRICE",
  "REQUEST_DEMO",
  "ENQUIRE_NOW",
  "CUSTOM",
] as const;
export type CtaKind = (typeof CTA_KINDS)[number];

export const CTA_POPUP_TYPES = [
  "LEAD_CAPTURE",
  "GATED_DOWNLOAD",
  "REQUEST_QUOTATION",
  "CUSTOM_FORM",
] as const;
export type CtaPopupType = (typeof CTA_POPUP_TYPES)[number];

export const CTA_MODES = ["POPUP", "DIRECT"] as const;
export type CtaMode = (typeof CTA_MODES)[number];

export const CTA_AFTER_SUBMIT = ["MESSAGE", "DOWNLOAD", "REDIRECT"] as const;
export type CtaAfterSubmit = (typeof CTA_AFTER_SUBMIT)[number];

export const CTA_KIND_LABELS: Record<CtaKind, string> = {
  DOWNLOAD_BROCHURE: "Download brochure",
  DOWNLOAD_CATALOGUE: "Download catalogue",
  REQUEST_QUOTATION: "Request quotation",
  CONTACT_US: "Contact us",
  GET_PRICE: "Get price",
  REQUEST_DEMO: "Request a demo",
  ENQUIRE_NOW: "Enquire now",
  CUSTOM: "Custom button",
};

export const CTA_POPUP_TYPE_LABELS: Record<CtaPopupType, string> = {
  LEAD_CAPTURE: "Lead capture",
  GATED_DOWNLOAD: "Gated download",
  REQUEST_QUOTATION: "Request quotation",
  CUSTOM_FORM: "Custom form",
};

export const CTA_AFTER_SUBMIT_LABELS: Record<CtaAfterSubmit, string> = {
  MESSAGE: "Show the success message",
  DOWNLOAD: "Start the download",
  REDIRECT: "Go to another page",
};

/** Which popup types make sense for a kind of button. The first is its default. */
export const POPUP_TYPES_FOR_KIND: Record<CtaKind, CtaPopupType[]> = {
  DOWNLOAD_BROCHURE: ["GATED_DOWNLOAD"],
  DOWNLOAD_CATALOGUE: ["GATED_DOWNLOAD"],
  REQUEST_QUOTATION: ["REQUEST_QUOTATION"],
  CONTACT_US: ["LEAD_CAPTURE", "CUSTOM_FORM"],
  GET_PRICE: ["LEAD_CAPTURE", "REQUEST_QUOTATION", "CUSTOM_FORM"],
  REQUEST_DEMO: ["LEAD_CAPTURE", "CUSTOM_FORM"],
  ENQUIRE_NOW: ["LEAD_CAPTURE", "CUSTOM_FORM"],
  CUSTOM: ["LEAD_CAPTURE", "CUSTOM_FORM", "REQUEST_QUOTATION"],
};

/** Whether a kind releases a file. */
export function isDownloadKind(kind: CtaKind): boolean {
  return kind === "DOWNLOAD_BROCHURE" || kind === "DOWNLOAD_CATALOGUE";
}

/** Which post-submit actions a popup type offers. */
export function afterSubmitOptions(type: CtaPopupType): CtaAfterSubmit[] {
  if (type === "GATED_DOWNLOAD") return ["DOWNLOAD", "MESSAGE"];
  return ["MESSAGE", "REDIRECT"];
}

/**
 * The lead source a submission files under. Derived from what the button is,
 * never taken from the request.
 */
export function leadSourceFor(
  kind: CtaKind,
  hasProduct: boolean,
): "DOCUMENT_DOWNLOAD" | "PRODUCT_ENQUIRY" | "CONTACT_FORM" {
  if (isDownloadKind(kind)) return "DOCUMENT_DOWNLOAD";
  return hasProduct ? "PRODUCT_ENQUIRY" : "CONTACT_FORM";
}

/** Keys are how pages and lead records refer to a configuration. */
export const CTA_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const CTA_KEY_MAX = 60;

export function isCtaKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= CTA_KEY_MAX &&
    CTA_KEY_PATTERN.test(value)
  );
}

export function isCtaKind(value: unknown): value is CtaKind {
  return typeof value === "string" && (CTA_KINDS as readonly string[]).includes(value);
}
