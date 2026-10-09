import { z } from "zod";

/**
 * Where a quotation stands. Declared here, in the order it is worked, rather
 * than read from the database enum.
 */
export const QUOTE_STATUSES = [
  { value: "NEW", label: "New", tone: "info", open: true },
  { value: "UNDER_REVIEW", label: "Under review", tone: "neutral", open: true },
  { value: "QUOTED", label: "Quoted", tone: "warning", open: true },
  { value: "WON", label: "Won", tone: "success", open: false },
  { value: "LOST", label: "Lost", tone: "danger", open: false },
  { value: "CLOSED", label: "Closed", tone: "neutral", open: false },
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number]["value"];

export const quoteStatusSchema = z.enum(["NEW", "UNDER_REVIEW", "QUOTED", "WON", "LOST", "CLOSED"]);

export function quoteStatusLabel(value: string): string {
  return QUOTE_STATUSES.find((status) => status.value === value)?.label ?? value;
}

export function quoteStatusTone(value: string): "neutral" | "info" | "success" | "warning" | "danger" {
  return QUOTE_STATUSES.find((status) => status.value === value)?.tone ?? "neutral";
}

/**
 * The lead stage a quotation status carries with it, if any. Quoted, Won and
 * Lost are facts about the relationship too; New, Under review and Closed say
 * nothing the lead's own stage should be overwritten with.
 */
export function leadStageFor(status: QuoteStatus): "QUOTATION_SENT" | "WON" | "LOST" | null {
  if (status === "QUOTED") return "QUOTATION_SENT";
  if (status === "WON") return "WON";
  if (status === "LOST") return "LOST";
  return null;
}
