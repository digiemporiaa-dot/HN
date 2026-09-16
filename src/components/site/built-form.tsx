"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";

import {
  Button,
  Checkbox,
  Field,
  Input,
  Radio,
  Select,
  Textarea,
} from "@/components/ui";
import type { FormSubmitState } from "@/server/forms/submit";
import type { PublicForm, PublicFormField } from "@/server/forms/service";
import { LeadContextFields } from "./lead-context";

type SubmitAction = (
  previous: FormSubmitState,
  formData: FormData,
) => Promise<FormSubmitState>;

const INITIAL: FormSubmitState = {};

/**
 * A form an administrator built.
 *
 * Every control is held in state rather than left to the DOM, for the reason
 * the enquiry form is: React resets a form once its action returns, so a
 * submission the server refuses would come back empty and a visitor who filled
 * in twelve fields would have to do it again. A file input is the exception —
 * a browser will not let anyone set its value, so it keeps whatever it has.
 */
export function BuiltForm({
  form,
  action,
}: {
  form: PublicForm;
  action: SubmitAction;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const [startedAt] = useState(() => String(Date.now()));
  const [values, setValues] = useState<Record<string, string | boolean>>(() =>
    Object.fromEntries(
      form.fields.map((field) => [
        field.key,
        field.type === "CHECKBOX" ? false : "",
      ]),
    ),
  );

  const set = (key: string, value: string | boolean) =>
    setValues((current) => ({ ...current, [key]: value }));

  if (state.done) {
    return (
      <div className="border-success-100 bg-success-50 text-success-700 text-body-sm flex items-start gap-2.5 rounded-md border p-4">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <span>
          {state.message ?? "Thank you — we have received your submission."}
        </span>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5"
      noValidate
      // Set so a file input actually submits its bytes rather than its name.
      encType="multipart/form-data"
    >
      <input type="hidden" name="formKey" value={form.key} />
      <input type="hidden" name="startedAt" value={startedAt} />
      <LeadContextFields />

      {/* A field no person ever sees. Hidden from assistive technology and out
          of the tab order, so filling it in identifies a machine. */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor={`website-${form.key}`}>Do not fill this in</label>
        <input
          id={`website-${form.key}`}
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {form.description ? (
        <p className="text-body-sm text-ink-muted max-w-[70ch]">
          {form.description}
        </p>
      ) : null}

      {state.error ? (
        <div
          role="alert"
          className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm rounded-md border p-3.5"
        >
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {form.fields.map((field) => (
          <BuiltField
            key={field.id}
            field={field}
            value={values[field.key]}
            error={state.fieldErrors?.[field.key]}
            onChange={(value) => set(field.key, value)}
          />
        ))}
      </div>

      <div>
        <Button type="submit" size="lg" loading={pending}>
          <Send aria-hidden="true" className="size-4" />
          {form.submitLabel || "Send"}
        </Button>
      </div>
    </form>
  );
}

/** The controls that take a whole row, because half of one is not enough. */
const FULL_WIDTH = new Set(["TEXTAREA", "RADIO", "CHECKBOX", "FILE"]);

function BuiltField({
  field,
  value,
  error,
  onChange,
}: {
  field: PublicFormField;
  value: string | boolean | undefined;
  error?: string;
  onChange: (value: string | boolean) => void;
}) {
  const name = `field_${field.key}`;
  const className = FULL_WIDTH.has(field.type) ? "sm:col-span-2" : undefined;

  if (field.type === "CHECKBOX") {
    return (
      <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
        <label className="text-body-sm text-ink flex items-start gap-2.5">
          <Checkbox
            name={name}
            className="mt-0.5"
            checked={value === true}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span>
            {field.label}
            {field.required ? (
              <span className="text-danger-600" aria-hidden="true">
                {" "}
                *
              </span>
            ) : null}
          </span>
        </label>
        {field.help ? (
          <p className="text-caption text-ink-muted pl-7">{field.help}</p>
        ) : null}
        {error ? <p className="text-caption text-danger-700">{error}</p> : null}
      </div>
    );
  }

  if (field.type === "RADIO") {
    return (
      <fieldset className={`flex flex-col gap-2 ${className ?? ""}`}>
        <legend className="text-body-sm text-ink font-medium">
          {field.label}
          {field.required ? (
            <span className="text-danger-600" aria-hidden="true">
              {" "}
              *
            </span>
          ) : null}
        </legend>
        {field.help ? (
          <p className="text-caption text-ink-muted">{field.help}</p>
        ) : null}
        <div className="flex flex-col gap-1.5">
          {field.choices.map((choice) => (
            <label
              key={choice}
              className="text-body-sm text-ink flex items-center gap-2.5"
            >
              <Radio
                name={name}
                value={choice}
                checked={value === choice}
                onChange={() => onChange(choice)}
              />
              {choice}
            </label>
          ))}
        </div>
        {error ? <p className="text-caption text-danger-700">{error}</p> : null}
      </fieldset>
    );
  }

  return (
    <Field
      label={field.label}
      required={field.required}
      help={field.help ?? undefined}
      error={error}
      className={className}
    >
      {(control) => {
        if (field.type === "TEXTAREA") {
          return (
            <Textarea
              name={name}
              rows={4}
              maxLength={4000}
              placeholder={field.placeholder ?? undefined}
              value={typeof value === "string" ? value : ""}
              onChange={(event) => onChange(event.target.value)}
              {...control}
            />
          );
        }

        if (field.type === "SELECT") {
          return (
            <Select
              name={name}
              value={typeof value === "string" ? value : ""}
              onChange={(event) => onChange(event.target.value)}
              {...control}
            >
              <option value="">
                {field.placeholder || "Choose an option"}
              </option>
              {field.choices.map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </Select>
          );
        }

        if (field.type === "FILE") {
          return (
            <input
              type="file"
              name={name}
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="text-body-sm text-ink-muted file:border-line file:bg-surface-muted file:text-ink hover:file:border-line-strong w-full file:mr-3 file:rounded-md file:border file:px-3 file:py-1.5 file:text-sm file:font-medium"
              {...control}
            />
          );
        }

        return (
          <Input
            name={name}
            type={inputType(field.type)}
            inputMode={field.type === "NUMBER" ? "numeric" : undefined}
            placeholder={field.placeholder ?? undefined}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
            {...control}
          />
        );
      }}
    </Field>
  );
}

function inputType(type: PublicFormField["type"]): string {
  switch (type) {
    case "EMAIL":
      return "email";
    case "PHONE":
      return "tel";
    case "NUMBER":
      return "number";
    case "DATE":
      return "date";
    default:
      return "text";
  }
}
