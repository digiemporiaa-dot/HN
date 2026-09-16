import { Undo2 } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { prisma } from "@/server/db";
import { restoreLeadAction } from "@/server/leads/actions";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

/**
 * Deleted enquiries, with a way back.
 *
 * An enquiry is a record of a conversation. Deleting one by mistake loses
 * something nobody can reconstruct, so it is only ever hidden.
 */
export async function DeletedLeads() {
  const deleted = await prisma.lead.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    take: 20,
    select: {
      id: true,
      reference: true,
      name: true,
      email: true,
      deletedAt: true,
    },
  });

  if (deleted.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recently deleted</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {deleted.map((row) => (
            <li
              key={row.id}
              className="border-line flex flex-wrap items-center justify-between gap-3 border-b py-2.5 last:border-0"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-body-sm text-ink font-medium">
                  {row.name}
                </span>
                <span className="text-caption text-ink-muted">
                  {row.reference} · {row.email}
                  {row.deletedAt
                    ? ` · deleted ${dateFormatter.format(row.deletedAt)}`
                    : ""}
                </span>
              </div>

              <form action={restoreLeadAction}>
                <input type="hidden" name="leadId" value={row.id} />
                <Button type="submit" variant="outline" size="sm">
                  <Undo2 aria-hidden="true" className="size-4" />
                  Restore
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
