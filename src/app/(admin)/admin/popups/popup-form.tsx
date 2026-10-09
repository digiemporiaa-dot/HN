"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { Expand, Monitor, Smartphone } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DateTimeField,
  Field,
  Input,
  Modal,
  SegmentedControl,
  Select,
  Textarea,
} from "@/components/ui";
import { FormFeedback } from "@/components/admin/form-feedback";
import { MediaPicker, type MediaOption } from "@/components/admin/sections/field-inputs";
import { BuiltForm } from "@/components/site/built-form";
import { PopupCard, type PopupCardContent } from "@/components/site/popup-card";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import { parseIstDateTime, displayIstDateTime } from "@/lib/dates/ist";
import { parseRules, popupState, targetingSummary } from "@/lib/popups/rules";
import {
  POPUP_DEVICE_LABELS,
  POPUP_TRIGGER_LABELS,
  POPUP_TYPE_LABELS,
  POPUP_TYPES,
} from "@/lib/validation/popups";
import {
  createPopupAction,
  updatePopupAction,
  type PopupActionState,
} from "@/server/popups/actions";
import type { PopupEditorOptions } from "@/server/popups/service";
import type { FormSubmitState } from "@/server/forms/submit";

export type PopupFormValues = {
  id?: string;
  active: boolean;
  name: string;
  type: (typeof POPUP_TYPES)[number];
  eyebrow: string;
  heading: string;
  description: string;
  imageId: string;
  productId: string;
  formId: string;
  ctaLabel: string;
  ctaHref: string;
  trigger: "DELAY" | "SCROLL" | "EXIT_INTENT" | "IMMEDIATE";
  delaySeconds: string;
  scrollPercent: string;
  device: "ALL" | "DESKTOP" | "MOBILE";
  frequencyDays: string;
  priority: string;
  /** "YYYY-MM-DDTHH:mm", IST wall clock, or "". */
  startsAt: string;
  endsAt: string;
  targetMode: "EXCLUDE" | "INCLUDE";
  targetRules: string;
};

export const NEW_POPUP: PopupFormValues = {
  active: false,
  name: "",
  type: "ENQUIRY",
  eyebrow: "Project enquiry",
  heading: "Planning an ICU or OT upgrade?",
  description:
    "Share your equipment requirements and speak with our team about a suitable equipment shortlist.",
  imageId: "",
  productId: "",
  formId: "",
  ctaLabel: "",
  ctaHref: "",
  trigger: "DELAY",
  delaySeconds: "12",
  scrollPercent: "50",
  device: "ALL",
  frequencyDays: "7",
  priority: "0",
  startsAt: "",
  endsAt: "",
  targetMode: "EXCLUDE",
  targetRules: "",
};

const INITIAL: PopupActionState = {};

/** The preview never submits anything. */
async function previewOnly(): Promise<FormSubmitState> {
  return { error: "This is a preview. Nothing was sent." };
}

const TYPE_HELP: Record<PopupFormValues["type"], string> = {
  ENQUIRY: "A published form inside the popup. Submissions arrive under Forms and, when mapped, as leads.",
  PRODUCT_SPOTLIGHT: "A published product with its image, linking to the product page.",
  RESOURCE: "A brochure, guide or page, behind a button.",
  ANNOUNCEMENT: "A short notice, with an optional button.",
};

