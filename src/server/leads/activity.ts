import "server-only";

import { prisma } from "@/server/db";
import type { LeadActivityKind } from "@/generated/prisma/enums";

/**
 * The record of what happened to a lead.
 *
 * Append-only and never edited. A stage moved back and forth three times is a
 * fact about how the deal went, and a history somebody can tidy is not a
 * history. Nothing here ever throws into the caller: losing an entry is bad,
 * losing the enquiry that the entry describes is far worse.
 *
 * Deliberately not the audit log, and the two are never merged. They answer
 * different questions for different readers:
 *
 *   - This timeline answers "how is this deal going". A salesperson reads it,
 *     it is scoped to one lead, it is written for a person, and it lives and
 *     dies with the lead — deleting a lead takes its history with it, because
 *     the history is part of the lead.
 *   - The audit log answers "who did what in this system". It is read during
 *     an investigation, it spans every module, it records the actor's address
 *     and account, and it must outlive the record it describes — an entry that
 *     disappears when somebody deletes the thing they touched is worth nothing.
 *
 * Writing one and reading the other is a mistake in both directions: an audit
 * log full of "stage moved to Contacted" is noise during an investigation, and
 * a sales timeline that cannot be deleted with its lead is a data-retention
 * problem nobody chose.
 */
export async function recordLeadActivity(entry: {
  leadId: string;
  kind: LeadActivityKind;
  summary: string;
  actorId?: string | null;
  actorName?: string | null;
}): Promise<void> {
  try {
    await prisma.leadActivity.create({
      data: {
        leadId: entry.leadId,
        kind: entry.kind,
        summary: entry.summary.slice(0, 500),
        actorId: entry.actorId ?? null,
        actorName: entry.actorName ?? null,
      },
    });
  } catch (error) {
    console.error("Could not record lead activity", {
      leadId: entry.leadId,
      kind: entry.kind,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

/** The groups the timeline can be narrowed to, and what each covers. */
export const ACTIVITY_FILTERS = [
  { value: "all", label: "Everything", kinds: null },
  {
    value: "assignment",
    label: "Assignment",
    kinds: ["CREATED", "ASSIGNED"] as const,
  },
  {
    value: "stage",
    label: "Stage and priority",
    kinds: ["STAGE_CHANGED", "PRIORITY_CHANGED"] as const,
  },
  {
    value: "notes",
    label: "Notes and comments",
    kinds: ["NOTE_ADDED", "COMMENT_ADDED"] as const,
  },
] as const;

export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number]["value"];

export function isActivityFilter(value: string): value is ActivityFilter {
  return ACTIVITY_FILTERS.some((entry) => entry.value === value);
}

export async function leadActivities(
  leadId: string,
  filter: ActivityFilter = "all",
) {
  const kinds = ACTIVITY_FILTERS.find((entry) => entry.value === filter)?.kinds;

  return prisma.leadActivity.findMany({
    where: {
      leadId,
      ...(kinds ? { kind: { in: [...kinds] } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      kind: true,
      summary: true,
      actorName: true,
      createdAt: true,
    },
  });
}
