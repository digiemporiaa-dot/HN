/**
 * Dates as the business reads them: India Standard Time, DD/MM/YYYY.
 *
 * IST is a fixed UTC+05:30 with no daylight saving, so conversion is plain
 * arithmetic and never depends on the time zone of the server or of the
 * browser. A date picked as 09/10/2026 is 09/10/2026 for everyone, which is
 * the bug this module exists to prevent: `new Date("2026-10-09")` is midnight
 * UTC, which is the evening before in some places and 05:30 in Mumbai.
 *
 * Wire formats (what the date controls post, and what these functions take):
 *   date      "YYYY-MM-DD"
 *   datetime  "YYYY-MM-DDTHH:mm"   (wall-clock time in IST)
 */

export const IST_OFFSET_MINUTES = 330;
const OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;

export type DateParts = { year: number; month: number; day: number };

const pad = (value: number, size = 2) => String(value).padStart(size, "0");

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isValidParts({ year, month, day }: DateParts): boolean {
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    year >= 1900 &&
    year <= 2200 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month)
  );
}

/** "YYYY-MM-DD" → parts, or null. */
export function parseIsoDate(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  return isValidParts(parts) ? parts : null;
}

export function formatIsoDate({ year, month, day }: DateParts): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/** "DD/MM/YYYY" (also accepts "-" or "." and one-digit day and month) → parts. */
export function parseDisplayDate(value: string): DateParts | null {
  const match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(value.trim());
  if (!match) return null;
  const parts = { year: Number(match[3]), month: Number(match[2]), day: Number(match[1]) };
  return isValidParts(parts) ? parts : null;
}

export function formatDisplayDate({ year, month, day }: DateParts): string {
  return `${pad(day)}/${pad(month)}/${pad(year, 4)}`;
}

/** Compares two dates by calendar day: negative, zero or positive. */
export function compareParts(a: DateParts, b: DateParts): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

/** The calendar day it is in India at `instant`. */
export function istParts(instant: Date): DateParts & { hour: number; minute: number } {
  const shifted = new Date(instant.getTime() + OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

export function todayIst(now: Date = new Date()): DateParts {
  const { year, month, day } = istParts(now);
  return { year, month, day };
}

/** "YYYY-MM-DDTHH:mm" (IST wall clock) → the instant, or null. */
export function parseIstDateTime(value: string): Date | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = parseIsoDate(match[1]);
  const hour = Number(match[2]);
  const minute = Number(match[3]);
  if (!date || hour > 23 || minute > 59) return null;
  return new Date(Date.UTC(date.year, date.month - 1, date.day, hour, minute) - OFFSET_MS);
}

/** The instant → "YYYY-MM-DDTHH:mm" in IST. */
export function formatIstDateTime(instant: Date): string {
  const p = istParts(instant);
  return `${formatIsoDate(p)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** The instant, for people: "09/10/2026, 14:30 IST". */
export function displayIstDateTime(instant: Date | string): string {
  const p = istParts(new Date(instant));
  return `${formatDisplayDate(p)}, ${pad(p.hour)}:${pad(p.minute)} IST`;
}

export function addDays(parts: DateParts, days: number): DateParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

/** Monday-first weekday, 0–6. */
export function weekdayOf(parts: DateParts): number {
  return (new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay() + 6) % 7;
}
