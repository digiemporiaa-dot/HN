import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd } from "@/server/seo/structured-data";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

/**
 * The visible trail and its BreadcrumbList structured data, from one array.
 *
 * Emitting both here is what keeps them from drifting: there is no second call
 * site to forget, and no way to publish a trail that says something different
 * from the markup a visitor can see.
 */
export function Breadcrumb({
  items,
  structuredData = true,
  className,
}: {
  items: BreadcrumbItem[];
  /** Off for pages that demonstrate the component rather than use it. */
  structuredData?: boolean;
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("w-full", className)}>
      {structuredData ? <JsonLd data={breadcrumbJsonLd(items)} /> : null}
      <ol className="text-caption text-ink-muted flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li
              key={`${item.label}-${index}`}
              className="flex items-center gap-2"
            >
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-ink transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(isLast && "text-ink font-medium")}
                >
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <ChevronRight
                  aria-hidden="true"
                  className="text-ink-subtle size-3.5 shrink-0"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
