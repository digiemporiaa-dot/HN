"use client";

import { useActionState, useState } from "react";

import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { FormFeedback } from "@/components/admin/form-feedback";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import { CONTENT_STATUS_OPTIONS } from "@/lib/validation/content-status";
import { slugify } from "@/lib/utils/slug";
import type { FormActionState } from "@/server/forms/actions";

export type FormDetailValues = {
  id?: string;
  name: string;
  key: string;
  description: string;
  successMessage: string;
  submitLabel: string;
  notifyEmail: string;
  status: string;
};

type FormAction = (
  previous: FormActionState,
  formData: FormData,
) => Promise<FormActionState>;

const INITIAL: FormActionState = {};

/** What a form is, apart from its questions. */
export function FormDetails({
  mode,
  values,
  version,
  action,
  canPublish,
  readOnly,
}: {
  mode: "create" | "edit";
  values: FormDetailValues;
  version: string;
  action: FormAction;
  canPublish: boolean;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const [form, setForm] = useSyncedState(values, version);
  const [keyTouched, setKeyTouched] = useState(mode === "edit");

  const set = (key: keyof FormDetailValues, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {values.id ? (
        <input type="hidden" name="formId" value={values.id} />
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
                // The key follows the name until it is edited, after which it
                // is the author's — the same rule slugs follow, and for a
                // stronger reason: a key is what every page embedding this
                // form refers to, so it must never move on its own.
                if (!keyTouched) set("key", slugify(event.target.value));
              }}
              {...control}
            />
          )}
        </Field>

        <Field
          label="Key"
          required
          help="How a page refers to this form. Changing it breaks any page already embedding it."
          error={state.fieldErrors?.key}
        >
          {(control) => (
            <Input
              name="key"
              value={form.key}
              disabled={readOnly}
              onChange={(event) => {
                setKeyTouched(true);
                set("key", event.target.value);
              }}
              {...control}
            />
          )}
        </Field>

        <Field
          label="Description"
          help="Shown above the questions."
          error={state.fieldErrors?.description}
          className="md:col-span-2"
        >
          {(control) => (
            <Textarea
              name="description"
              rows={3}
              maxLength={1000}
              value={form.description}
              disabled={readOnly}
              onChange={(event) => set("description", event.target.value)}
              {...control}
            />
          )}
        </Field>

        <Field
          label="Success message"
          help="What someone is told once they have sent it."
          error={state.fieldErrors?.successMessage}
        >
          {(control) => (
            <Textarea
              name="successMessage"
              rows={2}
              maxLength={600}
              value={form.successMessage}
              disabled={readOnly}
              onChange={(event) => set("successMessage", event.target.value)}
              {...control}
            />
          )}
        </Field>

        <Field
          label="Button label"
          help="Defaults to “Send”."
          error={state.fieldErrors?.submitLabel}
        >
          {(control) => (
            <Input
              name="submitLabel"
              value={form.submitLabel}
              disabled={readOnly}
              onChange={(event) => set("submitLabel", event.target.value)}
              {...control}
            />
          )}
        </Field>

        <Field
          label="Notification recipient"
          help="Leave blank to use the site's own enquiry recipients."
          error={state.fieldErrors?.notifyEmail}
        >
          {(control) => (
            <Input
              name="notifyEmail"
              type="email"
              value={form.notifyEmail}
              disabled={readOnly}
              onChange={(event) => set("notifyEmail", event.target.value)}
              {...control}
            />
          )}
        </Field>

        <Field
          label="Status"
          help="A draft form does not render, and refuses submissions."
          error={state.fieldErrors?.status}
        >
          {(control) => (
            <Select
              name="status"
              value={form.status}
              disabled={readOnly}
              onChange={(event) => set("status", event.target.value)}
              {...control}
            >
              {CONTENT_STATUS_OPTIONS.map((status) => (
                <option
                  key={status.value}
                  value={status.value}
                  disabled={status.value === "PUBLISHED" && !canPublish}
                >
                  {status.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      {readOnly ? null : (
        <div>
          <Button type="submit" loading={pending}>
            {mode === "create" ? "Create form" : "Save form"}
          </Button>
        </div>
      )}
    </form>
  );
}
