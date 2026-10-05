/**
 * CSV for spreadsheets that will be opened by staff.
 *
 * Every value is escaped for the spreadsheet as well as for CSV: a cell
 * beginning with =, +, - or @ is a formula to Excel, and much of what is
 * exported was typed by strangers. Prefixing an apostrophe keeps it text.
 */
export function csvCell(value: unknown): string {
  const text =
    value === null || value === undefined
      ? ""
      : value instanceof Date
        ? value.toISOString()
        : String(value);

  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;

  return `"${guarded.replace(/"/g, '""')}"`;
}

/**
 * A whole document: header row, data rows, CRLF line ends, and a byte-order
 * mark so Excel reads it as UTF-8 rather than guessing.
 */
export function csvDocument(
  header: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<unknown>>,
): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(","));
  return `﻿${lines.join("\r\n")}`;
}
