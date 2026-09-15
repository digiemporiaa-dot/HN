import Link from "next/link";
import { Star } from "lucide-react";

import { StatusBadge } from "@/components/ui";
import type { DataTableColumn } from "@/components/admin/data-table";
import type { CategoryRow } from "@/server/categories/service";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

/**
 * Columns shared by the Categories and Subcategories screens.
 *
 * The two screens are different views of one model, so their tables are built
 * from one definition; only the parent column differs.
 */
export function categoryColumns(
  parentNames: Map<string, string>,
  showParent: boolean,
): Array<DataTableColumn<CategoryRow>> {
  return [
    {
      key: "name",
      header: "Name",
      priority: "primary",
      sortable: true,
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-body-sm text-ink flex items-center gap-1.5 font-medium">
            {row.name}
            {row.featured ? (
              <Star
                aria-label="Featured"
                className="text-warning-700 size-3.5 shrink-0"
              />
            ) : null}
          </span>
          <span className="text-caption text-ink-muted break-all">
            /{row.slug}
          </span>
        </div>
      ),
    },
    ...(showParent
      ? [
          {
            key: "parent",
            header: "Parent category",
            cell: (row: CategoryRow) =>
              row.parentId ? (
                <Link
                  href={`/admin/categories/${row.parentId}`}
                  className="text-primary underline underline-offset-4"
                >
                  {parentNames.get(row.parentId) ?? "Unknown"}
                </Link>
              ) : (
                "—"
              ),
          } satisfies DataTableColumn<CategoryRow>,
        ]
      : [
          {
            key: "children",
            header: "Subcategories",
            priority: "meta" as const,
            cell: (row: CategoryRow) => row._count.children,
          } satisfies DataTableColumn<CategoryRow>,
        ]),
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "updatedAt",
      header: "Last edited",
      sortable: true,
      priority: "meta",
      cell: (row) => dateFormatter.format(row.updatedAt),
    },
  ];
}

/** Whitelisted so an arbitrary parameter can never reach the query builder. */
export const CATEGORY_SORTABLE = {
  name: "name",
  status: "status",
  updatedAt: "updatedAt",
  order: "order",
} as const;
