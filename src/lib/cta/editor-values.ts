import { builtInCta } from "./effective";
import type { FieldSetting } from "./fields";
import type { CtaAfterSubmit, CtaKind, CtaMode, CtaPopupType } from "./kinds";

/** The CTA popup editor's values, shared by the server pages and the client form. */
export type CtaConfigValues = {
  id?: string;
  key: string;
  name: string;
  kind: CtaKind;
  isDefault: boolean;
  mode: CtaMode;
  popupType: CtaPopupType;
  heading: string;
  description: string;
  submitLabel: string;
  successMessage: string;
  consentText: string;
  privacyHref: string;
  afterSubmit: CtaAfterSubmit;
  redirectHref: string;
  directHref: string;
  placements: string[];
  targetProductId: string;
  targetPaths: string;
  fileId: string;
  formId: string;
  fields: FieldSetting[];
};

export type CtaEditorOptions = {
  products: Array<{
    id: string;
    name: string;
    modelNumber: string | null;
    status: string;
  }>;
  files: Array<{ id: string; originalName: string; title: string | null }>;
  forms: Array<{ id: string; name: string; key: string }>;
};

export function newCtaValues(
  kind: CtaKind = "DOWNLOAD_BROCHURE",
): CtaConfigValues {
  const base = builtInCta(kind);
  return {
    key: "",
    name: "",
    kind,
    isDefault: false,
    mode: "POPUP",
    popupType: base.popupType,
    heading: base.heading,
    description: base.description,
    submitLabel: base.submitLabel,
    successMessage: base.successMessage,
    consentText: "",
    privacyHref: "",
    afterSubmit: base.afterSubmit,
    redirectHref: "",
    directHref: "",
    placements: [],
    targetProductId: "",
    targetPaths: "",
    fileId: "",
    formId: "",
    fields: base.fields,
  };
}

