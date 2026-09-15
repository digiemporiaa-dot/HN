"use client";

import { useActionState, useState } from "react";

import { Button, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { CategoryPicker } from "@/components/admin/category-picker";
import { FormFeedback } from "@/components/admin/form-feedback";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import { CONTENT_STATUS_OPTIONS } from "@/lib/validation/content-status";
import { slugify } from "@/lib/utils/slug";
import type { CategoryChoice } from "@/server/categories/service";
import {
  MediaPicker,
  type MediaOption,
} from "@/app/(admin)/admin/pages/[id]/field-inputs";

/**
 * The fields a taxonomy entity carries. Specialties and solutions have exactly
 * this shape — one is a department that uses equipment, the other a bundle the
 * company delivers, but the record is the same — so they share this form.
 *
 * Brands deliberately keep their own form: a brand has a manufacturer website
 * and calls its picture a logo, and bending this component to cover that would
 * make it a configuration language rather than a form.
 */
export type TaxonomyFormValues = {
  id?: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  imageId: string;
  bannerId: string;
  featured: boolean;
  status: string;
  categoryIds: string[];
};

export type TaxonomyActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

type TaxonomyAction = (
  previous: TaxonomyActionState,
  formData: FormData,
) => Promise<TaxonomyActionState>;

/** The words that differ between one taxonomy entity and another. */
export type TaxonomyCopy = {
  /** "specialty" — lower case, used mid-sentence. */
  noun: string;
  /** The hidden input carrying the record id, e.g. "specialtyId". */
  idField: string;
  /** Route prefix for the public URL preview, e.g. "specialties". */
  pathPrefix: string;
  namePlaceholder: string;
  categoriesLegend: string;
  categoriesEmpty: string;
  featureLabel: string;
};

const INITIAL: TaxonomyActionState = {};

const sentenceCase = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

export function TaxonomyForm({
  mode,
  values,
  version,
  copy,
  createAction,
  updateAction,
  categories,
  mediaOptions,
  canPublish,
  readOnly,
}: {
  mode: "create" | "edit";
  values: TaxonomyFormValues;
  /** Changes only when a write lands, so the form catches up after a save. */
  version: string;
  copy: TaxonomyCopy;
  createAction: TaxonomyAction;
  updateAction: TaxonomyAction;
  categories: CategoryChoice[];
  mediaOptions: MediaOption[];
  canPublish: boolean;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createAction : updateAction,
    INITIAL,
  );

  const [form, setForm] = useSyncedState(values, version);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");

  const set = <K extends keyof TaxonomyFormValues>(
    key: K,
    value: TaxonomyFormValues[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const selected = new Set(form.categoryIds);

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {values.id ? (
        <input type="hidden" name={copy.idField} value={values.id} />
      ) : null}
      <FormFeedback state={state} />

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label={`${sentenceCase(copy.noun)} name`}
          required
          error={state.fieldErrors?.name}
        >
          {(control) => (
            <Input
              name="name"
              value={form.name}
              disabled={readOnly}
              placeholder={copy.namePlaceholder}
              onChange={(event) => {
                set("name", event.target.value);
                // The slug follows the name until it is edited, after which it
                // is the author's: a published URL must not move on its own.
                if (!slugTouched) set("slug", slugify(event.target.value));
              }}
              {...control}
            />
          )}
        </Field>

        <Field
          label="URL slug"
          required
          help={`Public URL: /${copy.pathPrefix}/${form.slug || "slug"}`}
          error={state.fieldErrors?.slug}
        >
          {(control) => (
            <Input
              name="slug"
              value={form.slug}
              disabled={readOnly}
              onChange={(event) => {
                setSlugTouched(true);
                set("slug", event.target.value);
              }}
              {...control}
            />
          )}
        </Field>

        <Field
          label="Status"
          help={canPublish ? undefined : `You cannot publish ${copy.noun}s.`}
        >
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
                  disabled={option.value === "PUBLISHED" && !canPublish}
                >
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          label="Short description"
          help="One line, shown on cards and in grids."
          error={state.fieldErrors?.shortDescription}
        >
          {(control) => (
            <Textarea
              name="shortDescription"
              value={form.shortDescription}
              disabled={readOnly}
              rows={2}
              maxLength={300}
              onChange={(event) => set("shortDescription", event.target.value)}
              {...control}
            />
          )}
        </Field>

        <Field
          label="Description"
          help="Blank lines start a new paragraph. **bold**, *italic* and [links](/path) are supported."
          error={state.fieldErrors?.description}
          className="md:col-span-2"
        >
          {(control) => (
            <Textarea
              name="description"
              value={form.description}
              disabled={readOnly}
              rows={8}
              maxLength={20000}
              onChange={(event) => set("description", event.target.value)}
              {...control}
            />
          )}
        </Field>

        <Field label="Card image" help="Used in grids and menus.">
          {(control) => (
            <>
              <input type="hidden" name="imageId" value={form.imageId} />
              <MediaPicker
                value={form.imageId}
                options={mediaOptions}
                onChange={(next) => set("imageId", next)}
                disabled={readOnly}
                control={control}
              />
            </>
          )}
        </Field>

        <Field
          label="Banner image"
          help={`Used at the top of the ${copy.noun} page.`}
        >
          {(control) => (
            <>
              <input type="hidden" name="bannerId" value={form.bannerId} />
              <MediaPicker
                value={form.bannerId}
                options={mediaOptions}
                onChange={(next) => set("bannerId", next)}
                disabled={readOnly}
                control={control}
              />
            </>
          )}
        </Field>
      </div>

      <fieldset className="flex flex-col gap-3" disabled={readOnly}>
        <legend className="text-label text-ink font-medium">
          {copy.categoriesLegend}
        </legend>

        {/* Posted from state rather than from the rendered checkboxes: a box the
            filter has hidden is not in the DOM, and submitting only the visible
            ones would silently unlink everything filtered out of view. */}
        {[...selected].map((id) => (
          <input key={id} type="hidden" name="categoryIds" value={id} />
        ))}

        <CategoryPicker
          choices={categories}
          selected={selected}
          disabled={readOnly}
          emptyMessage={copy.categoriesEmpty}
          onToggle={(id, on) =>
            set(
              "categoryIds",
              on
                ? [...form.categoryIds, id]
                : form.categoryIds.filter((value) => value !== id),
            )
          }
        />
      </fieldset>

      <label className="text-body-sm text-ink flex items-center gap-2.5">
        <Checkbox
          name="featured"
          checked={form.featured}
          disabled={readOnly}
          onChange={(event) => set("featured", event.target.checked)}
        />
        {copy.featureLabel}
      </label>

      {readOnly ? null : (
        <div>
          <Button type="submit" loading={pending}>
            {mode === "create"
              ? `Create ${copy.noun}`
              : `Save ${copy.noun}`}
          </Button>
        </div>
      )}
    </form>
  );
}
