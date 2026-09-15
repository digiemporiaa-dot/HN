"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Button, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import { CONTENT_STATUS_OPTIONS } from "@/lib/validation/content-status";
import { slugifyBrand } from "@/lib/validation/brands";
import {
  createBrandAction,
  updateBrandAction,
  type BrandActionState,
} from "@/server/brands/actions";
import type { CategoryChoice } from "@/server/brands/service";
import {
  MediaPicker,
  type MediaOption,
} from "@/app/(admin)/admin/pages/[id]/field-inputs";

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

function Feedback({ state }: { state: BrandActionState }) {
  if (state.error) {
    return (
      <div
        role="alert"
        className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3"
      >
        <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>{state.error}</span>
      </div>
    );
  }
  if (state.success) {
    return (
      <div className="border-success-100 bg-success-50 text-success-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>{state.success}</span>
      </div>
    );
  }
  return null;
}

/**
 * Which categories a brand supplies.
 *
 * A checkbox list rather than a multi-select: the catalogue is a two-level tree
 * and an editor needs to see a subcategory sitting under its parent to pick the
 * right one. Filtering keeps it usable once the catalogue is large.
 */
function CategoryPicker({
  choices,
  selected,
  onToggle,
  disabled,
}: {
  choices: CategoryChoice[];
  selected: Set<string>;
  onToggle: (id: string, on: boolean) => void;
  disabled: boolean;
}) {
  const [filter, setFilter] = useState("");

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return choices;
    // A matching parent keeps its children visible, so narrowing to a category
    // does not hide the subcategory the editor is looking for.
    const matches = (choice: CategoryChoice) =>
      choice.name.toLowerCase().includes(needle) ||
      (choice.parentName ?? "").toLowerCase().includes(needle);
    return choices.filter(matches);
  }, [choices, filter]);

  if (choices.length === 0) {
    return (
      <p className="border-line text-body-sm text-ink-muted rounded-md border border-dashed p-4">
        There are no categories yet. Create some first, then link this brand to
        the ones it supplies.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        type="search"
        value={filter}
        disabled={disabled}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filter categories"
        aria-label="Filter categories"
      />

      <div className="border-line max-h-72 overflow-y-auto rounded-md border p-3">
        {visible.length === 0 ? (
          <p className="text-body-sm text-ink-muted py-2 text-center">
            No categories match that filter.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {visible.map((choice) => (
              <li key={choice.id}>
                <label
                  className={cn(
                    "text-body-sm text-ink flex items-center gap-2.5 py-1",
                    choice.depth === 1 && "pl-6",
                  )}
                >
                  {/* No `name`: the selection is submitted from state below,
                      so filtering the list cannot change what is saved. */}
                  <Checkbox
                    value={choice.id}
                    checked={selected.has(choice.id)}
                    disabled={disabled}
                    onChange={(event) =>
                      onToggle(choice.id, event.target.checked)
                    }
                  />
                  <span className={choice.depth === 0 ? "font-medium" : ""}>
                    {choice.name}
                  </span>
                  {choice.depth === 1 ? (
                    <span className="text-caption text-ink-subtle">
                      in {choice.parentName}
                    </span>
                  ) : null}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-caption text-ink-subtle">
        {selected.size} selected
      </p>
    </div>
  );
}

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
      <Feedback state={state} />

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Brand name" required error={state.fieldErrors?.name}>
          {(control) => (
            <Input
              name="name"
              value={form.name}
              disabled={readOnly}
              onChange={(event) => {
                set("name", event.target.value);
                if (!slugTouched) set("slug", slugifyBrand(event.target.value));
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
