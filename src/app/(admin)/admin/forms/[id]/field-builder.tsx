"use client";

import { useActionState } from "react";
import { Eye, EyeOff, Plus } from "lucide-react";

import {
  Button,
  Checkbox,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { FormFeedback } from "@/components/admin/form-feedback";
import { RowControls, moveItem } from "@/components/admin/row-controls";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import {
  CHOICE_TYPES,
  FORM_FIELD_TYPES,
  type FormFieldType,
} from "@/lib/validation/forms";
import type { FormActionState } from "@/server/forms/actions";

export type BuilderField = {
  /** Empty on a field that has never been saved. The server assigns it. */
  key: string;
  type: FormFieldType;
  label: string;
  placeholder: string;
  help: string;
  required: boolean;
  hidden: boolean;
  options: string;
};

type FormAction = (
  previous: FormActionState,
  formData: FormData,
) => Promise<FormActionState>;

const INITIAL: FormActionState = {};

const BLANK: BuilderField = {
  key: "",
  type: "TEXT",
  label: "",
  placeholder: "",
  help: "",
  required: false,
  hidden: false,
  options: "",
};

/**
 * The questions on a form, in the order they are asked.
 *
 * Posted as JSON from this component's own state rather than as named inputs.
 * Every other ordered editor here does the same and for the same reason: form
 * encoding cannot express an order, and a row scrolled out of view is still a
 * row that must be saved.
 */
export function FieldBuilder({
  formId,
  fields: initial,
  version,
  saveAction,
  readOnly,
}: {
  formId: string;
  fields: BuilderField[];
  version: string;
  saveAction: FormAction;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveAction, INITIAL);
  const [rows, setRows] = useSyncedState(initial, version);

  const update = (index: number, next: Partial<BuilderField>) =>
    setRows((current) =>
      current.map((row, position) =>
        position === index ? { ...row, ...next } : row,
      ),
    );

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="formId" value={formId} />
      <input type="hidden" name="fields" value={JSON.stringify(rows)} />

      <FormFeedback state={state} />

      {/* A list-level complaint has no field of its own to sit beside, and the
          shared banner only shows `error`. Without this a refused save would
          look like nothing happened. */}
      {state.fieldErrors?.fields ? (
        <p role="alert" className="text-caption text-danger-700">
          {state.fieldErrors.fields}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="border-line text-body-sm text-ink-muted rounded-md border border-dashed p-6 text-center">
          No questions yet.
        </p>
      ) : (
        <ol className="flex flex-col gap-4">
          {rows.map((row, index) => (
            <li
              key={index}
              className="border-line flex flex-col gap-4 rounded-lg border p-4"
            >
              <div className="flex items-start gap-3">
                <Input
                  value={row.label}
                  disabled={readOnly}
                  maxLength={160}
                  placeholder="Question"
                  aria-label={`Field ${index + 1} label`}
                  onChange={(event) =>
                    update(index, { label: event.target.value })
                  }
                />
                <RowControls
                  label={row.label || `field ${index + 1}`}
                  index={index}
                  count={rows.length}
                  disabled={readOnly}
                  onMove={(offset) =>
                    setRows((current) => moveItem(current, index, offset))
                  }
                  onRemove={() =>
                    setRows((current) =>
                      current.filter((_, position) => position !== index),
                    )
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Type">
                  {(control) => (
                    <Select
                      value={row.type}
                      disabled={readOnly}
                      aria-label={`Field ${index + 1} type`}
                      onChange={(event) =>
                        update(index, {
                          type: event.target.value as FormFieldType,
                        })
                      }
                      {...control}
                    >
                      {FORM_FIELD_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>

                <Field label="Placeholder">
                  {(control) => (
                    <Input
                      value={row.placeholder}
                      disabled={readOnly}
                      maxLength={160}
                      aria-label={`Field ${index + 1} placeholder`}
                      onChange={(event) =>
                        update(index, { placeholder: event.target.value })
                      }
                      {...control}
                    />
                  )}
                </Field>

                <Field label="Help text">
                  {(control) => (
                    <Input
                      value={row.help}
                      disabled={readOnly}
                      maxLength={300}
                      aria-label={`Field ${index + 1} help`}
                      onChange={(event) =>
                        update(index, { help: event.target.value })
                      }
                      {...control}
                    />
                  )}
                </Field>
              </div>

              {CHOICE_TYPES.includes(row.type) ? (
                <Field label="Choices" help="One per line.">
                  {(control) => (
                    <Textarea
                      value={row.options}
                      disabled={readOnly}
                      rows={3}
                      maxLength={2000}
                      aria-label={`Field ${index + 1} choices`}
                      onChange={(event) =>
                        update(index, { options: event.target.value })
                      }
                      {...control}
                    />
                  )}
                </Field>
              ) : null}

              <div className="flex flex-wrap items-center gap-5">
                <label className="text-body-sm text-ink flex items-center gap-2.5">
                  <Checkbox
                    checked={row.required}
                    disabled={readOnly}
                    aria-label={`Field ${index + 1} required`}
                    onChange={(event) =>
                      update(index, { required: event.target.checked })
                    }
                  />
                  Required
                </label>

                <label className="text-body-sm text-ink flex items-center gap-2.5">
                  <Checkbox
                    checked={row.hidden}
                    disabled={readOnly}
                    aria-label={`Field ${index + 1} hidden`}
                    onChange={(event) =>
                      update(index, { hidden: event.target.checked })
                    }
                  />
                  {row.hidden ? (
                    <EyeOff aria-hidden="true" className="size-4" />
                  ) : (
                    <Eye aria-hidden="true" className="size-4" />
                  )}
                  Hidden
                </label>

                {row.key ? (
                  <span className="text-caption text-ink-subtle">
                    Answers filed under{" "}
                    <code className="text-ink">{row.key}</code>
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}

      {readOnly ? null : (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={pending}>
            Save questions
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setRows((current) => [...current, { ...BLANK }])}
          >
            <Plus aria-hidden="true" className="size-4" />
            Add a question
          </Button>
        </div>
      )}
    </form>
  );
}
