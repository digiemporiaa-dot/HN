"use client";

import { useCallback, useId, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import { announceEdit } from "@/lib/admin/unsaved-changes";
import { settleToggle, type ToggleSave } from "@/lib/ui/persisted-toggle";

/**
 * An on/off switch. `role="switch"`, a 44px touch target around a compact
 * track, and pending and error states for switches that save immediately.
 *
 * With `name`, a hidden input carries "true"/"false" so it also works inside
 * an ordinary form; custom controls fire no input event, so it announces the
 * edit for the unsaved-changes tracker.
 */
export function Switch({
  id,
  checked,
  onChange,
  label,
  hint,
  name,
  disabled,
  pending,
  error,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: ReactNode;
  hint?: ReactNode;
  name?: string;
  disabled?: boolean;
  pending?: boolean;
  error?: string | null;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
}) {
  const auto = useId();
  const switchId = id ?? `switch-${auto}`;
  const labelId = `${switchId}-label`;
  const hintId = `${switchId}-hint`;
  const errorId = `${switchId}-error`;
  const small = size === "sm";
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  const control = (
    <button
      id={switchId}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ? undefined : ariaLabel}
      aria-labelledby={label ? labelId : undefined}
      aria-describedby={describedBy}
      aria-busy={pending || undefined}
      aria-invalid={error ? true : undefined}
      aria-disabled={pending || undefined}
      disabled={disabled}
      data-state={checked ? "on" : "off"}
      onClick={(event) => {
        if (disabled || pending) return;
        announceEdit(event.currentTarget);
        onChange(!checked);
      }}
      className={cn(
        "ui-switch relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 ease-out",
        // The track is small; the hit area is not.
        "before:absolute before:-inset-x-1.5 before:-inset-y-2.5 before:content-['']",
        small ? "h-5 w-9" : "h-6 w-11",
        checked ? "bg-primary" : "bg-line-strong",
        error && "ring-danger-600/60 ring-2 ring-offset-1",
        disabled && "cursor-not-allowed opacity-50",
        pending && "cursor-progress",
      )}
    >
      <span
        className={cn(
          "ui-switch-knob pointer-events-none absolute left-0.5 flex items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
          small ? "size-4" : "size-5",
          checked ? (small ? "translate-x-4" : "translate-x-5") : "translate-x-0",
        )}
      >
        {pending ? (
          <span aria-hidden="true" className="size-2.5 animate-spin rounded-full border-[1.5px] border-black/20 border-t-black/60" />
        ) : null}
      </span>
      <span className="sr-only">{pending ? "Saving" : null}</span>
    </button>
  );

  return (
    <div className={cn("ui-switch-row flex items-start justify-between gap-4", className)}>
      {label ? (
        <div className="min-w-0">
          <label id={labelId} htmlFor={switchId} className="text-body-sm text-ink font-medium">
            {label}
          </label>
          {hint ? (
            <p id={hintId} className="text-caption text-ink-muted">
              {hint}
            </p>
          ) : null}
          {error ? (
            <p id={errorId} role="alert" className="text-caption text-danger-700 mt-0.5 font-medium">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
      {control}
      {!label && error ? (
        <span id={errorId} className="sr-only" role="alert">
          {error}
        </span>
      ) : null}
      {name ? <input type="hidden" name={name} value={checked ? "true" : "false"} /> : null}
    </div>
  );
}

/**
 * A switch whose position is saved as soon as it is flipped. The new
 * position shows at once; if the save is refused or fails, it goes back to
 * what the server holds and says why. A second flip while saving is ignored.
 */
export function usePersistedToggle(serverValue: boolean, save: ToggleSave) {
  const [checked, setChecked] = useState(serverValue);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seen, setSeen] = useState(serverValue);
  const busy = useRef(false);

  // A newer server value (after a refresh) wins, unless a save is in flight.
  if (seen !== serverValue && !pending) {
    setSeen(serverValue);
    setChecked(serverValue);
  }

  const toggle = useCallback(
    async (next: boolean) => {
      if (busy.current) return;
      busy.current = true;
      const previous = checked;
      setChecked(next);
      setPending(true);
      setError(null);
      const outcome = await settleToggle(previous, next, save);
      setChecked(outcome.value);
      setError(outcome.error);
      setPending(false);
      busy.current = false;
    },
    [checked, save],
  );

  return { checked, pending, error, toggle };
}
