"use client";

import { useActionState, useState } from "react";

import { Button, Checkbox, Field, Input, Select } from "@/components/ui";
import { FormFeedback } from "@/components/admin/form-feedback";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import { slugify } from "@/lib/utils/slug";
import { STATE_KINDS } from "@/lib/validation/locations";
import {
  createStateAction,
  updateStateAction,
  type LocationActionState,
} from "@/server/locations/actions";

const INITIAL: LocationActionState = {};

export type StateFormValues = {
  id?: string;
  name: string;
  slug: string;
  code: string;
  kind: string;
  active: boolean;
};

export function StateForm({
  mode,
  values,
  version,
  readOnly,
}: {
  mode: "create" | "edit";
  values: StateFormValues;
  version: string;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createStateAction : updateStateAction,
    INITIAL,
  );
  // Controlled, so a refused save keeps what was typed.
  const [form, setForm] = useSyncedState(values, version);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");

  const set = <K extends keyof StateFormValues>(
    key: K,
    value: StateFormValues[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {values.id ? (
        <input type="hidden" name="stateId" value={values.id} />
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
                if (!slugTouched) set("slug", slugify(event.target.value));
              }}
              {...control}
            />
          )}
        </Field>

        <Field label="Slug" required error={state.fieldErrors?.slug}>
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
          label="Code"
          help="The ISO 3166-2:IN code, like MH. Optional."
          error={state.fieldErrors?.code}
        >
          {(control) => (
            <Input
              name="code"
              value={form.code}
              maxLength={3}
              disabled={readOnly}
              onChange={(event) =>
                set("code", event.target.value.toUpperCase())
              }
              {...control}
            />
          )}
        </Field>

        <Field label="Kind" error={state.fieldErrors?.kind}>
          {(control) => (
            <Select
              name="kind"
              value={form.kind}
              disabled={readOnly}
              onChange={(event) => set("kind", event.target.value)}
              {...control}
            >
              {STATE_KINDS.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {kind.label}
                </option>
              ))}
            </Select>
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
            An inactive state is hidden from the city picker. Cities already
            filed under it are kept.
          </span>
        </span>
      </label>

      {readOnly ? null : (
        <div>
          <Button type="submit" loading={pending}>
            {mode === "create" ? "Create state" : "Save state"}
          </Button>
        </div>
      )}
    </form>
  );
}
