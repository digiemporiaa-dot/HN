"use client";

import { useActionState, useState } from "react";

import { Button, Field, Input, Textarea } from "@/components/ui";
import { FormFeedback } from "@/components/admin/form-feedback";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import { slugify } from "@/lib/utils/slug";
import type { ApplicationActionState } from "@/server/applications/actions";

export type ApplicationFormValues = {
  id?: string;
  name: string;
  slug: string;
  description: string;
};

type ApplicationAction = (
  previous: ApplicationActionState,
  formData: FormData,
) => Promise<ApplicationActionState>;

const INITIAL: ApplicationActionState = {};

/**
 * An application record.
 *
 * Deliberately small: an application is a label a product carries, not a page
 * with its own banner and publishing lifecycle, so it has no status, no images
 * and no category links. If that changes, it grows then rather than now.
 */
export function ApplicationForm({
  mode,
  values,
  version,
  action,
  readOnly,
}: {
  mode: "create" | "edit";
  values: ApplicationFormValues;
  version: string;
  action: ApplicationAction;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const [form, setForm] = useSyncedState(values, version);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");

  const set = <K extends keyof ApplicationFormValues>(
    key: K,
    value: ApplicationFormValues[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {values.id ? (
        <input type="hidden" name="applicationId" value={values.id} />
      ) : null}
      <FormFeedback state={state} />

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Name" required error={state.fieldErrors?.name}>
          {(control) => (
            <Input
              name="name"
              value={form.name}
              disabled={readOnly}
              placeholder="Point-of-care imaging"
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
          help={`Public URL: /applications/${form.slug || "slug"}`}
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
          label="Description"
          help="One or two sentences on what this application covers."
          error={state.fieldErrors?.description}
          className="md:col-span-2"
        >
          {(control) => (
            <Textarea
              name="description"
              value={form.description}
              disabled={readOnly}
              rows={4}
              maxLength={2000}
              onChange={(event) => set("description", event.target.value)}
              {...control}
            />
          )}
        </Field>
      </div>

      {readOnly ? null : (
        <div>
          <Button type="submit" loading={pending}>
            {mode === "create" ? "Create application" : "Save application"}
          </Button>
        </div>
      )}
    </form>
  );
}
