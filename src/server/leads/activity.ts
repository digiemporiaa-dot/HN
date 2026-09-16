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

export async function leadActivities(leadId: string) {
  return prisma.leadActivity.findMany({
    where: { leadId },
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
