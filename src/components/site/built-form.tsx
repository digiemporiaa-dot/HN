"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
import type { ClientForm, ClientFormField } from "@/server/forms/service";
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
  popupId,
  onDone,
  compact,
}: {
  form: ClientForm;
  action: SubmitAction;
  /** Sent with the submission; the server credits the popup only if it checks out. */
  popupId?: string;
  /** Called once the server has stored the submission. */
  onDone?: () => void;
  /** One column whatever the viewport: for a narrow container such as a popup. */
  compact?: boolean;
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

  // Read through a ref so a parent re-rendering with a new callback does not
  // report the same success twice.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });
  useEffect(() => {
    if (state.done) onDoneRef.current?.();
  }, [state.done]);

  if (state.done) {
    return (
      <div role="status" className="flex flex-col items-start gap-4">
        <span className="bg-success-50 text-success-700 ring-success-100 flex size-12 items-center justify-center rounded-full ring-8">
          <CheckCircle2 aria-hidden="true" className="size-6" />
        </span>
        <p className="text-h4 text-ink max-w-[52ch]">
          {state.message ?? "Thank you — we have received your submission."}
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5"
      // No encType: with a function as the action React posts the FormData
      // itself, files included, and refuses an explicit encType.
      noValidate
    >
      <input type="hidden" name="formKey" value={form.key} />
      <input type="hidden" name="startedAt" value={startedAt} />
      {popupId ? <input type="hidden" name="popupId" value={popupId} /> : null}
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
          className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm rounded-lg border p-4"
        >
          {state.error}
        </div>
      ) : null}

      {/* Compact is a column rather than a one-track grid: the full-width
          fields' column spans would otherwise add a second track. */}
      <div className={compact ? "flex flex-col gap-4" : "grid gap-4 sm:grid-cols-2"}>
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
        <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto">
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
  field: ClientFormField;
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

function inputType(type: ClientFormField["type"]): string {
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
