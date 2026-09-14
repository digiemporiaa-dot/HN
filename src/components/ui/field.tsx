"use client";

import { useId, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils/cn";

type FieldProps = {
  label: string;
  /** Supply when the control is rendered outside this component's children. */
  htmlFor?: string;
  help?: string;
  error?: string;
  required?: boolean;
  hideLabel?: boolean;
  className?: string;
  children: (props: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": boolean | undefined;
    required: boolean | undefined;
  }) => ReactNode;
};

/**
 * Wires a label, help text and validation message to a control with the correct
 * ARIA relationships. Using the render-prop keeps the wiring impossible to
 * forget — the control cannot be rendered without receiving the ids.
 */
export function Field({
  label,
  htmlFor,
  help,
  error,
  required,
  hideLabel = false,
  className,
  children,
}: FieldProps) {
  const generatedId = useId();
  const id = htmlFor ?? generatedId;
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className={cn(
          "text-label text-ink font-medium",
          hideLabel && "sr-only",
        )}
      >
        {label}
        {required ? (
          <span className="text-danger-600 ml-0.5" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        required: required || undefined,
      })}

      {help && !error ? (
        <p id={helpId} className="text-caption text-ink-subtle">
          {help}
        </p>
      ) : null}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-caption text-danger-600 flex items-center gap-1.5"
        >
          <AlertCircle aria-hidden="true" className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
