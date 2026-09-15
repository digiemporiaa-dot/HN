import type { Metadata } from "next";
import Link from "next/link";
import { Crosshair } from "lucide-react";

import { buttonStyles, EmptyState } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { TableSearch } from "@/components/admin/data-table-parts";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import {
  APPLICATION_LIST_SELECT,
  type ApplicationRow,
} from "@/server/applications/service";
import {
  buildQueryHref,
  readPageParam,
  readStringParam,
} from "@/lib/utils/query";

export const metadata: Metadata = {
  title: "Applications",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 20;

/** Whitelisted so an arbitrary parameter can never reach the query builder. */
const SORTABLE = {
  name: "name",
  order: "order",
  updatedAt: "updatedAt",
} as const;

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("APPLICATIONS", "VIEW");
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

  const where: Prisma.ApplicationWhereInput = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { slug: { contains: query, mode: "insensitive" } },
        ],
      }
    : {};

  const [total, rows] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: APPLICATION_LIST_SELECT,
    }),
  ]);

  return (
    <AdminPage>
      <AdminPageHeader
        title="Applications"
        description="What a product is used for. A specialty is the department that owns the equipment; an application is the procedure it is bought to perform."
        actions={
          can("APPLICATIONS", "CREATE") ? (
            <Link href="/admin/applications/new" className={buttonStyles()}>
              <Crosshair aria-hidden="true" className="size-4" />
              New application
            </Link>
          ) : null
        }
      />

      <DataTable<ApplicationRow>
        rows={rows}
        rowId={(row) => row.id}
        rowLabel={(row) => row.name}
        rowHref={(row) => `/admin/applications/${row.id}`}
        basePath="/admin/applications"
        searchParams={params}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        entityLabel="application"
        toolbar={<TableSearch placeholder="Search name or slug" />}
        emptyState={
          <EmptyState
            title={query ? "No matching applications" : "No applications yet"}
            description={
              query
                ? "Try a different name or slug."
                : "Add the procedures the catalogue's equipment is bought to perform."
            }
            action={
              query ? (
                <Link
                  href={buildQueryHref("/admin/applications", {}, {})}
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
            header: "Application",
            priority: "primary",
            sortable: true,
            cell: (row) => (
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-body-sm text-ink font-medium">
                  {row.name}
                </span>
                <span className="text-caption text-ink-muted break-all">
                  /applications/{row.slug}
                </span>
              </div>
            ),
          },
          {
            key: "products",
            header: "Products",
            cell: (row) => row._count.products,
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
