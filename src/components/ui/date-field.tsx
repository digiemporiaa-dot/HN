"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CalendarDays, Clock, X } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { announceEdit } from "@/lib/admin/unsaved-changes";
import {
  compareParts,
  formatDisplayDate,
  formatIsoDate,
  parseDisplayDate,
  parseIsoDate,
  type DateParts,
} from "@/lib/dates/ist";
import { Calendar, outOfBounds } from "./calendar";
import { Popover } from "./popover";

export const DISPLAY_FORMAT = "DD/MM/YYYY";

/** Typed input: DD/MM/YYYY (day first, always), or YYYY-MM-DD. */
export function parseTypedDate(value: string): DateParts | null {
  return parseIsoDate(value) ?? parseDisplayDate(value);
}

/** "9", "930", "0930", "9:30", "9.30" → { hour, minute }. 24-hour. */
export function parseTypedTime(value: string): { hour: number; minute: number } | null {
  const text = value.trim();
  const match = /^(\d{1,2})(?:[:.]?(\d{2}))?$/.exec(text) ?? /^(\d{1,2})[:.](\d{1,2})$/.exec(text);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  return hour <= 23 && minute <= 59 ? { hour, minute } : null;
}

const pad = (value: number) => String(value).padStart(2, "0");

function boundsMessage(min: DateParts | null, max: DateParts | null): string {
  if (min && max) return `Choose a date between ${formatDisplayDate(min)} and ${formatDisplayDate(max)}.`;
  if (min) return `Choose a date on or after ${formatDisplayDate(min)}.`;
  return `Choose a date on or before ${formatDisplayDate(max as DateParts)}.`;
}

type BaseProps = {
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  /** "YYYY-MM-DD" */
  min?: string;
  max?: string;
  invalid?: boolean;
  "aria-describedby"?: string;
  /** Used for the calendar's accessible name and the phone sheet's title. */
  label?: string;
  className?: string;
  size?: "sm" | "md";
};

/**
 * The text box, calendar button and popover shared by the date controls.
 * Typing and picking both work; Enter commits what was typed without
 * submitting the form; Alt+Down opens the calendar.
 */
