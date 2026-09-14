import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils/cn";

type AdminPageHeaderProps = {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function AdminPageHeader({
  title,
  description,
  backHref,
  backLabel = "Back",
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {backHref ? (
        <Link
          href={backHref}
          className="text-caption text-ink-muted hover:text-ink inline-flex w-fit items-center gap-1 transition-colors"
        >
          <ChevronLeft aria-hidden="true" className="size-3.5" />
          {backLabel}
        </Link>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-h2 text-ink">{title}</h1>
          {description ? (
            <p className="text-body-sm text-ink-muted max-w-[68ch]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-3">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
