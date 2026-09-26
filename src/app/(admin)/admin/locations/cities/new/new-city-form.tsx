"use client";

import { useActionState, useState } from "react";

import { Button, Field, Input, Select } from "@/components/ui";
import { FormFeedback } from "@/components/admin/form-feedback";
import { slugify } from "@/lib/utils/slug";
import {
  createCityAction,
  type LocationActionState,
} from "@/server/locations/actions";

const INITIAL: LocationActionState = {};

/**
 * The three things a city needs to exist. Everything that makes its page worth
 * reading is written on the next screen, where the city is already a draft.
 */
export function NewCityForm({
  states,
}: {
  states: Array<{ id: string; name: string; kind: string }>;
}) {
  const [state, formAction, pending] = useActionState(
    createCityAction,
    INITIAL,
  );
  const [values, setValues] = useState({ stateId: "", name: "", slug: "" });
  const [slugTouched, setSlugTouched] = useState(false);

  const set = (key: keyof typeof values, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <FormFeedback state={state} />

      <div className="grid gap-5 md:grid-cols-3">
        <Field label="State" required error={state.fieldErrors?.stateId}>
          {(control) => (
            <Select
              name="stateId"
              value={values.stateId}
              onChange={(event) => set("stateId", event.target.value)}
              {...control}
            >
              <option value="">Choose a state</option>
              {states.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                  {option.kind === "UNION_TERRITORY" ? " (UT)" : ""}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="City" required error={state.fieldErrors?.name}>
          {(control) => (
            <Input
              name="name"
              value={values.name}
              onChange={(event) => {
                set("name", event.target.value);
                if (!slugTouched) set("slug", slugify(event.target.value));
              }}
              {...control}
            />
          )}
        </Field>

        <Field
          label="Slug"
          required
          help={`The page will be at /locations/${values.slug || "slug"}`}
          error={state.fieldErrors?.slug}
        >
          {(control) => (
            <Input
              name="slug"
              value={values.slug}
              onChange={(event) => {
                setSlugTouched(true);
                set("slug", event.target.value);
              }}
              {...control}
            />
          )}
        </Field>
      </div>

      <div>
        <Button type="submit" loading={pending}>
          Create city
        </Button>
      </div>
    </form>
  );
}
