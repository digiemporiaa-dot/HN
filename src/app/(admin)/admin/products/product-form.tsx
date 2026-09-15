"use client";

import { useActionState, useState } from "react";

import {
  Button,
  Checkbox,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { CheckboxPicker } from "@/components/admin/checkbox-picker";
import { FormFeedback } from "@/components/admin/form-feedback";
import { GalleryPicker } from "@/components/admin/gallery-picker";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import { CONTENT_STATUS_OPTIONS } from "@/lib/validation/content-status";
import { slugify } from "@/lib/utils/slug";
import type { ProductActionState } from "@/server/products/actions";
import type { NamedChoice } from "@/server/products/service";
import {
  MediaPicker,
  type MediaOption,
} from "@/app/(admin)/admin/pages/[id]/field-inputs";

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  modelNumber: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  brandId: string;
  primaryImageId: string;
  galleryIds: string[];
  specialtyIds: string[];
  solutionIds: string[];
  featured: boolean;
  status: string;
};

export type CategoryOption = NamedChoice & { depth: number };

type ProductAction = (
  previous: ProductActionState,
  formData: FormData,
) => Promise<ProductActionState>;

const INITIAL: ProductActionState = {};

/**
 * The product record.
 *
 * A product does not share the taxonomy form: it is filed under exactly one
 * category rather than linked to many, its images are an ordered gallery rather
 * than a single picture, and it carries a model number that nothing else has.
 */
