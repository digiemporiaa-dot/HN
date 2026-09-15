"use client";

import {
  useLayoutEffect,
  useRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const controlBase =
  "w-full rounded-md border border-line-strong bg-surface text-ink text-body-sm transition-[border-color,box-shadow] duration-[var(--duration-fast)] placeholder:text-ink-subtle disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70 aria-[invalid=true]:border-danger-600";

export function Input({
  className,
  type = "text",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(controlBase, "h-11 px-3.5", className)}
      {...props}
    />
  );
}

export function Textarea({
  className,
  rows = 4,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={rows}
      className={cn(controlBase, "resize-y px-3.5 py-2.5", className)}
      {...props}
    />
  );
}

/**
 * Keeps a controlled element's DOM value in step with its React value.
 *
 * React 19 resets a form's DOM once a form action completes. For text inputs
 * React notices the mismatch and rewrites the DOM, but a <select> is set
 * through its options' `selected` state, so the reset silently returns it to
 * the first option while React's virtual value stays as it was — and React,
 * seeing no change, never corrects it. The result is a control that displays
 * one thing and submits another. Re-asserting after every commit is cheap and
 * removes the whole class of bug.
 */
function useAssertedValue<T extends HTMLSelectElement | HTMLInputElement>(
  value: string | number | readonly string[] | undefined,
) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || value === undefined) return;
    const next = String(value);
    if (element.value !== next) element.value = next;
  });

  return ref;
}

export function Select({
  className,
  children,
  value,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const ref = useAssertedValue<HTMLSelectElement>(value);

  return (
    <div className="relative">
      <select
        ref={ref}
        value={value}
        className={cn(controlBase, "h-11 appearance-none pr-10 pl-3.5", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="text-ink-subtle pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2"
      />
    </div>
  );
}

export function Checkbox({
  className,
  checked,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const ref = useRef<HTMLInputElement>(null);

  // Same reset problem as <select>: a checkbox returns to its defaultChecked
  // state, and React sees no change to correct.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || checked === undefined) return;
    if (element.checked !== checked) element.checked = checked;
  });

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      className={cn(
        "border-line-strong text-primary accent-medical-600 size-4 shrink-0 rounded-xs border disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export function Radio({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="radio"
      className={cn(
        "border-line-strong accent-medical-600 size-4 shrink-0 border disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
