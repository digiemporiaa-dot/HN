"use client";

import { useActionState, useMemo, useState } from "react";
import { Expand } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
} from "@/components/ui";
import { FormFeedback } from "@/components/admin/form-feedback";
import { ConsentField, CtaFields } from "@/components/site/cta/cta-fields";
import {
  afterSubmitOptions,
  CTA_AFTER_SUBMIT_LABELS,
  CTA_KIND_LABELS,
  CTA_KINDS,
  CTA_POPUP_TYPE_LABELS,
  isDownloadKind,
  POPUP_TYPES_FOR_KIND,
  type CtaAfterSubmit,
  type CtaKind,
  type CtaMode,
  type CtaPopupType,
} from "@/lib/cta/kinds";
import {
  FIELD_DEFINITIONS,
  readFieldSettings,
  type FieldSetting,
} from "@/lib/cta/fields";
import { builtInCta } from "@/lib/cta/effective";
import type { CtaConfigValues, CtaEditorOptions } from "@/lib/cta/editor-values";
import { placementsForKind } from "@/lib/cta/placements";
import { CONSENT_TEXT } from "@/lib/validation/leads";
import {
  createCtaConfigAction,
  updateCtaConfigAction,
  type CtaAdminState,
} from "@/server/cta/admin-actions";

export type { CtaConfigValues, CtaEditorOptions } from "@/lib/cta/editor-values";

const INITIAL: CtaAdminState = {};

