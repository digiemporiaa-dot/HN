import { Undo2 } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { prisma } from "@/server/db";
import { restoreProductAction } from "@/server/products/actions";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

/**
 * Deleted products, with a way back.
 *
 * The category is shown because it decides whether a restore is possible at
 * all: a product whose category has gone has nowhere to be restored to, and
 * the action refuses rather than leaving an orphan.
 */
export async function DeletedProducts() {
  const deleted = await prisma.product.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    take: 20,
    select: {
      id: true,
      name: true,
      slug: true,
      deletedAt: true,
      category: { select: { name: true, deletedAt: true } },
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
                  {row.category.name} · /products/{row.slug}
                  {row.deletedAt
                    ? ` · deleted ${dateFormatter.format(row.deletedAt)}`
                    : ""}
                </span>
              </div>

              {row.category.deletedAt ? (
                <span className="text-caption text-ink-subtle">
                  Its category is deleted too — restore that first.
                </span>
              ) : (
                <form action={restoreProductAction}>
                  <input type="hidden" name="productId" value={row.id} />
                  <Button type="submit" variant="outline" size="sm">
                    <Undo2 aria-hidden="true" className="size-4" />
                    Restore as draft
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
