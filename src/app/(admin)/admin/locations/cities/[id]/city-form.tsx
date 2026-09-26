"use client";

import { useActionState, type ReactNode } from "react";

import {
  Button,
  Checkbox,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { FormFeedback } from "@/components/admin/form-feedback";
import {
  MediaPicker,
  type MediaOption,
} from "@/components/admin/sections/field-inputs";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import { CONTENT_STATUS_OPTIONS } from "@/lib/validation/content-status";
import {
  updateCityAction,
  type LocationActionState,
} from "@/server/locations/actions";

const INITIAL: LocationActionState = {};

const RICH_HELP =
  "Blank lines start a new paragraph. **bold**, *italic* and [links](/path) are supported.";

export type CityFormValues = {
  id: string;
  stateId: string;
  name: string;
  slug: string;
  headline: string;
  heroImageId: string;
  intro: string;
  content: string;
  coverage: string;
  ctaHeading: string;
  ctaBody: string;
  ctaLabel: string;
  seoTitle: string;
  seoDescription: string;
  indexable: boolean;
  status: string;
};

function Group({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="border-line flex flex-col gap-5 border-t pt-6 first:border-t-0 first:pt-0">
      <legend className="sr-only">{title}</legend>
      <div className="flex flex-col gap-1">
        <h3 className="text-body text-ink font-medium">{title}</h3>
        {description ? (
          <p className="text-body-sm text-ink-muted max-w-[70ch]">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </fieldset>
  );
}

/**
 * Everything a city page says, in one form.
 *
 * Controlled rather than left to the DOM: React clears an uncontrolled form
 * when its action resolves, and a refused save on a form this long would throw
 * away an afternoon's writing.
 */
export function CityForm({
  values,
  version,
  states,
  mediaOptions,
  canPublish,
  readOnly,
}: {
  values: CityFormValues;
  version: string;
  states: Array<{ id: string; name: string; kind: string }>;
  mediaOptions: MediaOption[];
  canPublish: boolean;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateCityAction,
    INITIAL,
  );
  const [form, setForm] = useSyncedState(values, version);

  const set = <K extends keyof CityFormValues>(
    key: K,
    value: CityFormValues[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const text = (
    key: keyof CityFormValues,
    label: string,
    options: {
      help?: string;
      maxLength?: number;
      rows?: number;
      wide?: boolean;
      required?: boolean;
    } = {},
  ) => (
    <Field
      label={label}
      help={options.help}
      required={options.required}
      error={state.fieldErrors?.[key]}
      className={options.wide ? "md:col-span-2" : undefined}
    >
      {(control) =>
        options.rows ? (
          <Textarea
            name={key}
            rows={options.rows}
            maxLength={options.maxLength}
            value={String(form[key] ?? "")}
            disabled={readOnly}
            onChange={(event) => set(key, event.target.value as never)}
            {...control}
          />
        ) : (
          <Input
            name={key}
            maxLength={options.maxLength}
            value={String(form[key] ?? "")}
            disabled={readOnly}
            onChange={(event) => set(key, event.target.value as never)}
            {...control}
          />
        )
      }
    </Field>
  );

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="cityId" value={values.id} />
      <FormFeedback state={state} />

      <Group title="City">
        <div className="grid gap-5 md:grid-cols-3">
          {text("name", "Name", { required: true, maxLength: 80 })}

          <Field label="State" required error={state.fieldErrors?.stateId}>
            {(control) => (
              <Select
                name="stateId"
                value={form.stateId}
                disabled={readOnly}
                onChange={(event) => set("stateId", event.target.value)}
                {...control}
              >
                {states.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                    {option.kind === "UNION_TERRITORY" ? " (UT)" : ""}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {text("slug", "Slug", {
            required: true,
            maxLength: 80,
            help: `/locations/${form.slug || "slug"} — changing it moves a published page.`,
          })}
        </div>
      </Group>

      <Group title="Hero">
        <div className="grid gap-5 md:grid-cols-2">
          {text("headline", "Headline", {
            maxLength: 160,
            help: "Leave blank to use the city's name.",
          })}
          <Field
            label="Image"
            help="Optional. A stock skyline is worse than none."
          >
            {(control) => (
              <>
                <input
                  type="hidden"
                  name="heroImageId"
                  value={form.heroImageId}
                />
                <MediaPicker
                  value={form.heroImageId}
                  options={mediaOptions}
                  disabled={readOnly}
                  control={control}
                  onChange={(next) => set("heroImageId", next)}
                />
              </>
            )}
          </Field>
          {text("intro", "Intro", {
            rows: 2,
            maxLength: 600,
            wide: true,
            help: "One or two sentences under the headline.",
          })}
        </div>
      </Group>

      <Group title="Content">
        <div className="grid gap-5 md:grid-cols-2">
          {text("content", "Body", {
            rows: 8,
            maxLength: 20000,
            wide: true,
            help: RICH_HELP,
          })}
        </div>
      </Group>

      <Group
        title="Local coverage"
        description="What serving this city actually involves: engineers based there, response times, hospitals already equipped. Only what is true — it is the one part of the page a competitor cannot copy by changing the name."
      >
        <div className="grid gap-5 md:grid-cols-2">
          {text("coverage", "Coverage", {
            rows: 6,
            maxLength: 20000,
            wide: true,
            help: RICH_HELP,
          })}
        </div>
      </Group>

      <Group
        title="Call to action"
        description="Blank fields fall back to the site defaults."
      >
        <div className="grid gap-5 md:grid-cols-2">
          {text("ctaHeading", "Heading", { maxLength: 160 })}
          {text("ctaLabel", "Button label", { maxLength: 40 })}
          {text("ctaBody", "Body", { rows: 2, maxLength: 600, wide: true })}
        </div>
      </Group>

      <Group title="Search">
        <div className="grid gap-5 md:grid-cols-2">
          {text("seoTitle", "Title", {
            maxLength: 70,
            help: `${form.seoTitle.length}/60 — blank uses the headline.`,
          })}
          {text("seoDescription", "Description", {
            rows: 2,
            maxLength: 170,
            help: `${form.seoDescription.length}/155 — blank uses the intro.`,
          })}
        </div>

        <label className="text-body-sm text-ink flex items-start gap-2.5">
          <Checkbox
            name="indexable"
            className="mt-0.5"
            checked={form.indexable}
            disabled={readOnly || !canPublish}
            onChange={(event) => set("indexable", event.target.checked)}
          />
          <span>
            Ask search engines to index this page
            <span className="text-caption text-ink-muted block">
              Off by default. A city page with nothing specific on it is better
              visible to visitors and invisible to search than the other way
              round.
              {canPublish ? "" : " Changing it needs publishing permission."}
            </span>
          </span>
        </label>
        {/* A disabled checkbox is not posted, which would read as "off". The
            stored value travels instead so it is left alone. */}
        {!canPublish && form.indexable ? (
          <input type="hidden" name="indexable" value="on" />
        ) : null}
      </Group>

      <Group title="Status">
        <div className="grid gap-5 md:grid-cols-3">
          <Field label="Status" error={state.fieldErrors?.status}>
            {(control) => (
              <Select
                name="status"
                value={form.status}
                disabled={readOnly}
                onChange={(event) => set("status", event.target.value)}
                {...control}
              >
                {CONTENT_STATUS_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={
                      !canPublish &&
                      option.value === "PUBLISHED" &&
                      values.status !== "PUBLISHED"
                    }
                  >
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </Group>

      {readOnly ? null : (
        <div>
          <Button type="submit" loading={pending}>
            Save city
          </Button>
        </div>
      )}
    </form>
  );
}
