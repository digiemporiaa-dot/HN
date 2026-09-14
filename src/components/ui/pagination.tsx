import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  /** Must produce a real, crawlable URL — pagination is part of the SEO surface. */
  buildHref: (page: number) => string;
  className?: string;
};

function buildPageList(current: number, total: number): (number | "gap")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, total, current]);
  if (current - 1 > 1) pages.add(current - 1);
  if (current + 1 < total) pages.add(current + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | "gap")[] = [];

  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push("gap");
    result.push(page);
  });

  return result;
}

const itemClass =
  "inline-flex h-10 min-w-10 items-center justify-center rounded-md px-3 text-body-sm transition-colors";

export function Pagination({
  currentPage,
  totalPages,
  buildHref,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPageList(currentPage, totalPages);
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-wrap items-center justify-center gap-1",
        className,
      )}
    >
      {hasPrevious ? (
        <Link
          href={buildHref(currentPage - 1)}
          rel="prev"
          aria-label="Previous page"
          className={cn(itemClass, "text-ink hover:bg-surface-muted")}
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className={cn(itemClass, "text-ink-subtle opacity-50")}
        >
          <ChevronLeft className="size-4" />
        </span>
      )}

      {pages.map((page, index) =>
        page === "gap" ? (
          <span
            key={`gap-${index}`}
            aria-hidden="true"
            className={cn(itemClass, "text-ink-subtle")}
          >
            &hellip;
          </span>
        ) : (
          <Link
            key={page}
            href={buildHref(page)}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
            className={cn(
              itemClass,
              page === currentPage
                ? "bg-navy-950 text-white"
                : "text-ink hover:bg-surface-muted",
            )}
          >
            {page}
          </Link>
        ),
      )}

      {hasNext ? (
        <Link
          href={buildHref(currentPage + 1)}
          rel="next"
          aria-label="Next page"
          className={cn(itemClass, "text-ink hover:bg-surface-muted")}
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className={cn(itemClass, "text-ink-subtle opacity-50")}
        >
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
