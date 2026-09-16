"use client";

import { useActionState, useState } from "react";

import { useSyncedState } from "@/lib/hooks/use-synced-state";
import { CONTENT_STATUS_OPTIONS } from "@/lib/validation/content-status";

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
  createCategoryAction,
  updateCategoryAction,
  type CategoryActionState,
} from "@/server/categories/actions";
import { slugify } from "@/lib/utils/slug";
import {
  MediaPicker,
  type MediaOption,
} from "@/app/(admin)/admin/pages/[id]/field-inputs";

const INITIAL: CategoryActionState = {};

export type CategoryFormValues = {
  id?: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  procurementInfo: string;
  imageId: string;
  bannerId: string;
  featured: boolean;
  status: string;
  parentId: string;
  /** Set for a subcategory, so the form can show the real public path. */
  parentSlug?: string | null;
};

/**
 * One form for both levels and both modes.
 *
 * A subcategory needs exactly the fields a category needs, so splitting this in
 * two would mean maintaining the same form twice and letting them drift.
 */
export function CategoryForm({
  mode,
  values,
  parents,
  mediaOptions,
  canPublish,
  readOnly,
  version,
}: {
  mode: "create" | "edit";
  values: CategoryFormValues;
  /** Changes only when a write lands, so the form catches up after a save. */
  version: string;
  /** Empty when the form is locked to one level. */
  parents: Array<{ id: string; name: string }>;
  mediaOptions: MediaOption[];
  canPublish: boolean;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createCategoryAction : updateCategoryAction,
    INITIAL,
  );

  // Controlled: React clears an uncontrolled form once its action resolves,
  // which would discard the editor's work whenever validation fails.
  const [form, setForm] = useSyncedState(values, version);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");

  const set = <K extends keyof CategoryFormValues>(
    key: K,
    value: CategoryFormValues[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const path = values.parentSlug
    ? `/categories/${values.parentSlug}/${form.slug || "slug"}`
    : `/categories/${form.slug || "slug"}`;

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {values.id ? (
        <input type="hidden" name="categoryId" value={values.id} />
      ) : null}
      <FormFeedback state={state} />

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Name" required error={state.fieldErrors?.name}>
          {(control) => (
            <Input
              name="name"
              value={form.name}
              disabled={readOnly}
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
          help={mode === "create" ? undefined : `Public URL: ${path}`}
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

        {mode === "create" ? (
          <Field
            label="Parent category"
            help="Leave empty to create a top-level category."
            error={state.fieldErrors?.parentId}
          >
            {(control) => (
              <Select
                name="parentId"
                value={form.parentId}
                disabled={readOnly || parents.length === 0}
                onChange={(event) => set("parentId", event.target.value)}
                {...control}
              >
                <option value="">No parent — a top-level category</option>
                {parents.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ) : null}

        <Field
          label="Status"
          help={canPublish ? undefined : "You cannot publish categories."}
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
          help="One line, shown on cards and in category grids."
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

        <Field
          label="Procurement information"
          help="Installation, warranty, service cover — what a hospital's purchase team needs before raising a tender. Appears as its own section on the category page."
          error={state.fieldErrors?.procurementInfo}
          className="md:col-span-2"
        >
          {(control) => (
            <Textarea
              name="procurementInfo"
              value={form.procurementInfo}
              disabled={readOnly}
              rows={6}
              maxLength={20000}
              onChange={(event) => set("procurementInfo", event.target.value)}
              {...control}
            />
          )}
        </Field>

        <Field label="Card image" help="Used in category grids and menus.">
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
          help="Used at the top of the category page."
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

      <label className="text-body-sm text-ink flex items-center gap-2.5">
        <Checkbox
          name="featured"
          checked={form.featured}
          disabled={readOnly}
          onChange={(event) => set("featured", event.target.checked)}
        />
        Feature this category in grids and menus
      </label>

      {readOnly ? null : (
        <div>
          <Button type="submit" loading={pending}>
            {mode === "create" ? "Create category" : "Save category"}
          </Button>
        </div>
      )}
    </form>
  );
}
