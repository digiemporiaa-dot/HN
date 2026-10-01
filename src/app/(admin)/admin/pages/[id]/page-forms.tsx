"use client";

import { useActionState, useState } from "react";

import { useSyncedState } from "@/lib/hooks/use-synced-state";
import { CONTENT_STATUS_OPTIONS } from "@/lib/validation/content-status";

import { Button, Field, Input, Radio, Select } from "@/components/ui";
import { PAGE_TEMPLATES, type PageTemplateKey } from "@/lib/cms/page-templates";
import { FormFeedback } from "@/components/admin/form-feedback";
import {
  createPageAction,
  updatePageAction,
  type CmsActionState,
} from "@/server/cms/actions";
import { slugify } from "@/lib/utils/slug";

const INITIAL: CmsActionState = {};

export function PageCreateForm({
  initialTemplate = "blank",
  takenSlugs = [],
}: {
  initialTemplate?: PageTemplateKey;
  /** Template addresses that already have a page. */
  takenSlugs?: string[];
}) {
  const [state, formAction, pending] = useActionState(
    createPageAction,
    INITIAL,
  );
  const start = PAGE_TEMPLATES.find((option) => option.key === initialTemplate);
  const [template, setTemplate] = useState<PageTemplateKey>(initialTemplate);
  const [title, setTitle] = useState<string>(start?.title ?? "");
  const [slug, setSlug] = useState<string>(start?.slug ?? "");
  const [titleTouched, setTitleTouched] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  const choose = (key: PageTemplateKey) => {
    setTemplate(key);
    const option = PAGE_TEMPLATES.find((entry) => entry.key === key);
    if (!option) return;
    // A template suggests its usual title and address, but never overwrites
    // what the editor has typed.
    if (!titleTouched) setTitle(option.title);
    if (!slugTouched) setSlug(option.slug || slugify(option.title));
  };

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <FormFeedback state={state} />

      <fieldset className="flex flex-col gap-3">
        <legend className="text-label text-ink mb-2 font-medium">
          Start from
        </legend>
        <input type="hidden" name="template" value={template} />
        {PAGE_TEMPLATES.map((option) => (
          <label
            key={option.key}
            className="border-line has-[:checked]:border-primary has-[:checked]:bg-surface-muted flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors"
          >
            <Radio
              name="template-choice"
              value={option.key}
              checked={template === option.key}
              onChange={() => choose(option.key)}
              className="mt-1"
            />
            <span className="flex flex-col gap-1">
              <span className="text-body-sm text-ink font-medium">
                {option.label}
                {option.slug && takenSlugs.includes(option.slug) ? (
                  <span className="text-caption text-ink-subtle font-normal">
                    {" "}
                    — /{option.slug} already exists
                  </span>
                ) : null}
              </span>
              <span className="text-caption text-ink-muted">
                {option.description}
              </span>
            </span>
          </label>
        ))}
        {template !== "blank" ? (
          <p className="text-caption text-ink-muted">
            Text in [[double brackets]] is an instruction for you to replace.
            The page cannot be published while any remains.
          </p>
        ) : null}
      </fieldset>

      <Field label="Page title" required error={state.fieldErrors?.title}>
        {(control) => (
          <Input
            name="title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setTitleTouched(true);
              // The slug follows the title until the author edits it, after
              // which it is theirs — a published URL must never move on its own.
              if (!slugTouched) setSlug(slugify(event.target.value));
            }}
            {...control}
          />
        )}
      </Field>

      <Field
        label="URL slug"
        required
        help={`The page will live at /${slug || "your-slug"}`}
        error={state.fieldErrors?.slug}
      >
        {(control) => (
          <Input
            name="slug"
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
            {...control}
          />
        )}
      </Field>

      <input type="hidden" name="status" value="DRAFT" />

      <div>
        <Button type="submit" loading={pending}>
          Create page
        </Button>
      </div>
    </form>
  );
}

export function PageSettingsForm({
  pageId,
  title,
  slug,
  isHome = false,
  status,
  canPublish,
  readOnly,
  version,
}: {
  pageId: string;
  title: string;
  slug: string;
  /** The homepage's address is fixed; the server ignores a posted slug for it. */
  isHome?: boolean;
  status: string;
  canPublish: boolean;
  readOnly: boolean;
  /** Changes only when a write lands, so the form catches up after a save. */
  version: string;
}) {
  const [state, formAction, pending] = useActionState(
    updatePageAction,
    INITIAL,
  );
  const [values, setValues] = useSyncedState({ title, slug, status }, version);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="pageId" value={pageId} />
      <FormFeedback state={state} />

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Page title" required error={state.fieldErrors?.title}>
          {(control) => (
            <Input
              name="title"
              value={values.title}
              disabled={readOnly}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              {...control}
            />
          )}
        </Field>

        <Field
          label="URL slug"
          required
          help={isHome ? "The homepage always lives at /." : `/${values.slug}`}
          error={state.fieldErrors?.slug}
        >
          {(control) => (
            <Input
              name="slug"
              value={isHome ? "/" : values.slug}
              disabled={readOnly || isHome}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  slug: event.target.value,
                }))
              }
              {...control}
            />
          )}
        </Field>

        <Field
          label="Status"
          error={state.fieldErrors?.status}
          help={
            canPublish
              ? undefined
              : "You do not have permission to publish pages."
          }
        >
          {(control) => (
            <Select
              name="status"
              value={values.status}
              disabled={readOnly}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
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
      </div>

      {readOnly ? null : (
        <div>
          <Button type="submit" loading={pending}>
            Save page
          </Button>
        </div>
      )}
    </form>
  );
}
