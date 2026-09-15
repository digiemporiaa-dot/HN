import type { Metadata } from "next";
import Link from "next/link";
import { FolderPlus } from "lucide-react";

import { buttonStyles, EmptyState } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { TableSearch } from "@/components/admin/data-table-parts";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import {
  CATEGORY_LIST_SELECT,
  parentNamesFor,
  selectableParents,
  type CategoryRow,
} from "@/server/categories/service";
import {
  buildQueryHref,
  readPageParam,
  readStringParam,
} from "@/lib/utils/query";
import {
  CATEGORY_SORTABLE,
  categoryColumns,
} from "../categories/list-shared";

export const metadata: Metadata = {
  title: "Subcategories",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 20;

/**
 * Every subcategory across every parent, in one list.
 *
 * The same rows are reachable from their parent's page, but a catalogue team
 * needs to see the whole second level at once — to find a duplicate, or an
 * unpublished one — without opening each category in turn.
 */
export default async function SubcategoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("CATEGORIES", "VIEW");
  const { can } = await currentPermissions();

  const params = await searchParams;
  const page = readPageParam(params.page);
  const query = readStringParam(params.q);
  const parentFilter = readStringParam(params.parent);
  const sortKey = readStringParam(params.sort);
  const sortField =
    sortKey && sortKey in CATEGORY_SORTABLE
      ? CATEGORY_SORTABLE[sortKey as keyof typeof CATEGORY_SORTABLE]
      : "name";
  const sortDir = params.dir === "desc" ? "desc" : "asc";

  const where: Prisma.CategoryWhereInput = {
    deletedAt: null,
    depth: 1,
    ...(parentFilter ? { parentId: parentFilter } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { slug: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, rows, parents] = await Promise.all([
    prisma.category.count({ where }),
    prisma.category.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: CATEGORY_LIST_SELECT,
    }),
    selectableParents(),
  ]);

  const parentNames = await parentNamesFor(rows);

  return (
    <AdminPage>
      <AdminPageHeader
        title="Subcategories"
        description="The second level of the catalogue, across every parent category."
        actions={
          can("CATEGORIES", "CREATE") && parents.length > 0 ? (
            <Link href="/admin/categories/new" className={buttonStyles()}>
              <FolderPlus aria-hidden="true" className="size-4" />
              New subcategory
            </Link>
          ) : null
        }
      />

      <DataTable<CategoryRow>
        rows={rows}
        rowId={(row) => row.id}
        rowLabel={(row) => row.name}
        rowHref={(row) => `/admin/categories/${row.id}`}
        basePath="/admin/subcategories"
        searchParams={params}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        entityLabel="subcategory"
        toolbar={<TableSearch placeholder="Search name or slug" />}
        emptyState={
          <EmptyState
            title={
              query || parentFilter
                ? "No matching subcategories"
                : "No subcategories yet"
            }
            description={
              parents.length === 0
                ? "Create a category first — a subcategory needs a parent."
                : query || parentFilter
                  ? "Try a different search, or clear the parent filter."
                  : "Add one from a category's page, or create it here."
            }
            action={
              query || parentFilter ? (
                <Link
                  href={buildQueryHref("/admin/subcategories", {}, {})}
                  className={buttonStyles({ variant: "outline" })}
                >
                  Clear filters
                </Link>
              ) : null
            }
          />
        }
        columns={categoryColumns(parentNames, true)}
      />
    </AdminPage>
  );
}
