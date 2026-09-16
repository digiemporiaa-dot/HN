"use client";

import { useActionState, useState } from "react";

import { useSyncedState } from "@/lib/hooks/use-synced-state";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Copy,
  EyeOff,
  Trash2,
} from "lucide-react";

import { Badge, Button, Checkbox, Field, Input, Select } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import type { FieldSpec } from "@/cms/sections/fields";
import {
  CARD_STYLE,
  DEFAULT_SECTION_DESIGN,
  IMAGE_POSITION,
  SECTION_ALIGN,
  SECTION_BACKGROUND,
  SECTION_COLUMNS,
  SECTION_CONTAINER,
  SECTION_SPACING,
  type SectionDesign,
} from "@/lib/design/section-options";
import {
  deleteSectionAction,
  duplicateSectionAction,
  moveSectionAction,
  updateSectionAction,
  type CmsActionState,
} from "@/server/cms/actions";
import {
  RepeaterField,
  ScalarField,
  type FieldValue,
  type MediaOption,
  type RepeaterRow,
} from "./field-inputs";
import { EntityPicker } from "./entity-picker";
import type { CatalogueChoices } from "@/server/cms/catalogue-choices";

const INITIAL: CmsActionState = {};

export type EditableSection = {
  id: string;
  type: string;
  label: string;
  description: string;
  order: number;
  enabled: boolean;
  /** False when the stored content fails its schema, so the page skips it. */
  complete: boolean;
  /** Changes only when a write lands, so the editor catches up after a save. */
  version: string;
  anchorId: string;
  content: Record<string, unknown>;
  design: Record<string, string>;
  fields: FieldSpec[];
  designOptions: Array<keyof SectionDesign>;
};

const DESIGN_LABELS: Record<string, string> = {
  spacing: "Vertical spacing",
  container: "Content width",
  background: "Background",
  align: "Alignment",
  columns: "Columns",
  cardStyle: "Card style",
  imagePosition: "Image position",
};

const DESIGN_CHOICES: Record<string, readonly string[]> = {
  spacing: SECTION_SPACING,
  container: SECTION_CONTAINER,
  background: SECTION_BACKGROUND,
  align: SECTION_ALIGN,
  columns: SECTION_COLUMNS,
  cardStyle: CARD_STYLE,
  imagePosition: IMAGE_POSITION,
};

const titleCase = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

/** Seeds editor state from stored JSON, coercing anything unexpected. */
function initialValues(section: EditableSection): Record<string, FieldValue> {
  const values: Record<string, FieldValue> = {};

  for (const field of section.fields) {
    const stored = section.content[field.name];

    if (field.kind === "entities") {
      values[field.name] = Array.isArray(stored)
        ? (stored as unknown[]).filter(
            (id): id is string => typeof id === "string" && id.length > 0,
          )
        : [];
    } else if (field.kind === "repeater") {
      values[field.name] = Array.isArray(stored)
        ? (stored as unknown[]).map((row) => {
            const source = (row ?? {}) as Record<string, unknown>;
            const normalised: RepeaterRow = {};
            for (const child of field.fields) {
              normalised[child.name] =
                typeof source[child.name] === "string"
                  ? (source[child.name] as string)
                  : "";
            }
            return normalised;
          })
        : [];
    } else {
      values[field.name] = typeof stored === "string" ? stored : "";
    }
  }

  return values;
}

