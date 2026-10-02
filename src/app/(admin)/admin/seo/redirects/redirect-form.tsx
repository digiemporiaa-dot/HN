"use client";

import { useActionState } from "react";

import {
  Button,
  Checkbox,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { FormFeedback } from "@/components/admin/form-feedback";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import {
  createRedirectAction,
  updateRedirectAction,
  type RedirectActionState,
} from "@/server/seo/actions";

const INITIAL: RedirectActionState = {};

export type RedirectFormValues = {
  id?: string;
  fromPath: string;
  toPath: string;
  type: string;
  active: boolean;
  note: string;
};

export function RedirectForm({
  mode,
  values,
  version,
  readOnly,
}: {
  mode: "create" | "edit";
  values: RedirectFormValues;
  version: string;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createRedirectAction : updateRedirectAction,
    INITIAL,
  );
  // Controlled, so a refused save keeps what was typed.
  const [form, setForm] = useSyncedState(values, version);
  const set = <K extends keyof RedirectFormValues>(
    key: K,
    value: RedirectFormValues[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {values.id ? (
        <input type="hidden" name="redirectId" value={values.id} />
      ) : null}
      <FormFeedback state={state} />

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="Old address"
          required
          help="A path like /old-product.html. A full URL from an old site is reduced to its path. Matching ignores case and a trailing slash."
          error={state.fieldErrors?.fromPath}
        >
          {(control) => (
            <Input
              name="fromPath"
              value={form.fromPath}
              disabled={readOnly}
              placeholder="/old-address"
              onChange={(event) => set("fromPath", event.target.value)}
              {...control}
            />
          )}
        </Field>

        <Field
          label="Redirect to"
          required
          help="A path on this site, or a full https:// address."
          error={state.fieldErrors?.toPath}
        >
          {(control) => (
            <Input
              name="toPath"
              value={form.toPath}
              disabled={readOnly}
              placeholder="/products/new-name"
              onChange={(event) => set("toPath", event.target.value)}
              {...control}
            />
          )}
        </Field>

        <Field label="Type" error={state.fieldErrors?.type}>
          {(control) => (
            <Select
              name="type"
              value={form.type}
              disabled={readOnly}
              onChange={(event) => set("type", event.target.value)}
              {...control}
            >
              <option value="PERMANENT">
                Permanent (301) — moved for good
              </option>
              <option value="TEMPORARY">
                Temporary (302) — will come back
              </option>
            </Select>
          )}
        </Field>

        <Field
          label="Note"
          help="Why it exists, for whoever reviews it next."
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
      </div>

      <label className="text-body-sm text-ink flex items-start gap-2.5">
        <Checkbox
          name="active"
          className="mt-0.5"
          checked={form.active}
          disabled={readOnly}
          onChange={(event) => set("active", event.target.checked)}
        />
        <span>
          Active
          <span className="text-caption text-ink-muted block">
            An inactive redirect is kept but not followed.
          </span>
        </span>
      </label>

      {readOnly ? null : (
        <div>
          <Button type="submit" loading={pending}>
            {mode === "create" ? "Create redirect" : "Save redirect"}
          </Button>
        </div>
      )}
    </form>
  );
}