function DayInput({
  day,
  onDay,
  id,
  required,
  disabled,
  min,
  max,
  invalid,
  label,
  className,
  size = "md",
  trailing,
  withCalendar = true,
  describedBy,
  placeholder = DISPLAY_FORMAT,
}: Omit<BaseProps, "min" | "max" | "name"> & {
  day: DateParts | null;
  onDay: (next: DateParts | null) => void;
  min: DateParts | null;
  max: DateParts | null;
  trailing?: ReactNode;
  withCalendar?: boolean;
  describedBy?: string;
  placeholder?: string;
}) {
  const auto = useId();
  const inputId = id ?? `date-${auto}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState(day ? formatDisplayDate(day) : "");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [focusGrid, setFocusGrid] = useState(false);

  const shown = day ? formatDisplayDate(day) : "";
  const [lastShown, setLastShown] = useState(shown);
  if (!editing && lastShown !== shown) {
    setLastShown(shown);
    setText(shown);
  }

  const boundsError = day && outOfBounds(day, { min, max }) ? boundsMessage(min, max) : null;
  const message = error ?? boundsError;
  useEffect(() => {
    inputRef.current?.setCustomValidity(message ?? "");
  }, [message]);

  const emit = (next: DateParts | null) => {
    announceEdit(inputRef.current);
    onDay(next);
  };

  const commit = (raw: string) => {
    setEditing(false);
    if (!raw.trim()) {
      setError(null);
      if (day) emit(null);
      return;
    }
    const parsed = parseTypedDate(raw);
    if (!parsed) {
      setError(`Enter a date as ${DISPLAY_FORMAT}.`);
      return;
    }
    setText(formatDisplayDate(parsed));
    if (outOfBounds(parsed, { min, max })) {
      setError(boundsMessage(min, max));
      return;
    }
    setError(null);
    if (!day || compareParts(parsed, day) !== 0) emit(parsed);
  };

  const pick = (next: DateParts) => {
    setText(formatDisplayDate(next));
    setError(null);
    emit(next);
    setOpen(false);
    inputRef.current?.focus();
  };

  const errorId = `${inputId}-error`;
  const formatId = `${inputId}-format`;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <div
        ref={frameRef}
        data-invalid={message || invalid ? "" : undefined}
        className={cn(
          "ui-date-field ui-control border-line-strong bg-surface flex w-full min-w-0 items-center gap-1 rounded-lg border pl-3",
          "focus-within:border-primary focus-within:ring-primary/25 focus-within:ring-2",
          size === "sm" ? "h-9" : "h-11",
          (message || invalid) && "border-danger-600",
          disabled && "opacity-60",
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          value={text}
          required={required}
          disabled={disabled}
          aria-invalid={message || invalid ? true : undefined}
          aria-describedby={[formatId, message ? errorId : null, describedBy].filter(Boolean).join(" ")}
          onChange={(event) => {
            setEditing(true);
            setText(event.target.value);
          }}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit(event.currentTarget.value);
            } else if (event.key === "ArrowDown" && (event.altKey || open) && withCalendar) {
              event.preventDefault();
              setFocusGrid(true);
              setOpen(true);
            }
          }}
          className="text-body-sm text-ink placeholder:text-ink-muted min-w-0 flex-1 bg-transparent py-0 tabular-nums outline-none"
        />
        <span id={formatId} className="sr-only">
          Format {DISPLAY_FORMAT}.{withCalendar ? " Press Alt and Down arrow to open the calendar." : ""}
        </span>
        {trailing}
        {day && !required && !disabled ? (
          <button
            type="button"
            aria-label="Clear date"
            onClick={() => {
              setText("");
              setError(null);
              emit(null);
              inputRef.current?.focus();
            }}
            className="text-ink-muted hover:text-ink hover:bg-surface-muted flex size-8 shrink-0 items-center justify-center rounded-md"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        ) : null}
        {withCalendar ? (
          <button
            type="button"
            disabled={disabled}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label={open ? "Close calendar" : "Choose date"}
            onClick={() => {
              setFocusGrid(true);
              setOpen((value) => !value);
            }}
            className="text-ink-muted hover:text-ink hover:bg-surface-muted mr-1 flex size-8 shrink-0 items-center justify-center rounded-md"
          >
            <CalendarDays aria-hidden="true" className="size-4" />
          </button>
        ) : (
          <span className="w-2" />
        )}
      </div>
      {message ? (
        <p id={errorId} className="text-caption text-danger-700">
          {message}
        </p>
      ) : null}
      {withCalendar ? (
        <Popover
          open={open}
          onClose={() => setOpen(false)}
          anchorRef={frameRef}
          returnFocusRef={inputRef}
          label={label ? `Choose ${label.toLowerCase()}` : "Choose a date"}
          sheetTitle={label}
        >
          <Calendar selected={day} onSelect={pick} min={min} max={max} autoFocus={focusGrid} label={label} />
          <p className="border-line text-caption text-ink-muted mt-2 border-t pt-2">
            Or type a date as <span className="text-ink font-medium">{DISPLAY_FORMAT}</span>
          </p>
        </Popover>
      ) : null}
    </div>
  );
}

function useControllable(value: string | undefined, defaultValue: string, onChange?: (next: string) => void) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const set = (next: string) => {
    if (value === undefined) setInner(next);
    onChange?.(next);
  };
  return [current, set] as const;
}

/** A calendar day. Value "YYYY-MM-DD", or "" when empty. */
export function DateField({
  value,
  defaultValue = "",
  onChange,
  name,
  min,
  max,
  withCalendar,
  placeholder,
  "aria-describedby": describedBy,
  ...rest
}: BaseProps & {
  value?: string;
  defaultValue?: string;
  onChange?: (next: string) => void;
  withCalendar?: boolean;
  placeholder?: string;
}) {
  const [current, set] = useControllable(value, defaultValue, onChange);
  const day = parseIsoDate(current);
  return (
    <>
      <DayInput
        {...rest}
        day={day}
        onDay={(next) => set(next ? formatIsoDate(next) : "")}
        min={min ? parseIsoDate(min) : null}
        max={max ? parseIsoDate(max) : null}
        withCalendar={withCalendar}
        placeholder={placeholder}
        describedBy={describedBy}
      />
      {name ? <input type="hidden" name={name} value={day ? formatIsoDate(day) : ""} /> : null}
    </>
  );
}

/**
 * A day and a 24-hour time, as wall-clock time in India. Value
 * "YYYY-MM-DDTHH:mm" or "". The server reads it with parseIstDateTime, so the
 * moment stored does not depend on the browser's time zone.
 */
export function DateTimeField({
  value,
  defaultValue = "",
  onChange,
  name,
  min,
  max,
  defaultTime = "09:00",
  "aria-describedby": describedBy,
  ...rest
}: BaseProps & {
  value?: string;
  defaultValue?: string;
  onChange?: (next: string) => void;
  defaultTime?: string;
}) {
  const [current, set] = useControllable(value, defaultValue, onChange);
  const [datePart, timePart] = current.includes("T") ? current.split("T") : ["", ""];
  const day = parseIsoDate(datePart ?? "");
  const [pendingDay, setPendingDay] = useState<DateParts | null>(null);
  const [timeText, setTimeText] = useState(timePart ?? "");
  const [timeError, setTimeError] = useState<string | null>(null);
  const [lastTime, setLastTime] = useState(timePart ?? "");
  const timeRef = useRef<HTMLInputElement>(null);
  const auto = useId();

  if ((timePart ?? "") !== lastTime) {
    setLastTime(timePart ?? "");
    setTimeText(timePart ?? "");
  }

  useEffect(() => {
    timeRef.current?.setCustomValidity(timeError ?? "");
  }, [timeError]);

  const emit = (nextDay: DateParts | null, time: string) => {
    if (!nextDay) {
      setPendingDay(null);
      set("");
      return;
    }
    if (!time) {
      setPendingDay(nextDay);
      set("");
      return;
    }
    setPendingDay(null);
    set(`${formatIsoDate(nextDay)}T${time}`);
  };

  const shownDay = day ?? pendingDay;

  const commitTime = (raw: string) => {
    if (!raw.trim()) {
      setTimeError(shownDay ? "Enter a time as HH:MM, 24-hour." : null);
      return;
    }
    const parsed = parseTypedTime(raw);
    if (!parsed) {
      setTimeError("Enter a time as HH:MM, 24-hour.");
      return;
    }
    const text = `${pad(parsed.hour)}:${pad(parsed.minute)}`;
    setTimeError(null);
    setTimeText(text);
    announceEdit(timeRef.current);
    if (shownDay) emit(shownDay, text);
  };

  const timeId = `time-${auto}`;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <DayInput
        {...rest}
        day={shownDay}
        describedBy={describedBy}
        onDay={(next) => {
          const time = timeText && parseTypedTime(timeText) ? timeText : next ? defaultTime : "";
          if (next && !timeText) setTimeText(defaultTime);
          setTimeError(null);
          emit(next, time);
        }}
        min={min ? parseIsoDate(min) : null}
        max={max ? parseIsoDate(max) : null}
        trailing={
          <span className="border-line flex shrink-0 items-center gap-1 border-l pl-2">
            <Clock aria-hidden="true" className="text-ink-muted size-3.5" />
            <label htmlFor={timeId} className="sr-only">
              Time, 24-hour, HH:MM
            </label>
            <input
              ref={timeRef}
              id={timeId}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="HH:MM"
              value={timeText}
              disabled={rest.disabled}
              aria-invalid={timeError ? true : undefined}
              onChange={(event) => setTimeText(event.target.value)}
              onBlur={(event) => commitTime(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitTime(event.currentTarget.value);
                }
              }}
              className="text-body-sm text-ink placeholder:text-ink-muted w-[3.25rem] bg-transparent tabular-nums outline-none"
            />
          </span>
        }
      />
      {timeError ? <p className="text-caption text-danger-700">{timeError}</p> : null}
      <p className="text-caption text-ink-muted">India Standard Time (IST)</p>
      {name ? <input type="hidden" name={name} value={current} /> : null}
    </div>
  );
}

/**
 * Picking a range: the calendar plus two typed boxes. Values "YYYY-MM-DD"
 * or "". The start may not follow the end, and the boxes enforce it.
 */
export function DateRangeCalendar({
  from,
  to,
  onChange,
  min,
  max,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  min?: string;
  max?: string;
}) {
  const fromDay = parseIsoDate(from);
  const toDay = parseIsoDate(to);
  return (
    <div className="flex w-full flex-col gap-3 sm:w-[17.5rem]">
      <Calendar
        mode="range"
        from={fromDay}
        to={toDay}
        min={min ? parseIsoDate(min) : null}
        max={max ? parseIsoDate(max) : null}
        onRangeChange={(start, end) => onChange(formatIsoDate(start), end ? formatIsoDate(end) : "")}
      />
      <div className="grid grid-cols-2 gap-2">
        <DateField
          size="sm"
          label="Start date"
          withCalendar={false}
          value={from}
          min={min}
          max={to || max}
          onChange={(next) => onChange(next, to)}
        />
        <DateField
          size="sm"
          label="End date"
          withCalendar={false}
          value={to}
          min={from || min}
          max={max}
          onChange={(next) => onChange(from, next)}
        />
      </div>
    </div>
  );
}