export function PopupForm({
  mode,
  values,
  version,
  options,
  mediaOptions,
  readOnly,
  openPreview,
}: {
  mode: "create" | "edit";
  values: PopupFormValues;
  version: string;
  options: PopupEditorOptions;
  mediaOptions: MediaOption[];
  readOnly: boolean;
  openPreview?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createPopupAction : updatePopupAction,
    INITIAL,
  );
  const [form, setForm] = useSyncedState(values, version);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [fullPreview, setFullPreview] = useState(Boolean(openPreview));
  const titleId = useId();

  const set = <K extends keyof PopupFormValues>(key: K, value: PopupFormValues[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (state.fieldErrors && Object.keys(state.fieldErrors).length > 0) {
      document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
    }
  }, [state]);

  const errors = state.fieldErrors ?? {};
  const product = options.products.find((item) => item.id === form.productId) ?? null;
  const builtForm = options.forms.find((item) => item.id === form.formId) ?? null;
  const image = mediaOptions.find((item) => item.id === form.imageId) ?? null;

  const content: PopupCardContent = {
    eyebrow: form.eyebrow || null,
    heading: form.heading || "Heading",
    description: form.description || null,
    image: image
      ? { url: image.url, alt: "" }
      : form.type === "PRODUCT_SPOTLIGHT" && product?.imageUrl
        ? { url: product.imageUrl, alt: "" }
        : null,
    cta:
      form.ctaLabel && (form.ctaHref || (form.type === "PRODUCT_SPOTLIGHT" && product))
        ? { label: form.ctaLabel, href: form.ctaHref || product?.href || "#" }
        : null,
    product:
      form.type === "PRODUCT_SPOTLIGHT" && product
        ? { name: product.name, href: product.href, summary: product.summary || null }
        : null,
  };
  const previewForm =
    form.type === "ENQUIRY" && builtForm ? (
      // inert: focusable nowhere, submittable never.
      <div inert>
        <BuiltForm form={builtForm.preview} action={previewOnly} compact />
      </div>
    ) : form.type === "ENQUIRY" ? (
      <p className="border-line text-caption text-ink-muted rounded-lg border border-dashed p-4">
        Choose a published form to see it here.
      </p>
    ) : null;

  const rules = parseRules(form.targetRules);
  const starts = form.startsAt ? parseIstDateTime(form.startsAt) : null;
  const ends = form.endsAt ? parseIstDateTime(form.endsAt) : null;
  const scheduleState = popupState({ active: true, startsAt: starts, endsAt: ends });
  const minEnd = form.startsAt ? form.startsAt.slice(0, 10) : undefined;

  const preview = (layout: "desktop" | "mobile") => (
    <div className="public-preview">
      <PopupCard content={content} titleId={titleId} layout={layout} form={previewForm} onClose={() => undefined} />
    </div>
  );

  return (
    // The preview holds a real form, so the editor's own <form> is only the
    // left column: forms cannot nest.
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,27rem)]">
      <form action={formAction} noValidate className="flex min-w-0 flex-col gap-6">
        {values.id ? <input type="hidden" name="popupId" value={values.id} /> : null}
        <FormFeedback state={state} />

        <fieldset disabled={readOnly} className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
              <CardDescription>What the visitor sees. Keep it short and specific.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <Field label="Internal name" required help="Only staff see this." error={errors.name}>
                {(control) => (
                  <Input name="name" value={form.name} maxLength={120} onChange={(event) => set("name", event.target.value)} {...control} />
                )}
              </Field>
              <Field label="Type" required help={TYPE_HELP[form.type]} error={errors.type}>
                {(control) => (
                  <Select
                    name="type"
                    value={form.type}
                    onChange={(event) => set("type", event.target.value as PopupFormValues["type"])}
                    {...control}
                  >
                    {POPUP_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {POPUP_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Eyebrow" help="Optional, a few words above the heading." error={errors.eyebrow}>
                {(control) => (
                  <Input name="eyebrow" value={form.eyebrow} maxLength={60} onChange={(event) => set("eyebrow", event.target.value)} {...control} />
                )}
              </Field>
              <Field label="Heading" required error={errors.heading}>
                {(control) => (
                  <Input name="heading" value={form.heading} maxLength={120} onChange={(event) => set("heading", event.target.value)} {...control} />
                )}
              </Field>
              <Field label="Description" className="md:col-span-2" error={errors.description} help="Up to 600 characters.">
                {(control) => (
                  <Textarea
                    name="description"
                    rows={3}
                    maxLength={600}
                    value={form.description}
                    onChange={(event) => set("description", event.target.value)}
                    {...control}
                  />
                )}
              </Field>
              <Field
                label="Image"
                className="md:col-span-2"
                help={form.type === "PRODUCT_SPOTLIGHT" ? "Optional: the product's own image is used when empty." : "Optional. A clinical photograph works best."}
                error={errors.imageId}
              >
                {(control) => (
                  <>
                    <MediaPicker value={form.imageId} options={mediaOptions} onChange={(next) => set("imageId", next)} disabled={readOnly} control={control} />
                    <input type="hidden" name="imageId" value={form.imageId} />
                  </>
                )}
              </Field>

              {form.type === "ENQUIRY" ? (
                <Field label="Form" required className="md:col-span-2" help="Published forms only. Its rate limits, spam checks and lead mapping apply." error={errors.formId}>
                  {(control) => (
                    <Select name="formId" value={form.formId} onChange={(event) => set("formId", event.target.value)} {...control}>
                      <option value="">Choose a published form</option>
                      {options.forms.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              ) : null}

              {form.type === "PRODUCT_SPOTLIGHT" ? (
                <Field label="Product" required className="md:col-span-2" help="Published products only." error={errors.productId}>
                  {(control) => (
                    <Select name="productId" value={form.productId} onChange={(event) => set("productId", event.target.value)} {...control}>
                      <option value="">Choose a published product</option>
                      {options.products.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              ) : null}

              <Field
                label="Button text"
                help={form.type === "ENQUIRY" ? "Optional, shown under the form." : "For example: Discuss your requirement."}
                error={errors.ctaLabel}
              >
                {(control) => (
                  <Input name="ctaLabel" value={form.ctaLabel} maxLength={40} onChange={(event) => set("ctaLabel", event.target.value)} {...control} />
                )}
              </Field>
              <Field
                label="Button link"
                help={form.type === "PRODUCT_SPOTLIGHT" ? "Empty links to the product page." : "A site path such as /contact, or an https:// address."}
                error={errors.ctaHref}
              >
                {(control) => (
                  <Input
                    name="ctaHref"
                    value={form.ctaHref}
                    maxLength={500}
                    inputMode="url"
                    placeholder="/contact"
                    onChange={(event) => set("ctaHref", event.target.value)}
                    {...control}
                  />
                )}
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Display</CardTitle>
              <CardDescription>When it opens, on which devices, and how often.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-2 md:col-span-2">
                <span className="text-label text-ink">Trigger</span>
                <SegmentedControl
                  label="Trigger"
                  name="trigger"
                  value={form.trigger}
                  onChange={(next) => set("trigger", next)}
                  options={(["DELAY", "SCROLL", "EXIT_INTENT", "IMMEDIATE"] as const).map((value) => ({
                    value,
                    label: POPUP_TRIGGER_LABELS[value],
                  }))}
                />
                <p className="text-caption text-ink-muted">
                  {form.trigger === "EXIT_INTENT"
                    ? "Opens when the pointer leaves through the top of the window. Desktop only: phones never see an exit-intent popup."
                    : form.trigger === "IMMEDIATE"
                      ? "Opens as soon as the page is ready. Use sparingly."
                      : form.trigger === "SCROLL"
                        ? "Opens once the visitor has scrolled this far down the page."
                        : "Opens after the visitor has been on the page this long."}
                </p>
              </div>
              {form.trigger === "DELAY" ? (
                <Field label="Delay (seconds)" error={errors.delaySeconds} help="0 to 600.">
                  {(control) => (
                    <Input name="delaySeconds" type="number" min={0} max={600} inputMode="numeric" value={form.delaySeconds} onChange={(event) => set("delaySeconds", event.target.value)} {...control} />
                  )}
                </Field>
              ) : (
                <input type="hidden" name="delaySeconds" value={form.delaySeconds || "0"} />
              )}
              {form.trigger === "SCROLL" ? (
                <Field label="Scroll depth (%)" error={errors.scrollPercent} help="5 to 100.">
                  {(control) => (
                    <Input name="scrollPercent" type="number" min={5} max={100} inputMode="numeric" value={form.scrollPercent} onChange={(event) => set("scrollPercent", event.target.value)} {...control} />
                  )}
                </Field>
              ) : (
                <input type="hidden" name="scrollPercent" value={form.scrollPercent || "50"} />
              )}
              <div className="flex min-w-0 flex-col gap-2 md:col-span-2">
                <span className="text-label text-ink">Devices</span>
                <SegmentedControl
                  label="Devices"
                  name="device"
                  value={form.device}
                  onChange={(next) => set("device", next)}
                  options={(["ALL", "DESKTOP", "MOBILE"] as const).map((value) => ({ value, label: POPUP_DEVICE_LABELS[value] }))}
                />
              </div>
              <Field
                label="Show again after (days)"
                error={errors.frequencyDays}
                help="0 shows it again on the next visit, never twice in one. Completing its form counts as closing it."
              >
                {(control) => (
                  <Input name="frequencyDays" type="number" min={0} max={365} inputMode="numeric" value={form.frequencyDays} onChange={(event) => set("frequencyDays", event.target.value)} {...control} />
                )}
              </Field>
              <Field label="Priority" error={errors.priority} help="When two popups could open on a page, the higher number wins.">
                {(control) => (
                  <Input name="priority" type="number" min={-100} max={100} inputMode="numeric" value={form.priority} onChange={(event) => set("priority", event.target.value)} {...control} />
                )}
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pages</CardTitle>
              <CardDescription>
                Admin, sign-in, quotation (/rfq) and contact pages are never covered, whatever the rules say.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <SegmentedControl
                label="Where it shows"
                name="targetMode"
                value={form.targetMode}
                onChange={(next) => set("targetMode", next)}
                options={[
                  { value: "EXCLUDE", label: "All pages, except…" },
                  { value: "INCLUDE", label: "Only these pages" },
                ]}
              />
              <Field
                label={form.targetMode === "INCLUDE" ? "Show on" : "Hide on"}
                required={form.targetMode === "INCLUDE"}
                error={errors.targetRules}
                help="One per line. /products/ventilators matches that page only; /products/* matches /products and every page under it; /* matches every page. Paths only, no domain or query string."
              >
                {(control) => (
                  <Textarea
                    name="targetRules"
                    rows={4}
                    value={form.targetRules}
                    placeholder={form.targetMode === "INCLUDE" ? "/products/*\n/solutions/icu-setup" : "/blog/*"}
                    className="font-mono text-[0.8125rem]"
                    onChange={(event) => set("targetRules", event.target.value)}
                    {...control}
                  />
                )}
              </Field>
              <p className="text-caption text-ink-muted" aria-live="polite">
                {rules.errors.length > 0 ? rules.errors[0] : `Summary: ${targetingSummary(form.targetMode, rules.rules)}`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
              <CardDescription>Optional. Times are India Standard Time. The end is exclusive.</CardDescription>
            </CardHeader>
            {/* Side by side only where each field has room for a date and a time. */}
            <CardContent className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <Field label="Starts" error={errors.startsAt} help="Empty: as soon as it is switched on.">
                {(control) => (
                  <DateTimeField
                    id={control.id}
                    aria-describedby={control["aria-describedby"]}
                    invalid={control["aria-invalid"]}
                    label="Start date"
                    name="startsAt"
                    value={form.startsAt}
                    onChange={(next) => set("startsAt", next)}
                    disabled={readOnly}
                  />
                )}
              </Field>
              <Field label="Ends" error={errors.endsAt} help="Empty: until it is switched off.">
                {(control) => (
                  <DateTimeField
                    id={control.id}
                    aria-describedby={control["aria-describedby"]}
                    invalid={control["aria-invalid"]}
                    label="End date"
                    name="endsAt"
                    min={minEnd}
                    value={form.endsAt}
                    onChange={(next) => set("endsAt", next)}
                    disabled={readOnly}
                  />
                )}
              </Field>
              <p className="text-caption text-ink-muted sm:col-span-2 xl:col-span-1 2xl:col-span-2" aria-live="polite">
                {starts && ends && ends <= starts
                  ? "The end must be after the start."
                  : !starts && !ends
                    ? "No schedule: it runs whenever it is switched on."
                    : scheduleState === "expired"
                      ? `This schedule ended on ${displayIstDateTime(ends as Date)}. It will not show until the dates change.`
                      : scheduleState === "scheduled"
                        ? `Once switched on, it starts showing on ${displayIstDateTime(starts as Date)}.`
                        : ends
                          ? `Once switched on, it shows until ${displayIstDateTime(ends)}.`
                          : "Once switched on, it shows from now with no end."}
              </p>
            </CardContent>
          </Card>
        </fieldset>

        {!readOnly ? (
          <div className="bg-surface/90 border-line sticky bottom-3 z-[5] flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 shadow-[var(--shadow-md)] backdrop-blur">
            <p className="text-caption text-ink-muted px-1">
              {mode === "create" ? "New popups are saved switched off." : form.active ? "This popup is active: saving updates it for visitors." : "Saved popups stay off until switched on."}
            </p>
            <Button type="submit" loading={pending}>
              {mode === "create" ? "Create popup" : "Save changes"}
            </Button>
          </div>
        ) : null}
      </form>

      <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start" aria-label="Preview">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Preview</CardTitle>
              <CardDescription>Unsaved changes included. Nothing is recorded.</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setFullPreview(true)}>
              <Expand aria-hidden="true" className="size-4" />
              Full size
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SegmentedControl
              label="Preview device"
              semantics="tabs"
              value={device}
              onChange={setDevice}
              size="sm"
              options={[
                { value: "desktop", label: "Desktop", icon: <Monitor aria-hidden="true" className="size-3.5" /> },
                { value: "mobile", label: "Mobile", icon: <Smartphone aria-hidden="true" className="size-3.5" /> },
              ]}
            />
            <div className="bg-surface-muted overflow-hidden rounded-xl p-3" data-unsaved-ignore>
              {device === "desktop" ? (
                <div className="origin-top-left">{preview("desktop")}</div>
              ) : (
                <div className="mx-auto w-full max-w-[22rem]">{preview("mobile")}</div>
              )}
            </div>
          </CardContent>
        </Card>
      </aside>

      <Modal open={fullPreview} onClose={() => setFullPreview(false)} title="Popup preview" description="As visitors will see it. Nothing is submitted." size="lg">
        <div className="flex flex-col gap-4">
          <SegmentedControl
            label="Preview device"
            semantics="tabs"
            value={device}
            onChange={setDevice}
            size="sm"
            options={[
              { value: "desktop", label: "Desktop", icon: <Monitor aria-hidden="true" className="size-3.5" /> },
              { value: "mobile", label: "Mobile", icon: <Smartphone aria-hidden="true" className="size-3.5" /> },
            ]}
          />
          <div className="bg-navy-950/70 rounded-xl p-4 sm:p-8">
            <div className={device === "desktop" ? "mx-auto max-w-[47rem]" : "mx-auto max-w-[23.5rem]"}>{preview(device)}</div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
