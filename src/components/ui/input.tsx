import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
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

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
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
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
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
