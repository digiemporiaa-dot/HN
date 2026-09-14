import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";

/**
 * A single number with its label. Values come from the database — nothing here
 * invents a trend or a comparison that has not been measured.
 */
export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  href?: string;
  className?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-label text-ink-muted">{label}</span>
        {Icon ? (
          <Icon aria-hidden="true" className="text-ink-subtle size-4 shrink-0" />
        ) : null}
      </div>
      <span className="text-h2 text-ink tabular-nums">{value}</span>
      {hint ? <span className="text-caption text-ink-subtle">{hint}</span> : null}
    </>
  );

  return (
    <div
      className={cn(
        "border-line bg-surface flex flex-col gap-2 rounded-lg border p-5",
        href && "transition-colors hover:border-line-strong",
        className,
      )}
    >
      {content}
    </div>
  );
}
