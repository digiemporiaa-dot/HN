"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarRange, ChevronDown } from "lucide-react";

import { Button, DateRangeCalendar, Popover } from "@/components/ui";
import { formatDisplayDate, parseIsoDate } from "@/lib/dates/ist";

/**
 * A date range held in the URL (`from`, `to`: calendar days in India). The
 * range is drafted in the popover and only applied on Apply, so the page is
 * not reloaded on every click.
 */
export function DateRangeFilter({ label = "Date range" }: { label?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ from, to });
  const anchor = useRef<HTMLButtonElement>(null);

  const apply = (next: { from: string; to: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of ["from", "to"] as const) {
      if (next[key]) params.set(key, next[key]);
      else params.delete(key);
    }
    // A range replaces the preset period.
    if (next.from || next.to) params.delete("days");
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setOpen(false);
  };

  const start = parseIsoDate(from);
  const end = parseIsoDate(to);
  const summary = start && end ? `${formatDisplayDate(start)} – ${formatDisplayDate(end)}` : start ? `From ${formatDisplayDate(start)}` : end ? `Until ${formatDisplayDate(end)}` : "Any date";

  return (
    <div data-unsaved-ignore>
      <button
        ref={anchor}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}: ${summary}`}
        onClick={() => {
          setDraft({ from, to });
          setOpen((value) => !value);
        }}
        className="border-line-strong bg-surface text-ink hover:border-ink-subtle inline-flex h-11 w-full items-center gap-2 rounded-md border px-3 text-[0.9375rem] sm:w-auto"
      >
        <CalendarRange aria-hidden="true" className="text-ink-muted size-4" />
        <span className="tabular-nums">{summary}</span>
        <ChevronDown aria-hidden="true" className="text-ink-muted ml-auto size-4" />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchor} label={label} sheetTitle={label}>
        <DateRangeCalendar from={draft.from} to={draft.to} onChange={(nextFrom, nextTo) => setDraft({ from: nextFrom, to: nextTo })} />
        <div className="border-line mt-3 flex justify-end gap-2 border-t pt-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => apply({ from: "", to: "" })}>
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => apply({ from: draft.from, to: draft.to || draft.from })}
            disabled={!draft.from && !draft.to}
          >
            Apply
          </Button>
        </div>
      </Popover>
    </div>
  );
}
