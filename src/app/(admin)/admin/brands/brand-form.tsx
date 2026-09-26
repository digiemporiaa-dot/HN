"use client";

import { useActionState, useState } from "react";

import { Button, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { CategoryPicker } from "@/components/admin/category-picker";
import { FormFeedback } from "@/components/admin/form-feedback";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import { CONTENT_STATUS_OPTIONS } from "@/lib/validation/content-status";
import { slugify } from "@/lib/utils/slug";
import {
  createBrandAction,
  updateBrandAction,
  type BrandActionState,
} from "@/server/brands/actions";
import type { CategoryChoice } from "@/server/categories/service";
import {
  MediaPicker,
  type MediaOption,
} from "@/components/admin/sections/field-inputs";

const INITIAL: BrandActionState = {};

export type BrandFormValues = {
  id?: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  websiteUrl: string;
  logoId: string;
  bannerId: string;
  featured: boolean;
  status: string;
  categoryIds: string[];
};

export function BrandForm({
  mode,
  values,
  version,
  categories,
  mediaOptions,
  canPublish,
  readOnly,
}: {
  mode: "create" | "edit";
  values: BrandFormValues;
  /** Changes only when a write lands, so the form catches up after a save. */
  version: string;
  categories: CategoryChoice[];
  mediaOptions: MediaOption[];
  canPublish: boolean;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createBrandAction : updateBrandAction,
    INITIAL,
  );

  const [form, setForm] = useSyncedState(values, version);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");

  const set = <K extends keyof BrandFormValues>(
    key: K,
    value: BrandFormValues[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const selected = new Set(form.categoryIds);

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {values.id ? (
        <input type="hidden" name="brandId" value={values.id} />
      ) : null}
      <FormFeedback state={state} />

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Brand name" required error={state.fieldErrors?.name}>
          {(control) => (
            <Input
              name="name"
              value={form.name}
              disabled={readOnly}
              onChange={(event) => {
                set("name", event.target.value);
                if (!slugTouched) set("slug", slugify(event.target.value));
              }}
              {...control}
            />
          )}
        </Field>

        <Field
          label="URL slug"
          required
          help={`Public URL: /brands/${form.slug || "slug"}`}
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
          label="Manufacturer website"
          help="Optional. A full https:// address."
          error={state.fieldErrors?.websiteUrl}
        >
          {(control) => (
            <Input
              name="websiteUrl"
              value={form.websiteUrl}
              disabled={readOnly}
              placeholder="https://example.com"
              inputMode="url"
              onChange={(event) => set("websiteUrl", event.target.value)}
              {...control}
            />
          )}
        </Field>

        <Field
          label="Status"
          help={canPublish ? undefined : "You cannot publish brands."}
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
          help="One line, shown on brand cards and strips."
          error={state.fieldErrors?.shortDescription}
          className="md:col-span-2"
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

        <Field label="Logo" help="Shown in brand strips and on product pages.">
          {(control) => (
            <>
              <input type="hidden" name="logoId" value={form.logoId} />
              <MediaPicker
                value={form.logoId}
                options={mediaOptions}
                onChange={(next) => set("logoId", next)}
                disabled={readOnly}
                control={control}
              />
            </>
          )}
        </Field>

        <Field label="Banner image" help="Used at the top of the brand page.">
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
          Categories supplied
        </legend>

        {/* The whole selection is posted from state rather than from the
            rendered checkboxes. A checkbox the filter has hidden is not in the
            DOM, so submitting the visible boxes would silently unlink every
            category the editor had filtered out of view. */}
        {[...selected].map((id) => (
          <input key={id} type="hidden" name="categoryIds" value={id} />
        ))}

        <CategoryPicker
          choices={categories}
          selected={selected}
          disabled={readOnly}
          emptyMessage="There are no categories yet. Create some first, then link this brand to the ones it supplies."
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
        Feature this brand in strips and grids
      </label>

      {readOnly ? null : (
        <div>
          <Button type="submit" loading={pending}>
            {mode === "create" ? "Create brand" : "Save brand"}
          </Button>
        </div>
      )}
    </form>
  );
}
