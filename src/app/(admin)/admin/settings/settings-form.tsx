"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import {
  updateSettingsGroupAction,
  type SettingsActionState,
} from "@/server/settings/actions";

const INITIAL: SettingsActionState = {};

export type SettingField = {
  key: string;
  type: string;
  label: string;
  description?: string;
  placeholder?: string;
  value: string;
};

export function SettingsGroupForm({
  group,
  fields,
  mediaOptions,
  readOnly,
}: {
  group: string;
  fields: SettingField[];
  mediaOptions: Array<{ id: string; label: string }>;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateSettingsGroupAction,
    INITIAL,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="group" value={group} />

      {state.error ? (
        <div
          role="alert"
          className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3.5"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      {state.success ? (
        <div className="border-success-100 bg-success-50 text-success-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3.5">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{state.success}</span>
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        {fields.map((field) => {
          const error = state.fieldErrors?.[field.key];
          const wide = field.type === "TEXT";

          return (
            <Field
              key={field.key}
              label={field.label}
              help={field.description}
              error={error}
              className={wide ? "md:col-span-2" : undefined}
            >
              {(props) =>
                field.type === "TEXT" ? (
                  <Textarea
                    name={field.key}
                    defaultValue={field.value}
                    placeholder={field.placeholder}
                    rows={3}
                    disabled={readOnly}
                    {...props}
                  />
                ) : field.type === "MEDIA" ? (
                  <Select
                    name={field.key}
                    defaultValue={field.value}
                    disabled={readOnly || mediaOptions.length === 0}
                    {...props}
                  >
                    <option value="">Not set</option>
                    {mediaOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                ) : field.type === "COLOR" ? (
                  <div className="flex items-center gap-2">
                    <Input
                      name={field.key}
                      defaultValue={field.value}
                      placeholder={field.placeholder}
                      disabled={readOnly}
                      {...props}
                    />
                    {field.value ? (
                      <span
                        aria-hidden="true"
                        className="border-line size-9 shrink-0 rounded-md border"
                        style={{ backgroundColor: field.value }}
                      />
                    ) : null}
                  </div>
                ) : (
                  <Input
                    name={field.key}
                    defaultValue={field.value}
                    placeholder={field.placeholder}
                    disabled={readOnly}
                    {...props}
                  />
                )
              }
            </Field>
          );
        })}
      </div>

      {!readOnly ? (
        <div>
          <Button type="submit" loading={pending}>
            {pending ? "Saving" : "Save changes"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