export function ProductForm({
  mode,
  values,
  version,
  createAction,
  updateAction,
  categories,
  brands,
  specialties,
  solutions,
  mediaOptions,
  canPublish,
  readOnly,
}: {
  mode: "create" | "edit";
  values: ProductFormValues;
  /** Changes only when a write lands, so edits survive a rejected save. */
  version: string;
  createAction: ProductAction;
  updateAction: ProductAction;
  categories: CategoryOption[];
  brands: NamedChoice[];
  specialties: NamedChoice[];
  solutions: NamedChoice[];
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

  const set = <K extends keyof ProductFormValues>(
    key: K,
    value: ProductFormValues[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const toggle = (
    key: "specialtyIds" | "solutionIds",
    id: string,
    on: boolean,
  ) =>
    set(
      key,
      on ? [...form[key], id] : form[key].filter((value) => value !== id),
    );

  const selectedSpecialties = new Set(form.specialtyIds);
  const selectedSolutions = new Set(form.solutionIds);

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {values.id ? (
        <input type="hidden" name="productId" value={values.id} />
      ) : null}
      <FormFeedback state={state} />

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Product name" required error={state.fieldErrors?.name}>
          {(control) => (
            <Input
              name="name"
              value={form.name}
              disabled={readOnly}
              placeholder="Anaesthesia workstation"
              onChange={(event) => {
                set("name", event.target.value);
                // The slug follows the name until it is edited by hand: a URL
                // that is already published must not move on its own.
                if (!slugTouched) set("slug", slugify(event.target.value));
              }}
              {...control}
            />
          )}
        </Field>

        <Field
          label="URL slug"
          required
          help={`Public URL: /products/${form.slug || "slug"}`}
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
          label="Category"
          required
          help="Decides where the product appears in the catalogue."
          error={state.fieldErrors?.categoryId}
        >
          {(control) => (
            <Select
              name="categoryId"
              value={form.categoryId}
              disabled={readOnly}
              onChange={(event) => set("categoryId", event.target.value)}
              {...control}
            >
              <option value="">Choose a category</option>
              {categories.map((option) => (
                <option key={option.id} value={option.id}>
                  {/* Subcategories are indented rather than grouped: a parent
                      is itself a valid choice, which optgroup cannot express. */}
                  {option.depth > 0 ? `  — ${option.name}` : option.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          label="Brand"
          help="Optional. Products supplied without a named manufacturer can leave this blank."
          error={state.fieldErrors?.brandId}
        >
          {(control) => (
            <Select
              name="brandId"
              value={form.brandId}
              disabled={readOnly}
              onChange={(event) => set("brandId", event.target.value)}
              {...control}
            >
              <option value="">No brand</option>
              {brands.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          label="Model number"
          help="The manufacturer's own reference, if there is one."
          error={state.fieldErrors?.modelNumber}
        >
          {(control) => (
            <Input
              name="modelNumber"
              value={form.modelNumber}
              disabled={readOnly}
              onChange={(event) => set("modelNumber", event.target.value)}
              {...control}
            />
          )}
        </Field>

        <Field
          label="Status"
          help={canPublish ? undefined : "You cannot publish products."}
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
          help="One line, shown on cards and in listings."
          error={state.fieldErrors?.shortDescription}
          className="md:col-span-2"
        >
          {(control) => (
            <Textarea
              name="shortDescription"
              value={form.shortDescription}
              disabled={readOnly}
              rows={2}
              maxLength={400}
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
              rows={10}
              maxLength={40000}
              onChange={(event) => set("description", event.target.value)}
              {...control}
            />
          )}
        </Field>

        <Field
          label="Primary image"
          help="Shown first on the product page and used wherever one image has to stand for the product."
        >
          {(control) => (
            <>
              <input
                type="hidden"
                name="primaryImageId"
                value={form.primaryImageId}
              />
              <MediaPicker
                value={form.primaryImageId}
                options={mediaOptions}
                onChange={(next) => set("primaryImageId", next)}
                disabled={readOnly}
                control={control}
              />
            </>
          )}
        </Field>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-label text-ink font-medium">Gallery</legend>
        <p className="text-caption text-ink-subtle">
          Additional views, in the order they should appear.
        </p>
        <GalleryPicker
          value={form.galleryIds}
          options={mediaOptions}
          disabled={readOnly}
          onChange={(next) => set("galleryIds", next)}
        />
      </fieldset>

      <div className="grid gap-6 md:grid-cols-2">
        <fieldset className="flex flex-col gap-3">
          <legend className="text-label text-ink font-medium">
            Specialties
          </legend>
          <p className="text-caption text-ink-subtle">
            The departments this product is used by.
          </p>

          {/* Posted from state rather than from the rendered checkboxes: a box
              the filter has hidden is not in the DOM, and submitting only the
              visible ones would silently unlink everything out of view. */}
          {form.specialtyIds.map((id) => (
            <input key={id} type="hidden" name="specialtyIds" value={id} />
          ))}

          <CheckboxPicker
            choices={specialties}
            selected={selectedSpecialties}
            disabled={readOnly}
            filterLabel="Filter specialties"
            emptyMessage="No specialties yet. Add them under Specialties."
            onToggle={(id, on) => toggle("specialtyIds", id, on)}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-label text-ink font-medium">Solutions</legend>
          <p className="text-caption text-ink-subtle">
            The packaged offerings this product forms part of.
          </p>

          {form.solutionIds.map((id) => (
            <input key={id} type="hidden" name="solutionIds" value={id} />
          ))}

          <CheckboxPicker
            choices={solutions}
            selected={selectedSolutions}
            disabled={readOnly}
            filterLabel="Filter solutions"
            emptyMessage="No solutions yet. Add them under Solutions."
            onToggle={(id, on) => toggle("solutionIds", id, on)}
          />
        </fieldset>
      </div>

      <label className="text-body-sm text-ink flex items-center gap-2.5">
        <Checkbox
          name="featured"
          checked={form.featured}
          disabled={readOnly}
          onChange={(event) => set("featured", event.target.checked)}
        />
        Feature this product in listings
      </label>

      {readOnly ? null : (
        <div>
          <Button type="submit" loading={pending}>
            {mode === "create" ? "Create product" : "Save product"}
          </Button>
        </div>
      )}
    </form>
  );
}
