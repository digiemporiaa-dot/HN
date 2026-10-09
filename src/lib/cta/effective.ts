import { CONSENT_TEXT } from "@/lib/validation/leads";
import { defaultFieldSettings, readFieldSettings, type FieldSetting } from "./fields";
import {
  isDownloadKind,
  POPUP_TYPES_FOR_KIND,
  type CtaAfterSubmit,
  type CtaKind,
  type CtaMode,
  type CtaPopupType,
} from "./kinds";

/**
 * What a button actually does: a configuration, or the built-in behaviour
 * when there is none. Shared by the controller and the server so both work
 * from the same defaults.
 */

/** A configuration in the shape sent to the browser. Nothing internal. */
export type PublicCtaConfig = {
  key: string;
  kind: CtaKind;
  isDefault: boolean;
  placements: string[];
  targetProductId: string | null;
  targetPaths: string[];
  updatedAt: string;
  mode: CtaMode;
  popupType: CtaPopupType;
  heading: string;
  description: string | null;
  submitLabel: string | null;
  successMessage: string | null;
  fields: unknown;
  consentText: string | null;
  privacyHref: string | null;
  afterSubmit: CtaAfterSubmit;
  redirectHref: string | null;
  directHref: string | null;
  /** DOWNLOAD_CATALOGUE: whether a file is set. Its address is never sent while gated. */
  hasFile: boolean;
  /** DOWNLOAD_CATALOGUE in DIRECT mode only: the public address of the file. */
  fileHref: string | null;
  /** CUSTOM_FORM: the published form's key, if it is live. */
  formKey: string | null;
};

export type EffectiveCta = {
  /** The configuration applied, or null for the built-in behaviour. */
  key: string | null;
  kind: CtaKind;
  mode: CtaMode;
  popupType: CtaPopupType;
  heading: string;
  description: string;
  submitLabel: string;
  successMessage: string;
  fields: FieldSetting[];
  consentText: string;
  privacyHref: string | null;
  afterSubmit: CtaAfterSubmit;
  redirectHref: string | null;
  directHref: string | null;
  hasFile: boolean;
  fileHref: string | null;
  formKey: string | null;
};

type Copy = { heading: string; description: string; submitLabel: string; successMessage: string };

const COPY: Record<CtaKind, Copy> = {
  DOWNLOAD_BROCHURE: {
    heading: "Download the brochure",
    description: "Tell us who you are and your download starts straight away.",
    submitLabel: "Download",
    successMessage: "Thank you — your download has started.",
  },
  DOWNLOAD_CATALOGUE: {
    heading: "Download our catalogue",
    description: "Tell us who you are and your download starts straight away.",
    submitLabel: "Download catalogue",
    successMessage: "Thank you — your download has started.",
  },
  REQUEST_QUOTATION: {
    heading: "Request a quotation",
    description: "Build your list, tell us where to send the quotation, and we reply within one working day.",
    submitLabel: "Send quotation request",
    successMessage: "Thank you — your quotation request is with our team.",
  },
  CONTACT_US: {
    heading: "Contact us",
    description: "Tell us what you need. We reply within one working day.",
    submitLabel: "Send enquiry",
    successMessage: "Thank you — your enquiry is with our team.",
  },
  GET_PRICE: {
    heading: "Get the price",
    description: "Tell us the configuration and quantity, and we will send you a price.",
    submitLabel: "Request price",
    successMessage: "Thank you — we will send you a price shortly.",
  },
  REQUEST_DEMO: {
    heading: "Request a demo",
    description: "Tell us where you are and when suits you, and we will arrange a demonstration.",
    submitLabel: "Request demo",
    successMessage: "Thank you — we will be in touch to arrange the demo.",
  },
  ENQUIRE_NOW: {
    heading: "Enquire now",
    description: "Tell us what you need. We reply within one working day.",
    submitLabel: "Send enquiry",
    successMessage: "Thank you — your enquiry is with our team.",
  },
  CUSTOM: {
    heading: "Get in touch",
    description: "Tell us what you need. We reply within one working day.",
    submitLabel: "Send",
    successMessage: "Thank you — your message is with our team.",
  },
};

/** The built-in behaviour of a kind of button, before anyone configures it. */
export function builtInCta(kind: CtaKind): EffectiveCta {
  const popupType = POPUP_TYPES_FOR_KIND[kind][0];
  const copy = COPY[kind];
  return {
    key: null,
    kind,
    // Downloads go straight to the file unless the document is gated (the
    // controller always asks first for a gated one). A custom button is a link
    // until it is configured. Everything else opens its form, as it always has.
    mode: isDownloadKind(kind) || kind === "CUSTOM" ? "DIRECT" : "POPUP",
    popupType,
    ...copy,
    fields: defaultFieldSettings(popupType),
    consentText: CONSENT_TEXT,
    privacyHref: null,
    afterSubmit: popupType === "GATED_DOWNLOAD" ? "DOWNLOAD" : "MESSAGE",
    redirectHref: null,
    directHref: null,
    hasFile: false,
    fileHref: null,
    formKey: null,
  };
}

/** A configuration over the built-in defaults: blank copy falls back. */
export function effectiveCta(kind: CtaKind, config: PublicCtaConfig | null): EffectiveCta {
  const base = builtInCta(kind);
  if (!config || config.kind !== kind) return base;
  const popupType = POPUP_TYPES_FOR_KIND[kind].includes(config.popupType) ? config.popupType : base.popupType;
  return {
    key: config.key,
    kind,
    mode: config.mode,
    popupType,
    heading: config.heading || base.heading,
    description: config.description || (popupType === base.popupType ? base.description : ""),
    submitLabel: config.submitLabel || base.submitLabel,
    successMessage: config.successMessage || base.successMessage,
    fields: readFieldSettings(config.fields, popupType),
    consentText: config.consentText || CONSENT_TEXT,
    privacyHref: config.privacyHref,
    afterSubmit: config.afterSubmit,
    redirectHref: config.redirectHref,
    directHref: config.directHref,
    hasFile: config.hasFile,
    fileHref: config.fileHref,
    formKey: config.formKey,
  };
}

/**
 * Whether pressing the button opens a popup.
 *
 * A gated document always asks first, whatever the configuration says: the
 * file is only reachable through a grant, and a grant is only issued for a
 * stored lead. "Direct" on a gated document therefore cannot mean "skip the
 * form"; it is the document's gate, not the button, that decides.
 */
export function opensPopup(cta: EffectiveCta, options: { gatedDocument?: boolean } = {}): boolean {
  if (options.gatedDocument) return true;
  if (cta.popupType === "CUSTOM_FORM" && !cta.formKey) return false;
  return cta.mode === "POPUP";
}
