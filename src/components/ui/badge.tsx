import type { ReactNode } from "react";

import { variants } from "@/lib/utils/variants";

const badgeStyles = variants({
  base: "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-label font-medium",
  variants: {
    tone: {
      neutral: "bg-surface-muted text-ink-muted",
      brand: "bg-navy-900 text-white",
      info: "bg-info-50 text-info-700",
      success: "bg-success-50 text-success-700",
      warning: "bg-warning-50 text-warning-700",
      danger: "bg-danger-50 text-danger-700",
      outline: "border border-line-strong text-ink-muted",
    },
  },
  defaults: { tone: "neutral" },
});

export type BadgeTone =
  | "neutral"
  | "brand"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "outline";

type BadgeProps = {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
};

export function Badge({ tone = "neutral", className, children }: BadgeProps) {
  return <span className={badgeStyles({ tone, className })}>{children}</span>;
}

const STATUS_TONES: Record<string, BadgeTone> = {
  PUBLISHED: "success",
  ACTIVE: "success",
  WON: "success",
  DRAFT: "neutral",
  REVIEW: "warning",
  PENDING: "warning",
  ARCHIVED: "neutral",
  INACTIVE: "neutral",
  LOST: "danger",
  FAILED: "danger",
  SUSPENDED: "danger",
};

/**
 * Status badges read from one mapping so a status never renders green in one
 * table and grey in another.
 */
export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const tone = STATUS_TONES[status.toUpperCase()] ?? "neutral";
  const label = status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());

  return (
    <Badge tone={tone} className={className}>
      {label}
    </Badge>
  );
}
