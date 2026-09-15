"use client";

import { useMemo, useState } from "react";
import { FileText, ImageOff, Plus, Trash2 } from "lucide-react";

import { Button, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import type { FieldSpec } from "@/cms/sections/fields";

export type MediaOption = {
  id: string;
  url: string;
  name: string;
  isImage: boolean;
};

/** A repeater row is a flat map of its own scalar fields. */
export type RepeaterRow = Record<string, string>;
/** A scalar, a repeater's rows, or an ordered list of catalogue ids. */
export type FieldValue = string | RepeaterRow[] | string[];

type ControlProps = {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": boolean | undefined;
  required: boolean | undefined;
};

/* ----------------------------------------------------------- media picker -- */

/* eslint-disable @next/next/no-img-element -- thumbnails are served at their
   stored size from our own media route; Next/Image would re-encode them. */

function MediaThumb({
  option,
  className,
}: {
  option: MediaOption;
  className?: string;
}) {
  if (!option.isImage) {
    return (
      <div
        className={cn(
          "bg-surface-muted text-ink-subtle flex items-center justify-center",
          className,
        )}
      >
        <FileText aria-hidden="true" className="size-6" />
      </div>
    );
  }
  return (
    <img
      src={option.url}
      alt=""
      loading="lazy"
      className={cn("bg-surface-muted object-contain", className)}
    />
  );
}

export function MediaPicker({
  value,
  options,
  onChange,
  disabled,
  control,
}: {
  value: string;
  options: MediaOption[];
  onChange: (next: string) => void;
  disabled?: boolean;
  control: ControlProps;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((option) => option.id === value) ?? null;
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) =>
      option.name.toLowerCase().includes(needle),
    );
  }, [options, query]);

  return (
    <div
      id={control.id}
      aria-describedby={control["aria-describedby"]}
      className="flex flex-wrap items-center gap-3"
    >
      <div
        className={cn(
          "border-line flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border",
          control["aria-invalid"] && "border-danger-600",
        )}
      >
        {selected ? (
          <MediaThumb option={selected} className="size-full" />
        ) : (
          <ImageOff aria-hidden="true" className="text-ink-subtle size-6" />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-caption text-ink-muted max-w-[28ch] truncate">
          {selected ? selected.name : "No file selected"}
        </span>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => setOpen(true)}
          >
            {selected ? "Replace" : "Choose file"}
          </Button>
          {selected ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onChange("")}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Choose from the media library"
        description="Only files already uploaded to the library can be used. Upload new files from Media."
        size="lg"
      >
        <div className="flex flex-col gap-4">
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by file name"
            aria-label="Search media"
          />

          {filtered.length === 0 ? (
            <p className="text-body-sm text-ink-muted py-6 text-center">
              {options.length === 0
                ? "The media library is empty. Upload a file from Media first."
                : "No files match that search."}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {filtered.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                    aria-pressed={option.id === value}
                    className={cn(
                      "border-line hover:border-line-strong flex w-full flex-col gap-1.5 rounded-md border p-2 text-left transition-colors",
                      option.id === value && "border-primary ring-primary/30 ring-2",
                    )}
                  >
                    <MediaThumb
                      option={option}
                      className="h-20 w-full rounded-xs"
                    />
                    <span className="text-caption text-ink-muted truncate">
                      {option.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </div>
  );
}

/* eslint-enable @next/next/no-img-element */

/* ------------------------------------------------------------ scalar field -- */

/**
 * Renders one non-repeater field from its specification.
 *
 * Every control is controlled rather than uncontrolled: React resets an
 * uncontrolled form once its action resolves, which would silently discard the
 * editor's work on any validation failure.
 */
export function ScalarField({
  field,
  value,
  error,
  disabled,
  mediaOptions,
  onChange,
  name,
}: {
  field: Exclude<FieldSpec, { kind: "repeater" }>;
  value: string;
  error?: string;
  disabled?: boolean;
  mediaOptions: MediaOption[];
  onChange: (next: string) => void;
  /** Omitted for fields inside a repeater, which post as JSON instead. */
  name?: string;
}) {
  return (
    <Field
      label={field.label}
      help={"help" in field ? field.help : undefined}
      error={error}
      required={"required" in field ? field.required : undefined}
      className={
        field.kind === "textarea" || field.kind === "richtext"
          ? "md:col-span-2"
          : undefined
      }
    >
      {(control) => {
        if (field.kind === "select") {
          return (
            <Select
              name={name}
              value={value}
              disabled={disabled}
              onChange={(event) => onChange(event.target.value)}
              {...control}
            >
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          );
        }

        if (field.kind === "media") {
          return (
            <>
              {name ? <input type="hidden" name={name} value={value} /> : null}
              <MediaPicker
                value={value}
                options={mediaOptions}
                onChange={onChange}
                disabled={disabled}
                control={control}
              />
            </>
          );
        }

        if (field.kind === "textarea" || field.kind === "richtext") {
          return (
            <Textarea
              name={name}
              value={value}
              disabled={disabled}
              rows={field.kind === "richtext" ? 10 : (field.rows ?? 3)}
              maxLength={field.maxLength}
              onChange={(event) => onChange(event.target.value)}
              {...control}
            />
          );
        }

        return (
          <Input
            name={name}
            value={value}
            disabled={disabled}
            placeholder={"placeholder" in field ? field.placeholder : undefined}
            maxLength={field.kind === "text" ? field.maxLength : undefined}
            inputMode={field.kind === "url" ? "url" : undefined}
            onChange={(event) => onChange(event.target.value)}
            {...control}
          />
        );
      }}
    </Field>
  );
}

/* --------------------------------------------------------------- repeater -- */

export function RepeaterField({
  field,
  rows,
  error,
  disabled,
  mediaOptions,
  onChange,
}: {
  field: Extract<FieldSpec, { kind: "repeater" }>;
  rows: RepeaterRow[];
  error?: string;
  disabled?: boolean;
  mediaOptions: MediaOption[];
  onChange: (next: RepeaterRow[]) => void;
}) {
  const scalarFields = field.fields.filter(
    (child): child is Exclude<FieldSpec, { kind: "repeater" }> =>
      child.kind !== "repeater",
  );

  const blankRow = (): RepeaterRow =>
    Object.fromEntries(scalarFields.map((child) => [child.name, ""]));

  const update = (index: number, key: string, next: string) => {
    onChange(
      rows.map((row, position) =>
        position === index ? { ...row, [key]: next } : row,
      ),
    );
  };

  const move = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <fieldset className="md:col-span-2 flex flex-col gap-3" disabled={disabled}>
      <legend className="text-label text-ink font-medium">{field.label}</legend>
      {field.help ? (
        <p className="text-caption text-ink-subtle">{field.help}</p>
      ) : null}

      {/* The list posts as JSON: nested arrays have no faithful form encoding. */}
      <input type="hidden" name={field.name} value={JSON.stringify(rows)} />

      {error ? (
        <p role="alert" className="text-caption text-danger-600">
          {error}
        </p>
      ) : null}

      <ol className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <li
            key={index}
            className="border-line bg-surface-subtle flex flex-col gap-4 rounded-md border p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-label text-ink-muted font-medium">
                {field.itemLabel} {index + 1}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${field.itemLabel} ${index + 1} up`}
                >
                  Up
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => move(index, 1)}
                  disabled={index === rows.length - 1}
                  aria-label={`Move ${field.itemLabel} ${index + 1} down`}
                >
                  Down
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onChange(rows.filter((_, position) => position !== index))
                  }
                  aria-label={`Remove ${field.itemLabel} ${index + 1}`}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {scalarFields.map((child) => (
                <ScalarField
                  key={child.name}
                  field={child}
                  value={row[child.name] ?? ""}
                  mediaOptions={mediaOptions}
                  onChange={(next) => update(index, child.name, next)}
                />
              ))}
            </div>
          </li>
        ))}
      </ol>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={rows.length >= field.max}
          onClick={() => onChange([...rows, blankRow()])}
        >
          <Plus aria-hidden="true" className="size-4" />
          Add {field.itemLabel.toLowerCase()}
        </Button>
        <span className="text-caption text-ink-subtle">
          {rows.length} of {field.max} maximum
        </span>
      </div>
    </fieldset>
  );
}
