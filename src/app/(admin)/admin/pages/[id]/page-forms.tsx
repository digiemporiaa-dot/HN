"use client";

import { useActionState, useState } from "react";

import { useSyncedState } from "@/lib/hooks/use-synced-state";
import { CONTENT_STATUS_OPTIONS } from "@/lib/validation/content-status";

import { Button, Field, Input, Select } from "@/components/ui";
import { FormFeedback } from "@/components/admin/form-feedback";
import {
  createPageAction,
  updatePageAction,
  type CmsActionState,
} from "@/server/cms/actions";
import { slugify } from "@/lib/utils/slug";

const INITIAL: CmsActionState = {};

export function PageCreateForm() {
  const [state, formAction, pending] = useActionState(
    createPageAction,
    INITIAL,
  );
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <FormFeedback state={state} />

      <Field label="Page title" required error={state.fieldErrors?.title}>
        {(control) => (
          <Input
            name="title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
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
  status,
  canPublish,
  readOnly,
  version,
}: {
  pageId: string;
  title: string;
  slug: string;
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
          help={`/${values.slug}`}
          error={state.fieldErrors?.slug}
        >
          {(control) => (
            <Input
              name="slug"
              value={values.slug}
              disabled={readOnly}
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
