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
  type CategoryRow,
} from "@/server/categories/service";
import {
  buildQueryHref,
  readPageParam,
  readStringParam,
} from "@/lib/utils/query";
import { CATEGORY_SORTABLE, categoryColumns } from "./list-shared";
import { DeletedCategories } from "./deleted-categories";

export const metadata: Metadata = {
  title: "Categories",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 20;

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("CATEGORIES", "VIEW");
  const { can } = await currentPermissions();

  const params = await searchParams;
  const page = readPageParam(params.page);
  const query = readStringParam(params.q);
  const sortKey = readStringParam(params.sort);
  const sortField =
    sortKey && sortKey in CATEGORY_SORTABLE
      ? CATEGORY_SORTABLE[sortKey as keyof typeof CATEGORY_SORTABLE]
      : "order";
  const sortDir = params.dir === "desc" ? "desc" : "asc";

  const where: Prisma.CategoryWhereInput = {
    deletedAt: null,
    depth: 0,
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { slug: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, rows, deletedCount] = await Promise.all([
    prisma.category.count({ where }),
    prisma.category.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: CATEGORY_LIST_SELECT,
    }),
    prisma.category.count({ where: { deletedAt: { not: null } } }),
  ]);

  return (
    <AdminPage>
      <AdminPageHeader
        title="Categories"
        description="The top level of the catalogue. Each category has its own page, and can hold subcategories."
        actions={
          can("CATEGORIES", "CREATE") ? (
            <Link href="/admin/categories/new" className={buttonStyles()}>
              <FolderPlus aria-hidden="true" className="size-4" />
              New category
            </Link>
          ) : null
        }
      />

      <DataTable<CategoryRow>
        rows={rows}
        rowId={(row) => row.id}
        rowLabel={(row) => row.name}
        rowHref={(row) => `/admin/categories/${row.id}`}
        basePath="/admin/categories"
        searchParams={params}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        entityLabel="category"
        toolbar={<TableSearch placeholder="Search name or slug" />}
        emptyState={
          <EmptyState
            title={query ? "No matching categories" : "No categories yet"}
            description={
              query
                ? "Try a different name or slug."
                : "Create the first category to start building the catalogue."
            }
            action={
              query ? (
                <Link
                  href={buildQueryHref("/admin/categories", {}, {})}
                  className={buttonStyles({ variant: "outline" })}
                >
                  Clear search
                </Link>
              ) : null
            }
          />
        }
        columns={categoryColumns(new Map(), false)}
      />

      {deletedCount > 0 && can("CATEGORIES", "EDIT") ? (
        <DeletedCategories />
      ) : null}
    </AdminPage>
  );
}
