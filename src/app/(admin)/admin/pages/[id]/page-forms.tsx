"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, Plus } from "lucide-react";

import { Button, Field, Input, Select } from "@/components/ui";
import {
  addSectionAction,
  createPageAction,
  updatePageAction,
  type CmsActionState,
} from "@/server/cms/actions";
import { slugify } from "@/lib/validation/cms";

const INITIAL: CmsActionState = {};

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft — not visible publicly" },
  { value: "REVIEW", label: "In review — not visible publicly" },
  { value: "PUBLISHED", label: "Published — live on the site" },
  { value: "ARCHIVED", label: "Archived — not visible publicly" },
];

function Feedback({ state }: { state: CmsActionState }) {
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
      <Feedback state={state} />

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
}: {
  pageId: string;
  title: string;
  slug: string;
  status: string;
  canPublish: boolean;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updatePageAction,
    INITIAL,
  );
  const [values, setValues] = useState({ title, slug, status });

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="pageId" value={pageId} />
      <Feedback state={state} />

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Page title" required error={state.fieldErrors?.title}>
          {(control) => (
            <Input
              name="title"
              value={values.title}
              disabled={readOnly}
              onChange={(event) =>
                setValues((current) => ({ ...current, title: event.target.value }))
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
                setValues((current) => ({ ...current, slug: event.target.value }))
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
              {STATUS_OPTIONS.map((option) => (
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

export function AddSectionForm({
  pageId,
  options,
}: {
  pageId: string;
  options: Array<{ value: string; label: string; description: string }>;
}) {
  const [state, formAction, pending] = useActionState(addSectionAction, INITIAL);
  const [type, setType] = useState(options[0]?.value ?? "");

  const selected = options.find((option) => option.value === type);

  return (
    <form
      action={formAction}
      className="border-line bg-surface-subtle flex flex-col gap-4 rounded-lg border border-dashed p-4"
    >
      <input type="hidden" name="pageId" value={pageId} />
      <Feedback state={state} />

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Add a section" className="min-w-60 flex-1">
          {(control) => (
            <Select
              name="type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              {...control}
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Button type="submit" loading={pending}>
          <Plus aria-hidden="true" className="size-4" />
          Add section
        </Button>
      </div>

      {selected ? (
        <p className="text-caption text-ink-subtle">{selected.description}</p>
      ) : null}
    </form>
  );
}
