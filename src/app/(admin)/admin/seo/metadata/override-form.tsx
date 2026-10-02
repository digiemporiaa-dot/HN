"use client";

import { useActionState } from "react";

import { Button, Checkbox, Field, Input, Textarea } from "@/components/ui";
import { FormFeedback } from "@/components/admin/form-feedback";
import {
  MediaPicker,
  type MediaOption,
} from "@/components/admin/sections/field-inputs";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import {
  DESCRIPTION_ADVISED,
  DESCRIPTION_MAX,
  TITLE_ADVISED,
  TITLE_MAX,
} from "@/lib/seo/overrides";
import { cn } from "@/lib/utils/cn";
import {
  createOverrideAction,
  updateOverrideAction,
  type OverrideActionState,
} from "@/server/seo/override-actions";

const INITIAL: OverrideActionState = {};

export type OverrideFormValues = {
  id?: string;
  path: string;
  title: string;
  titleAbsolute: boolean;
  description: string;
  canonical: string;
  noindex: boolean;
  ogImageId: string;
  note: string;
};

function Counter({ value, advised }: { value: string; advised: number }) {
  const over = value.length > advised;
  return (
    <span className={cn(over ? "text-warning-700" : "text-ink-subtle")}>
      {value.length}/{advised}
      {over ? " — likely to be cut off" : ""}
    </span>
  );
}

export function OverrideForm({
  mode,
  values,
  version,
  readOnly,
  canPublish,
  mediaOptions,
  titleTemplate,
  siteUrl,
}: {
  mode: "create" | "edit";
  values: OverrideFormValues;
  version: string;
  readOnly: boolean;
  /** Whether this editor may change indexation. */
  canPublish: boolean;
  mediaOptions: MediaOption[];
  /** The site's title template, like "%s | Company", for the preview. */
  titleTemplate: string;
  siteUrl: string;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createOverrideAction : updateOverrideAction,
    INITIAL,
  );
  const [form, setForm] = useSyncedState(values, version);
  const set = <K extends keyof OverrideFormValues>(
    key: K,
    value: OverrideFormValues[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const shownTitle = form.title
    ? form.titleAbsolute
      ? form.title
      : titleTemplate.replace("%s", form.title)
    : "The page's own title";
  const shownUrl = `${siteUrl.replace(/\/$/, "")}${form.path.trim() || "/"}`;

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {values.id ? (
        <input type="hidden" name="overrideId" value={values.id} />
      ) : null}
      <FormFeedback state={state} />

      <Field
        label="Address"
        required
        help="The public page this applies to, like /products/name or / for the homepage."
        error={state.fieldErrors?.path}
      >
        {(control) => (
          <Input
            name="path"
            value={form.path}
            disabled={readOnly}
            placeholder="/products/name"
            onChange={(event) => set("path", event.target.value)}
            {...control}
          />
        )}
      </Field>

      <Field
        label="Title"
        help="Blank keeps the page's own."
        error={state.fieldErrors?.title}
      >
        {(control) => (
          <Input
            name="title"
            value={form.title}
            maxLength={TITLE_MAX}
            disabled={readOnly}
            onChange={(event) => set("title", event.target.value)}
            {...control}
          />
        )}
      </Field>
      <p className="text-caption -mt-4 text-right">
        <Counter value={form.title} advised={TITLE_ADVISED} />
      </p>

      <label className="text-body-sm text-ink -mt-3 flex items-start gap-2.5">
        <Checkbox
          name="titleAbsolute"
          className="mt-0.5"
          checked={form.titleAbsolute}
          disabled={readOnly || !form.title}
          onChange={(event) => set("titleAbsolute", event.target.checked)}
        />
        <span>
          Use the title exactly as written
          <span className="text-caption text-ink-muted block">
            Otherwise the site name is added, as on every other page.
          </span>
        </span>
      </label>

      <Field
        label="Description"
        help="The snippet under the title in search results."
        error={state.fieldErrors?.description}
      >
        {(control) => (
          <Textarea
            name="description"
            rows={3}
            maxLength={DESCRIPTION_MAX}
            value={form.description}
            disabled={readOnly}
            onChange={(event) => set("description", event.target.value)}
            {...control}
          />
        )}
      </Field>
      <p className="text-caption -mt-4 text-right">
        <Counter value={form.description} advised={DESCRIPTION_ADVISED} />
      </p>

      {/* A plain rendering of how the page might appear in a results list.
          Approximate by nature — search engines rewrite titles and snippets
          as they see fit — but it shows at a glance what is being changed. */}
      <div
        aria-label="Search result preview"
        className="border-line bg-surface-muted flex flex-col gap-1 rounded-md border p-4"
      >
        <span className="text-caption text-ink-subtle break-all">
          {shownUrl}
        </span>
        <span
          className={cn(
            "text-body text-info-700 line-clamp-1 font-medium",
            !form.title && "italic opacity-70",
          )}
        >
          {shownTitle}
        </span>
        <span
          className={cn(
            "text-body-sm text-ink-muted line-clamp-2",
            !form.description && "italic opacity-70",
          )}
        >
          {form.description || "The page's own description"}
        </span>
      </div>

      <Field
        label="Canonical address"
        help="Only when another page is the one search engines should show instead. Blank keeps the page's own address."
        error={state.fieldErrors?.canonical}
      >
        {(control) => (
          <Input
            name="canonical"
            value={form.canonical}
            disabled={readOnly}
            placeholder="/products/preferred-page"
            onChange={(event) => set("canonical", event.target.value)}
            {...control}
          />
        )}
      </Field>

      <Field
        label="Social sharing image"
        help="Shown when the page is shared. A photo, ideally 1200 × 630."
        error={state.fieldErrors?.ogImageId}
      >
        {(control) => (
          <>
            <input type="hidden" name="ogImageId" value={form.ogImageId} />
            <MediaPicker
              value={form.ogImageId}
              options={mediaOptions}
              disabled={readOnly}
              control={control}
              onChange={(next) => set("ogImageId", next)}
            />
          </>
        )}
      </Field>

      <div className="flex flex-col gap-1.5">
        <label className="text-body-sm text-ink flex items-start gap-2.5">
          <Checkbox
            name="noindex"
            className="mt-0.5"
            checked={form.noindex}
            disabled={readOnly || !canPublish}
            onChange={(event) => set("noindex", event.target.checked)}
          />
          <span>
            Ask search engines not to index this page
            <span className="text-caption text-ink-muted block">
              {canPublish
                ? "The page stays visible to visitors and is left out of the sitemap."
                : "Changing indexation needs the SEO publish permission."}
            </span>
          </span>
        </label>
        {/* A disabled checkbox is not submitted, so its value is carried
            separately for an editor who cannot change it. */}
        {!canPublish && form.noindex ? (
          <input type="hidden" name="noindex" value="on" />
        ) : null}
        {state.fieldErrors?.noindex ? (
          <p className="text-caption text-danger-700">
            {state.fieldErrors.noindex}
          </p>
        ) : null}
      </div>

      <Field
        label="Note"
        help="Why the override exists, for whoever reviews it next."
        error={state.fieldErrors?.note}
      >
        {(control) => (
          <Textarea
            name="note"
            rows={2}
            maxLength={300}
            value={form.note}
            disabled={readOnly}
            onChange={(event) => set("note", event.target.value)}
            {...control}
          />
        )}
      </Field>

      {readOnly ? null : (
        <div>
          <Button type="submit" loading={pending}>
            {mode === "create" ? "Create override" : "Save override"}
          </Button>
        </div>
      )}
    </form>
  );
}
