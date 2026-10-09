"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import {
  addDays,
  compareParts,
  daysInMonth,
  todayIst,
  weekdayOf,
  type DateParts,
} from "@/lib/dates/ist";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = [
  ["Mo", "Monday"], ["Tu", "Tuesday"], ["We", "Wednesday"], ["Th", "Thursday"],
  ["Fr", "Friday"], ["Sa", "Saturday"], ["Su", "Sunday"],
] as const;

type Bounds = { min?: DateParts | null; max?: DateParts | null };

export function outOfBounds(day: DateParts, { min, max }: Bounds): boolean {
  return Boolean((min && compareParts(day, min) < 0) || (max && compareParts(day, max) > 0));
}

function clamp(day: DateParts, bounds: Bounds): DateParts {
  if (bounds.min && compareParts(day, bounds.min) < 0) return bounds.min;
  if (bounds.max && compareParts(day, bounds.max) > 0) return bounds.max;
  return day;
}

function addMonths(day: DateParts, months: number): DateParts {
  const index = day.year * 12 + (day.month - 1) + months;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return { year, month, day: Math.min(day.day, daysInMonth(year, month)) };
}

/** Always six weeks, Monday first, so the grid never changes height. */
function monthGrid(year: number, month: number): DateParts[] {
  const first = { year, month, day: 1 };
  const start = addDays(first, -weekdayOf(first));
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

const same = (a: DateParts | null | undefined, b: DateParts | null | undefined) =>
  Boolean(a && b && compareParts(a, b) === 0);

type Common = Bounds & {
  autoFocus?: boolean;
  defaultMonth?: DateParts | null;
  className?: string;
  label?: string;
};

type SingleProps = Common & {
  mode?: "single";
  selected: DateParts | null;
  onSelect: (day: DateParts) => void;
};

type RangeProps = Common & {
  mode: "range";
  from: DateParts | null;
  to: DateParts | null;
  onRangeChange: (from: DateParts, to: DateParts | null) => void;
};

/**
 * A month grid. Days are calendar days in India (see src/lib/dates/ist.ts):
 * nothing here passes through a Date in the browser's time zone, so the day
 * picked is the day stored.
 *
 * Keyboard: arrows by day and week, Home/End to the week's ends, PageUp and
 * PageDown by month (with Shift, by year), Enter or Space to choose.
 */
export function Calendar(props: SingleProps | RangeProps) {
  const { min, max, autoFocus, className, label } = props;
  const range = props.mode === "range";
  const anchor = range ? (props.from ?? props.defaultMonth) : (props.selected ?? props.defaultMonth);
  const [today] = useState(() => todayIst());
  const [focused, setFocused] = useState<DateParts>(() => clamp(anchor ?? today, { min, max }));
  const [view, setView] = useState<"days" | "months">("days");
  const [keyboard, setKeyboard] = useState(Boolean(autoFocus));
  const [hovered, setHovered] = useState<DateParts | null>(null);
  const gridRef = useRef<HTMLTableElement>(null);
  const headingId = useId();

  const anchorKey = anchor ? `${anchor.year}-${anchor.month}-${anchor.day}` : "";
  useEffect(() => {
    if (anchor) setFocused(clamp(anchor, { min, max }));
    // Follow outside changes to the value only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorKey]);

  useEffect(() => {
    if (keyboard && view === "days") {
      gridRef.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus();
    }
  }, [focused, keyboard, view]);

  const days = useMemo(() => monthGrid(focused.year, focused.month), [focused.year, focused.month]);

  const rangeEnd = range ? (props.to ?? (props.from ? hovered : null)) : null;
  const [rangeLow, rangeHigh] = (() => {
    if (!range || !props.from || !rangeEnd) return [null, null];
    return compareParts(props.from, rangeEnd) <= 0 ? [props.from, rangeEnd] : [rangeEnd, props.from];
  })();

  const choose = (day: DateParts) => {
    if (outOfBounds(day, { min, max })) return;
    setFocused(day);
    if (!range) return props.onSelect(day);
    if (!props.from || props.to) props.onRangeChange(day, null);
    else if (compareParts(day, props.from) < 0) props.onRangeChange(day, props.from);
    else props.onRangeChange(props.from, day);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const steps: Record<string, () => DateParts> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      Home: () => addDays(focused, -weekdayOf(focused)),
      End: () => addDays(focused, 6 - weekdayOf(focused)),
      PageUp: () => addMonths(focused, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focused, event.shiftKey ? 12 : 1),
    };
    const step = steps[event.key];
    if (step) {
      event.preventDefault();
      setKeyboard(true);
      setFocused(clamp(step(), { min, max }));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(focused);
    }
  };

  const monthStart = { year: focused.year, month: focused.month, day: 1 };
  const monthEnd = { year: focused.year, month: focused.month, day: daysInMonth(focused.year, focused.month) };
  const canPrev = !min || compareParts(addDays(monthStart, -1), min) >= 0;
  const canNext = !max || compareParts(addDays(monthEnd, 1), max) <= 0;

  return (
    <div className={cn("w-full sm:w-[17.5rem]", className)} aria-label={label}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setView((current) => (current === "days" ? "months" : "days"))}
          aria-expanded={view === "months"}
          className="text-body-sm text-ink hover:bg-surface-muted inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-semibold"
        >
          <span id={headingId} aria-live="polite">
            {MONTHS[focused.month - 1]} {focused.year}
          </span>
          <ChevronDown aria-hidden="true" className={cn("size-4 transition-transform", view === "months" && "rotate-180")} />
        </button>
        {view === "days" ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous month"
              disabled={!canPrev}
              onClick={() => setFocused(clamp(addMonths(focused, -1), { min, max }))}
              className="text-ink-muted hover:bg-surface-muted hover:text-ink flex size-9 items-center justify-center rounded-full disabled:opacity-40"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Next month"
              disabled={!canNext}
              onClick={() => setFocused(clamp(addMonths(focused, 1), { min, max }))}
              className="text-ink-muted hover:bg-surface-muted hover:text-ink flex size-9 items-center justify-center rounded-full disabled:opacity-40"
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </div>
        ) : null}
      </div>

      {view === "months" ? (
        <MonthChooser
          focused={focused}
          bounds={{ min, max }}
          onPick={(year, month) => {
            const day = Math.min(focused.day, daysInMonth(year, month));
            setFocused(clamp({ year, month, day }, { min, max }));
            setView("days");
          }}
        />
      ) : (
        <div className="-m-1 overflow-x-auto p-1">
          <table
            ref={gridRef}
            role="grid"
            aria-labelledby={headingId}
            className="w-full table-fixed border-collapse"
            onKeyDown={onKeyDown}
          >
            <thead>
              <tr>
                {WEEKDAYS.map(([short, long]) => (
                  <th key={short} scope="col" abbr={long} className="text-ink-muted pb-1 text-[0.6875rem] font-semibold">
                    {short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }, (_, week) => (
                <tr key={week}>
                  {days.slice(week * 7, week * 7 + 7).map((day) => {
                    const outside = day.month !== focused.month;
                    const disabled = outOfBounds(day, { min, max });
                    const isToday = same(day, today);
                    const selected = range
                      ? same(day, props.from) || same(day, props.to)
                      : same(day, props.selected);
                    const inRange =
                      rangeLow && rangeHigh && compareParts(day, rangeLow) >= 0 && compareParts(day, rangeHigh) <= 0;
                    const isFocused = same(day, focused);
                    const name = `${WEEKDAYS[weekdayOf(day)][1]}, ${day.day} ${MONTHS[day.month - 1]} ${day.year}`;
                    return (
                      <td
                        key={`${day.year}-${day.month}-${day.day}`}
                        role="gridcell"
                        aria-selected={selected}
                        className={cn(
                          "p-0",
                          inRange && "ui-calendar-range",
                          inRange && same(day, rangeLow) && "ui-calendar-range-start",
                          inRange && same(day, rangeHigh) && "ui-calendar-range-end",
                        )}
                      >
                        <button
                          type="button"
                          tabIndex={isFocused ? 0 : -1}
                          aria-label={`${name}${isToday ? ", today" : ""}${selected ? ", selected" : ""}`}
                          aria-current={isToday ? "date" : undefined}
                          aria-disabled={disabled || undefined}
                          data-today={isToday ? "" : undefined}
                          data-selected={selected ? "" : undefined}
                          data-outside={outside ? "" : undefined}
                          onClick={() => {
                            setKeyboard(false);
                            choose(day);
                          }}
                          onMouseEnter={() => setHovered(day)}
                          onFocus={() => setFocused(day)}
                          className={cn(
                            "ui-calendar-day relative mx-auto my-px flex size-9 items-center justify-center rounded-full text-[0.875rem] tabular-nums",
                            "hover:bg-surface-muted focus-visible:outline-none",
                            outside ? "text-ink-subtle" : "text-ink",
                            disabled && "text-ink-subtle/50 cursor-not-allowed line-through hover:bg-transparent",
                          )}
                        >
                          {day.day}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MonthChooser({
  focused,
  bounds,
  onPick,
}: {
  focused: DateParts;
  bounds: Bounds;
  onPick: (year: number, month: number) => void;
}) {
  const [year, setYear] = useState(focused.year);
  const current = useRef<HTMLButtonElement>(null);
  useEffect(() => current.current?.focus(), []);
  const monthOut = (month: number) =>
    outOfBounds({ year, month, day: daysInMonth(year, month) }, { min: bounds.min }) ||
    outOfBounds({ year, month, day: 1 }, { max: bounds.max });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous year"
          disabled={Boolean(bounds.min && year - 1 < bounds.min.year)}
          onClick={() => setYear((value) => value - 1)}
          className="text-ink-muted hover:bg-surface-muted flex size-9 items-center justify-center rounded-full disabled:opacity-40"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>
        <span className="text-body-sm text-ink font-semibold tabular-nums" aria-live="polite">
          {year}
        </span>
        <button
          type="button"
          aria-label="Next year"
          disabled={Boolean(bounds.max && year + 1 > bounds.max.year)}
          onClick={() => setYear((value) => value + 1)}
          className="text-ink-muted hover:bg-surface-muted flex size-9 items-center justify-center rounded-full disabled:opacity-40"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {MONTHS.map((name, index) => {
          const month = index + 1;
          const isCurrent = year === focused.year && month === focused.month;
          return (
            <button
              key={name}
              ref={isCurrent ? current : undefined}
              type="button"
              aria-pressed={isCurrent}
              disabled={monthOut(month)}
              onClick={() => onPick(year, month)}
              className="ui-calendar-month text-body-sm text-ink hover:bg-surface-muted h-11 rounded-xl disabled:opacity-40"
            >
              {name.slice(0, 3)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