export function CtaConfigForm({
  mode,
  values: initial,
  options,
  readOnly,
}: {
  mode: "create" | "edit";
  values: CtaConfigValues;
  options: CtaEditorOptions;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createCtaConfigAction : updateCtaConfigAction,
    INITIAL,
  );
  const [values, setValues] = useState(initial);
  const [fullPreview, setFullPreview] = useState(false);
  const set = <K extends keyof CtaConfigValues>(
    key: K,
    value: CtaConfigValues[K],
  ) => setValues((current) => ({ ...current, [key]: value }));
  const errors = state.fieldErrors ?? {};

  const types = POPUP_TYPES_FOR_KIND[values.kind];
  const afterOptions = afterSubmitOptions(values.popupType);
  const placements = placementsForKind(values.kind);
  const fields = useMemo(
    () => readFieldSettings(values.fields, values.popupType),
    [values.fields, values.popupType],
  );

  const changeKind = (kind: CtaKind) => {
    const base = builtInCta(kind);
    setValues((current) => ({
      ...current,
      kind,
      popupType: base.popupType,
      afterSubmit: base.afterSubmit,
      fields: base.fields,
      placements: current.placements.filter((id) =>
        placementsForKind(kind).some((p) => p.id === id),
      ),
      heading: current.heading || base.heading,
    }));
  };
  const changeType = (popupType: CtaPopupType) =>
    setValues((current) => ({
      ...current,
      popupType,
      fields: readFieldSettings(current.fields, popupType),
      afterSubmit: afterSubmitOptions(popupType).includes(current.afterSubmit)
        ? current.afterSubmit
        : afterSubmitOptions(popupType)[0],
    }));
  const setField = (key: FieldSetting["key"], patch: Partial<FieldSetting>) =>
    set(
      "fields",
      fields.map((field) =>
        field.key === key
          ? {
              ...field,
              ...patch,
              required:
                (patch.enabled ?? field.enabled) &&
                (patch.required ?? field.required),
            }
          : field,
      ),
    );

  const disabled = readOnly || pending;
  const preview = <CtaPreview values={{ ...values, fields }} />;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
      <form
        action={formAction}
        className="flex min-w-0 flex-col gap-6"
        noValidate
      >
        {values.id ? (
          <input type="hidden" name="configId" value={values.id} />
        ) : null}
        <input type="hidden" name="fields" value={JSON.stringify(fields)} />
        {values.placements.map((id) => (
          <input key={id} type="hidden" name="placements" value={id} />
        ))}

        <div className="flex min-w-0 flex-col gap-6">
          <FormFeedback
            state={
              state.fieldErrors
                ? { error: "Some fields need attention." }
                : state
            }
          />

          <Card>
            <CardHeader>
              <CardTitle as="h2">Button</CardTitle>
              <CardDescription>
                Which kind of button this configures, and whether it is the
                default for that kind.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Name"
                required
                error={errors.name}
                help="For staff only."
              >
                {(control) => (
                  <Input
                    name="name"
                    value={values.name}
                    maxLength={120}
                    disabled={disabled}
                    onChange={(e) => set("name", e.target.value)}
                    {...control}
                  />
                )}
              </Field>
              <Field
                label="Key"
                required
                error={errors.key}
                help={
                  mode === "edit"
                    ? "Fixed once created: leads and pages refer to it."
                    : "Lower case, digits and dashes, e.g. brochure-default."
                }
              >
                {(control) => (
                  <Input
                    name="key"
                    value={values.key}
                    maxLength={60}
                    readOnly={mode === "edit"}
                    disabled={disabled}
                    onChange={(e) => set("key", e.target.value.toLowerCase())}
                    {...control}
                  />
                )}
              </Field>
              <Field label="Kind of button" error={errors.kind}>
                {(control) => (
                  <Select
                    name="kind"
                    value={values.kind}
                    disabled={disabled || mode === "edit"}
                    onChange={(e) => changeKind(e.target.value as CtaKind)}
                    {...control}
                  >
                    {CTA_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {CTA_KIND_LABELS[kind]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              {mode === "edit" ? (
                <input type="hidden" name="kind" value={values.kind} />
              ) : null}
              <Field
                label="Behaviour"
                error={errors.mode}
                help={
                  isDownloadKind(values.kind)
                    ? "A gated document always asks first, whatever is chosen here."
                    : undefined
                }
              >
                {(control) => (
                  <Select
                    name="mode"
                    value={values.mode}
                    disabled={disabled}
                    onChange={(e) => set("mode", e.target.value as CtaMode)}
                    {...control}
                  >
                    <option value="POPUP">Open the popup before acting</option>
                    <option value="DIRECT">Act straight away, no popup</option>
                  </Select>
                )}
              </Field>
              <label className="text-body-sm text-ink flex items-start gap-2.5 sm:col-span-2">
                <Checkbox
                  name="isDefault"
                  checked={values.isDefault}
                  disabled={disabled}
                  onChange={(e) => set("isDefault", e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Default for every {CTA_KIND_LABELS[values.kind].toLowerCase()}{" "}
                  button
                  <span className="text-caption text-ink-muted block">
                    A more specific configuration (by placement, product or
                    page) still wins. Only one default per kind.
                  </span>
                  {errors.isDefault ? (
                    <span
                      role="alert"
                      className="text-caption text-danger-700 block"
                    >
                      {errors.isDefault}
                    </span>
                  ) : null}
                </span>
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">Popup</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Popup type" error={errors.popupType}>
                {(control) => (
                  <Select
                    name="popupType"
                    value={values.popupType}
                    disabled={disabled || types.length === 1}
                    onChange={(e) => changeType(e.target.value as CtaPopupType)}
                    {...control}
                  >
                    {types.map((type) => (
                      <option key={type} value={type}>
                        {CTA_POPUP_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              {types.length === 1 ? (
                <input
                  type="hidden"
                  name="popupType"
                  value={values.popupType}
                />
              ) : null}
              <Field label="After it is sent" error={errors.afterSubmit}>
                {(control) => (
                  <Select
                    name="afterSubmit"
                    value={values.afterSubmit}
                    disabled={disabled}
                    onChange={(e) =>
                      set("afterSubmit", e.target.value as CtaAfterSubmit)
                    }
                    {...control}
                  >
                    {afterOptions.map((option) => (
                      <option key={option} value={option}>
                        {CTA_AFTER_SUBMIT_LABELS[option]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field
                label="Heading"
                required
                error={errors.heading}
                className="sm:col-span-2"
              >
                {(control) => (
                  <Input
                    name="heading"
                    value={values.heading}
                    maxLength={160}
                    disabled={disabled}
                    onChange={(e) => set("heading", e.target.value)}
                    {...control}
                  />
                )}
              </Field>
              <Field
                label="Description"
                error={errors.description}
                className="sm:col-span-2"
              >
                {(control) => (
                  <Textarea
                    name="description"
                    rows={2}
                    value={values.description}
                    maxLength={400}
                    disabled={disabled}
                    onChange={(e) => set("description", e.target.value)}
                    {...control}
                  />
                )}
              </Field>
              <Field
                label="Submit button"
                error={errors.submitLabel}
                help="Blank uses the built-in wording."
              >
                {(control) => (
                  <Input
                    name="submitLabel"
                    value={values.submitLabel}
                    maxLength={40}
                    disabled={disabled}
                    onChange={(e) => set("submitLabel", e.target.value)}
                    {...control}
                  />
                )}
              </Field>
              <Field label="Success message" error={errors.successMessage}>
                {(control) => (
                  <Input
                    name="successMessage"
                    value={values.successMessage}
                    maxLength={300}
                    disabled={disabled}
                    onChange={(e) => set("successMessage", e.target.value)}
                    {...control}
                  />
                )}
              </Field>
              {values.afterSubmit === "REDIRECT" ? (
                <Field
                  label="Go to"
                  required
                  error={errors.redirectHref}
                  help="A path such as /thank-you, or an https:// address."
                  className="sm:col-span-2"
                >
                  {(control) => (
                    <Input
                      name="redirectHref"
                      value={values.redirectHref}
                      disabled={disabled}
                      onChange={(e) => set("redirectHref", e.target.value)}
                      {...control}
                    />
                  )}
                </Field>
              ) : null}
              {values.mode === "DIRECT" && !isDownloadKind(values.kind) ? (
                <Field
                  label="Direct link"
                  error={errors.directHref}
                  help="Where the button goes without a popup. Blank keeps the button's own link."
                  className="sm:col-span-2"
                >
                  {(control) => (
                    <Input
                      name="directHref"
                      value={values.directHref}
                      disabled={disabled}
                      onChange={(e) => set("directHref", e.target.value)}
                      {...control}
                    />
                  )}
                </Field>
              ) : null}
              {values.kind === "DOWNLOAD_CATALOGUE" ? (
                <Field
                  label="Catalogue file"
                  required
                  error={errors.fileId}
                  help="A document from the media library. While gated, it is served only after the form."
                  className="sm:col-span-2"
                >
                  {(control) => (
                    <Select
                      name="fileId"
                      value={values.fileId}
                      disabled={disabled}
                      onChange={(e) => set("fileId", e.target.value)}
                      {...control}
                    >
                      <option value="">Choose a file</option>
                      {options.files.map((file) => (
                        <option key={file.id} value={file.id}>
                          {file.title || file.originalName}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              ) : null}
              {values.popupType === "CUSTOM_FORM" ? (
                <Field
                  label="Form"
                  required
                  error={errors.formId}
                  help="A published form from Content › Forms."
                  className="sm:col-span-2"
                >
                  {(control) => (
                    <Select
                      name="formId"
                      value={values.formId}
                      disabled={disabled}
                      onChange={(e) => set("formId", e.target.value)}
                      {...control}
                    >
                      <option value="">Choose a form</option>
                      {options.forms.map((form) => (
                        <option key={form.id} value={form.id}>
                          {form.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              ) : null}
            </CardContent>
          </Card>

          {values.popupType !== "CUSTOM_FORM" ? (
            <Card>
              <CardHeader>
                <CardTitle as="h2">Fields</CardTitle>
                <CardDescription>
                  Full name and email are always asked for and required.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {errors.fields ? (
                  <p role="alert" className="text-caption text-danger-700 mb-3">
                    {errors.fields}
                  </p>
                ) : null}
                <table className="text-body-sm w-full">
                  <thead>
                    <tr className="text-ink-muted border-line border-b text-left">
                      <th scope="col" className="py-2 font-medium">
                        Field
                      </th>
                      <th
                        scope="col"
                        className="w-24 py-2 text-center font-medium"
                      >
                        Show
                      </th>
                      <th
                        scope="col"
                        className="w-24 py-2 text-center font-medium"
                      >
                        Required
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field) => (
                      <tr key={field.key} className="border-line border-b">
                        <td className="py-2.5">
                          {FIELD_DEFINITIONS[field.key].label}
                        </td>
                        <td className="py-2.5 text-center">
                          <Checkbox
                            aria-label={`Show ${FIELD_DEFINITIONS[field.key].label}`}
                            checked={field.enabled}
                            disabled={disabled}
                            onChange={(e) =>
                              setField(field.key, { enabled: e.target.checked })
                            }
                          />
                        </td>
                        <td className="py-2.5 text-center">
                          <Checkbox
                            aria-label={`Require ${FIELD_DEFINITIONS[field.key].label}`}
                            checked={field.required}
                            disabled={disabled || !field.enabled}
                            onChange={(e) =>
                              setField(field.key, {
                                required: e.target.checked,
                              })
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Consent wording"
                    error={errors.consentText}
                    help="Blank uses the site's standard wording. Stored with every lead."
                    className="sm:col-span-2"
                  >
                    {(control) => (
                      <Textarea
                        name="consentText"
                        rows={2}
                        value={values.consentText}
                        placeholder={CONSENT_TEXT}
                        maxLength={500}
                        disabled={disabled}
                        onChange={(e) => set("consentText", e.target.value)}
                        {...control}
                      />
                    )}
                  </Field>
                  <Field
                    label="Privacy link"
                    error={errors.privacyHref}
                    help="Blank uses the site's privacy page."
                  >
                    {(control) => (
                      <Input
                        name="privacyHref"
                        value={values.privacyHref}
                        disabled={disabled}
                        onChange={(e) => set("privacyHref", e.target.value)}
                        {...control}
                      />
                    )}
                  </Field>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle as="h2">Where it applies</CardTitle>
              <CardDescription>
                {values.isDefault
                  ? "As the default, it applies to every button of this kind without a more specific configuration."
                  : "Choose the buttons it takes over. Page-builder buttons can also choose it by name. Optionally restrict it to one product or to some pages."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <fieldset
                disabled={disabled || values.isDefault}
                className="flex flex-col gap-2"
              >
                <legend className="text-label text-ink mb-1 font-medium">
                  Button placements
                </legend>
                {placements.map((placement) => (
                  <label
                    key={placement.id}
                    className="text-body-sm text-ink flex items-start gap-2.5"
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={values.placements.includes(placement.id)}
                      onChange={(e) =>
                        set(
                          "placements",
                          e.target.checked
                            ? [...values.placements, placement.id]
                            : values.placements.filter(
                                (id) => id !== placement.id,
                              ),
                        )
                      }
                    />
                    <span>
                      {placement.label}
                      <span className="text-caption text-ink-subtle block font-mono">
                        {placement.id}
                      </span>
                    </span>
                  </label>
                ))}
                {errors.placements ? (
                  <p role="alert" className="text-caption text-danger-700">
                    {errors.placements}
                  </p>
                ) : null}
              </fieldset>
              <Field
                label="Only for this product"
                error={errors.targetProductId}
              >
                {(control) => (
                  <Select
                    name="targetProductId"
                    value={values.targetProductId}
                    disabled={disabled || values.isDefault}
                    onChange={(e) => set("targetProductId", e.target.value)}
                    {...control}
                  >
                    <option value="">Any product</option>
                    {options.products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                        {product.modelNumber ? ` (${product.modelNumber})` : ""}
                        {product.status === "PUBLISHED"
                          ? ""
                          : " — not published"}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field
                label="Only on these pages"
                error={errors.targetPaths}
                help="One per line: /contact for one page, /products/* for a section. Blank means every page."
              >
                {(control) => (
                  <Textarea
                    name="targetPaths"
                    rows={3}
                    value={values.targetPaths}
                    disabled={disabled || values.isDefault}
                    onChange={(e) => set("targetPaths", e.target.value)}
                    {...control}
                  />
                )}
              </Field>
            </CardContent>
          </Card>

          {readOnly ? null : (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" loading={pending}>
                {mode === "create"
                  ? "Create, switched off"
                  : "Save configuration"}
              </Button>
              <span className="text-caption text-ink-muted">
                Saving never switches it on or off.
              </span>
            </div>
          )}
        </div>
      </form>

      <aside
        className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-24 xl:self-start"
        aria-label="Preview"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-label text-ink font-medium">Preview</h2>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setFullPreview(true)}
          >
            <Expand aria-hidden="true" className="size-4" />
            Open as visitors see it
          </Button>
        </div>
        <div className="border-line bg-surface rounded-2xl border p-5 shadow-[var(--shadow-card)]">
          {preview}
        </div>
        <p className="text-caption text-ink-muted">
          The preview never sends anything.
        </p>
      </aside>

      <Modal
        open={fullPreview}
        onClose={() => setFullPreview(false)}
        title={values.heading || "Preview"}
        description={values.description || undefined}
        size={values.popupType === "REQUEST_QUOTATION" ? "xl" : "md"}
      >
        <CtaPreview values={{ ...values, fields }} bare />
      </Modal>
    </div>
  );
}

/** The popup's contents as a visitor would see them, inert. */
function CtaPreview({
  values,
  bare = false,
}: {
  values: CtaConfigValues;
  bare?: boolean;
}) {
  const [sample, setSample] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  if (values.mode === "DIRECT" && !isDownloadKind(values.kind)) {
    return (
      <p className="text-body-sm text-ink-muted">
        No popup: the button acts straight away
        {values.directHref ? ` and goes to ${values.directHref}` : ""}.
      </p>
    );
  }
  if (values.popupType === "CUSTOM_FORM") {
    return (
      <p className="text-body-sm text-ink-muted">
        The chosen form is shown in the popup, exactly as on its own page.
      </p>
    );
  }
  return (
    // An inert copy: typing works so the layout can be judged, nothing submits.
    <div
      className="flex flex-col gap-4"
      onSubmit={(event) => event.preventDefault()}
    >
      {bare ? null : (
        <div className="flex flex-col gap-1">
          <p className="text-h4 text-ink">{values.heading || "Heading"}</p>
          {values.description ? (
            <p className="text-body-sm text-ink-muted">{values.description}</p>
          ) : null}
        </div>
      )}
      {values.popupType === "REQUEST_QUOTATION" ? (
        <p className="text-caption text-ink-muted border-line rounded-lg border border-dashed p-3">
          Step 1 lists the products and lets the visitor search, set quantities
          and add notes. The fields below are step 2.
        </p>
      ) : null}
      <CtaFields
        settings={values.fields}
        values={sample}
        onChange={(key, value) => setSample((s) => ({ ...s, [key]: value }))}
        compact={!bare}
      />
      <ConsentField
        text={values.consentText || CONSENT_TEXT}
        privacyHref={values.privacyHref || null}
        checked={consent}
        onChange={setConsent}
      />
      <div>
        <Button type="button" disabled>
          {values.submitLabel || builtInCta(values.kind).submitLabel}
        </Button>
      </div>
    </div>
  );
}