function IconForm({
  action,
  sectionId,
  extra,
  label,
  children,
  confirm,
}: {
  action: (formData: FormData) => void | Promise<void>;
  sectionId: string;
  extra?: Record<string, string>;
  label: string;
  children: React.ReactNode;
  confirm?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      <input type="hidden" name="sectionId" value={sectionId} />
      {Object.entries(extra ?? {}).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <Button type="submit" variant="ghost" size="sm" aria-label={label}>
        {children}
      </Button>
    </form>
  );
}

export function SectionEditor({
  section,
  mediaOptions,
  catalogue,
  forms,
  isFirst,
  isLast,
  readOnly,
}: {
  section: EditableSection;
  mediaOptions: MediaOption[];
  catalogue: CatalogueChoices;
  /** Built forms an editor may embed. Published only: a draft has no page. */
  forms: Array<{ key: string; name: string }>;
  isFirst: boolean;
  isLast: boolean;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateSectionAction,
    INITIAL,
  );
  const [open, setOpen] = useState(false);
  const [values, setValues] = useSyncedState(
    initialValues(section),
    section.version,
  );
  const [enabled, setEnabled] = useSyncedState(
    section.enabled,
    section.version,
  );
  const [anchorId, setAnchorId] = useSyncedState(
    section.anchorId,
    section.version,
  );
  const [design, setDesign] = useSyncedState(section.design, section.version);

  const setValue = (name: string, next: FieldValue) =>
    setValues((current) => ({ ...current, [name]: next }));

  const panelId = `section-panel-${section.id}`;

  return (
    <li className="border-line bg-surface rounded-lg border">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className="text-ink hover:text-primary flex min-w-0 flex-1 items-center gap-2.5 text-left transition-colors"
        >
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "text-ink-subtle size-4 shrink-0 transition-transform",
              open && "rotate-180",
            )}
          />
          <span className="text-body-sm truncate font-medium">
            {section.label}
          </span>
          <span className="text-caption text-ink-subtle hidden truncate sm:inline">
            {section.description}
          </span>
        </button>

        {!enabled ? (
          <Badge tone="neutral">
            <EyeOff aria-hidden="true" className="size-3" />
            Hidden
          </Badge>
        ) : null}

        {section.complete ? null : (
          <Badge tone="warning">
            <AlertTriangle aria-hidden="true" className="size-3" />
            Needs content
          </Badge>
        )}

        {readOnly ? null : (
          <div className="flex items-center gap-0.5">
            <IconForm
              action={moveSectionAction}
              sectionId={section.id}
              extra={{ direction: "up" }}
              label={`Move ${section.label} up`}
            >
              <span aria-hidden="true">↑</span>
            </IconForm>
            <IconForm
              action={moveSectionAction}
              sectionId={section.id}
              extra={{ direction: "down" }}
              label={`Move ${section.label} down`}
            >
              <span aria-hidden="true">↓</span>
            </IconForm>
            <IconForm
              action={duplicateSectionAction}
              sectionId={section.id}
              label={`Duplicate ${section.label}`}
            >
              <Copy aria-hidden="true" className="size-4" />
            </IconForm>
            <IconForm
              action={deleteSectionAction}
              sectionId={section.id}
              label={`Remove ${section.label}`}
              confirm={`Remove the ${section.label} section? This cannot be undone.`}
            >
              <Trash2 aria-hidden="true" className="text-danger-600 size-4" />
            </IconForm>
          </div>
        )}
      </div>

      <div id={panelId} hidden={!open} className="border-line border-t p-4">
        <form action={formAction} className="flex flex-col gap-6" noValidate>
          <input type="hidden" name="sectionId" value={section.id} />

          {section.complete ? null : (
            <p className="border-warning-100 bg-warning-50 text-warning-700 text-body-sm rounded-md border p-3">
              This section is missing required content, so it is left out of the
              public page until it is filled in.
            </p>
          )}

          {state.error ? (
            <div
              role="alert"
              className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3"
            >
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />
              <span>{state.error}</span>
            </div>
          ) : null}

          {state.success ? (
            <div className="border-success-100 bg-success-50 text-success-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3">
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />
              <span>{state.success}</span>
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2">
            {section.fields.map((field) =>
              field.kind === "entities" ? (
                <Field
                  key={field.name}
                  label={field.label}
                  help={field.help}
                  error={state.fieldErrors?.[field.name]}
                  className="md:col-span-2"
                >
                  {() => (
                    <>
                      {/* Posted as JSON: the selection is ordered, which form
                          encoding cannot express. */}
                      <input
                        type="hidden"
                        name={field.name}
                        value={JSON.stringify(
                          (values[field.name] as string[]) ?? [],
                        )}
                      />
                      <EntityPicker
                        entity={field.entity}
                        value={(values[field.name] as string[]) ?? []}
                        choices={catalogue[field.entity]}
                        max={field.max}
                        disabled={readOnly}
                        onChange={(next) => setValue(field.name, next)}
                      />
                    </>
                  )}
                </Field>
              ) : field.kind === "formKey" ? (
                <Field
                  key={field.name}
                  label={field.label}
                  help={field.help}
                  error={state.fieldErrors?.[field.name]}
                >
                  {(control) => (
                    <Select
                      name={field.name}
                      value={(values[field.name] as string) ?? ""}
                      disabled={readOnly}
                      onChange={(event) =>
                        setValue(field.name, event.target.value)
                      }
                      {...control}
                    >
                      {/* Blank is a real choice, not an empty state: it means
                          the built-in enquiry form. */}
                      <option value="">Enquiry form (built in)</option>
                      {forms.map((form) => (
                        <option key={form.key} value={form.key}>
                          {form.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              ) : field.kind === "repeater" ? (
                <RepeaterField
                  key={field.name}
                  field={field}
                  rows={(values[field.name] as RepeaterRow[]) ?? []}
                  error={state.fieldErrors?.[field.name]}
                  disabled={readOnly}
                  mediaOptions={mediaOptions}
                  onChange={(next) => setValue(field.name, next)}
                />
              ) : (
                <ScalarField
                  key={field.name}
                  field={field}
                  name={field.name}
                  value={(values[field.name] as string) ?? ""}
                  error={state.fieldErrors?.[field.name]}
                  disabled={readOnly}
                  mediaOptions={mediaOptions}
                  onChange={(next) => setValue(field.name, next)}
                />
              ),
            )}
          </div>

          <div className="border-line flex flex-col gap-5 border-t pt-5">
            <h3 className="text-label text-ink font-medium">Appearance</h3>

            <div className="grid gap-5 md:grid-cols-2">
              {section.designOptions
                .filter((option) => option !== "anchorId")
                .map((option) => {
                  const key = String(option);
                  const choices = DESIGN_CHOICES[key];
                  if (!choices) return null;

                  return (
                    <Field key={key} label={DESIGN_LABELS[key] ?? key}>
                      {(control) => (
                        <Select
                          name={`design.${key}`}
                          value={
                            design[key] ??
                            DEFAULT_SECTION_DESIGN[option] ??
                            choices[0]
                          }
                          disabled={readOnly}
                          onChange={(event) =>
                            setDesign((current) => ({
                              ...current,
                              [key]: event.target.value,
                            }))
                          }
                          {...control}
                        >
                          {choices.map((choice) => (
                            <option key={choice} value={choice}>
                              {titleCase(choice)}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>
                  );
                })}

              {/* Options this section ignores are still posted, so switching a
                  section's supported options later does not lose a stored value. */}
              {Object.keys(DESIGN_CHOICES)
                .filter(
                  (key) =>
                    !section.designOptions.some((option) => option === key),
                )
                .map((key) => (
                  <input
                    key={key}
                    type="hidden"
                    name={`design.${key}`}
                    value={
                      design[key] ??
                      DEFAULT_SECTION_DESIGN[key as keyof SectionDesign] ??
                      DESIGN_CHOICES[key][0]
                    }
                  />
                ))}

              <Field
                label="Anchor ID"
                help="Optional. Lets a link jump straight to this section, e.g. #specifications."
                error={state.fieldErrors?.anchorId}
              >
                {(control) => (
                  <Input
                    name="anchorId"
                    value={anchorId}
                    disabled={readOnly}
                    placeholder="specifications"
                    onChange={(event) => setAnchorId(event.target.value)}
                    {...control}
                  />
                )}
              </Field>
            </div>

            <label className="text-body-sm text-ink flex items-center gap-2.5">
              <Checkbox
                name="enabled"
                checked={enabled}
                disabled={readOnly}
                onChange={(event) => setEnabled(event.target.checked)}
              />
              Show this section on the public page
            </label>
          </div>

          {readOnly ? null : (
            <div className="flex items-center gap-3">
              <Button type="submit" loading={pending}>
                Save section
              </Button>
              <span className="text-caption text-ink-subtle">
                Position {section.order + 1}
                {isFirst ? " (first)" : isLast ? " (last)" : ""}
              </span>
            </div>
          )}
        </form>
      </div>
    </li>
  );
}
