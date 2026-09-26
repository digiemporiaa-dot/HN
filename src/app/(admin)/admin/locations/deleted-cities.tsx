import { Undo2 } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { prisma } from "@/server/db";
import { restoreCityAction } from "@/server/locations/actions";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

/**
 * Deleted cities, with a way back.
 *
 * A city page carries a URL and inbound links; deleting one by mistake should
 * be a restore, not a rebuild.
 */
export async function DeletedCities({ canRestore }: { canRestore: boolean }) {
  const deleted = await prisma.city.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    take: 20,
    select: {
      id: true,
      name: true,
      slug: true,
      deletedAt: true,
      state: { select: { name: true } },
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
                  {row.state.name} · /locations/{row.slug}
                  {row.deletedAt
                    ? ` · deleted ${dateFormatter.format(row.deletedAt)}`
                    : ""}
                </span>
              </div>

              {canRestore ? (
                <form action={restoreCityAction}>
                  <input type="hidden" name="cityId" value={row.id} />
                  <Button type="submit" variant="outline" size="sm">
                    <Undo2 aria-hidden="true" className="size-4" />
                    Restore as draft
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
