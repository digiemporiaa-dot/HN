import { prisma } from "@/server/db";

/**
 * The questions on one record, in the order they are shown.
 *
 * Kept out of the actions module on purpose: every export of a "use server"
 * file is a callable endpoint, and a reader does not need to be one.
 */
export async function entityFaqs(entityType: string, entityId: string) {
  return prisma.faq.findMany({
    where: { entityType, entityId },
    orderBy: { order: "asc" },
    select: { id: true, question: true, answer: true },
  });
}

/** Changes whenever a save lands, which is what resyncs an open editor. */
export function faqSignature(rows: Array<{ id: string }>): string {
  return `${rows.length}:${rows.map((row) => row.id).join(":")}`;
}
