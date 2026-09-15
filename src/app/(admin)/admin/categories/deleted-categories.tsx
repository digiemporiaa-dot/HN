import { Undo2 } from "lucide-react";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { prisma } from "@/server/db";
import { restoreCategoryAction } from "@/server/categories/actions";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

/**
 * Deleted categories, with a way back.
 *
 * Soft deletion is only worth its query cost if there is a restore path; a
 * hidden row nobody can recover is just a slower delete.
 */
export async function DeletedCategories() {
  const deleted = await prisma.category.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    take: 20,
    select: {
      id: true,
      name: true,
      slug: true,
      depth: true,
      deletedAt: true,
      parent: { select: { name: true } },
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
                  {row.parent ? `${row.parent.name} · ` : ""}/{row.slug}
                  {row.deletedAt
                    ? ` · deleted ${dateFormatter.format(row.deletedAt)}`
                    : ""}
                </span>
              </div>

              <form action={restoreCategoryAction}>
                <input type="hidden" name="categoryId" value={row.id} />
                <Button type="submit" variant="outline" size="sm">
                  <Undo2 aria-hidden="true" className="size-4" />
                  Restore as draft
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
