import type { ReactNode } from "react";
import { AlertTriangle, Inbox } from "lucide-react";

import { cn } from "@/lib/utils/cn";

/**
 * Empty, loading and error states live together so that every list, table and
 * grid in the application reaches for the same three treatments instead of
 * inventing its own.
 */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-line flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed px-6 py-16 text-center",
        className,
      )}
    >
      <span className="text-ink-subtle bg-surface-muted rounded-full p-3">
        {icon ?? <Inbox aria-hidden="true" className="size-6" />}
      </span>
      <div className="flex flex-col gap-1.5">
        <p className="text-h4 text-ink">{title}</p>
        {description ? (
          <p className="text-body-sm text-ink-muted mx-auto max-w-[46ch]">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "border-danger-100 bg-danger-50 flex flex-col items-center justify-center gap-4 rounded-lg border px-6 py-12 text-center",
        className,
      )}
    >
      <AlertTriangle aria-hidden="true" className="text-danger-600 size-6" />
      <div className="flex flex-col gap-1.5">
        <p className="text-h4 text-danger-700">{title}</p>
        {description ? (
          <p className="text-body-sm text-danger-700/80 mx-auto max-w-[52ch]">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-surface-muted block animate-pulse rounded-md",
        className,
      )}
    />
  );
}

export function LoadingState({
  label = "Loading",
  rows = 3,
  className,
}: {
  label?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn("flex flex-col gap-3", className)}
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton
          key={index}
          className={cn("h-4 w-full", index === rows - 1 && "w-2/3")}
        />
      ))}
    </div>
  );
}
