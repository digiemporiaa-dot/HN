import type { Metadata } from "next";
import Link from "next/link";
import { Blocks, Star } from "lucide-react";

import { buttonStyles, EmptyState, StatusBadge } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { TableSearch } from "@/components/admin/data-table-parts";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { publicUrlForKey } from "@/server/storage/paths";
import { SOLUTION_LIST_SELECT, type SolutionRow } from "@/server/solutions/service";
import {
  buildQueryHref,
  readPageParam,
  readStringParam,
} from "@/lib/utils/query";

export const metadata: Metadata = {
  title: "Solutions",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 20;

/** Whitelisted so an arbitrary parameter can never reach the query builder. */
const SORTABLE = {
  name: "name",
  status: "status",
  order: "order",
  updatedAt: "updatedAt",
} as const;

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

export default async function SolutionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("SOLUTIONS", "VIEW");
  const { can } = await currentPermissions();

  const params = await searchParams;
  const page = readPageParam(params.page);
  const query = readStringParam(params.q);
  const sortKey = readStringParam(params.sort);
  const sortField =
    sortKey && sortKey in SORTABLE
      ? SORTABLE[sortKey as keyof typeof SORTABLE]
      : "name";
  const sortDir = params.dir === "desc" ? "desc" : "asc";

  const where: Prisma.SolutionWhereInput = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { slug: { contains: query, mode: "insensitive" } },
        ],
      }
    : {};

  const [total, rows] = await Promise.all([
    prisma.solution.count({ where }),
    prisma.solution.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: SOLUTION_LIST_SELECT,
    }),
  ]);

  return (
    <AdminPage>
      <AdminPageHeader
        title="Solutions"
        description="Clinical departments the company equips. A category is what the equipment is; a solution is who uses it."
        actions={
          can("SOLUTIONS", "CREATE") ? (
            <Link href="/admin/solutions/new" className={buttonStyles()}>
              <Blocks aria-hidden="true" className="size-4" />
              New solution
            </Link>
          ) : null
        }
      />

      <DataTable<SolutionRow>
        rows={rows}
        rowId={(row) => row.id}
        rowLabel={(row) => row.name}
        rowHref={(row) => `/admin/solutions/${row.id}`}
        basePath="/admin/solutions"
        searchParams={params}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        entityLabel="solution"
        toolbar={<TableSearch placeholder="Search name or slug" />}
        emptyState={
          <EmptyState
            title={query ? "No matching solutions" : "No solutions yet"}
            description={
              query
                ? "Try a different name or slug."
                : "Add the packaged offerings the company delivers."
            }
            action={
              query ? (
                <Link
                  href={buildQueryHref("/admin/solutions", {}, {})}
                  className={buttonStyles({ variant: "outline" })}
                >
                  Clear search
                </Link>
              ) : null
            }
          />
        }
        columns={[
          {
            key: "name",
            header: "Solution",
            priority: "primary",
            sortable: true,
            cell: (row) => (
              <div className="flex items-center gap-3">
                {row.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- served
                     from our own media route at its stored size */
                  <img
                    src={publicUrlForKey(row.image.storageKey)}
                    alt=""
                    className="border-line size-9 shrink-0 rounded-md border object-contain"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="border-line bg-surface-muted size-9 shrink-0 rounded-md border"
                  />
                )}
                <div className="flex min-w-0 flex-col gap-0.5">
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
                    /solutions/{row.slug}
                  </span>
                </div>
              </div>
            ),
          },
          {
            key: "categories",
            header: "Categories",
            priority: "meta",
            cell: (row) => row._count.categories,
          },
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
        ]}
      />
    </AdminPage>
  );
}
