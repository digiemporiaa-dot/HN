import type { Metadata } from "next";
import Link from "next/link";
import { BadgePlus, Star } from "lucide-react";

import { buttonStyles, EmptyState, StatusBadge } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { TableSearch } from "@/components/admin/data-table-parts";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { publicUrlForKey } from "@/server/storage/paths";
import { BRAND_LIST_SELECT, type BrandRow } from "@/server/brands/service";
import {
  buildQueryHref,
  readPageParam,
  readStringParam,
} from "@/lib/utils/query";

export const metadata: Metadata = {
  title: "Brands",
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

export default async function BrandsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("BRANDS", "VIEW");
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

  const where: Prisma.BrandWhereInput = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { slug: { contains: query, mode: "insensitive" } },
        ],
      }
    : {};

  const [total, rows] = await Promise.all([
    prisma.brand.count({ where }),
    prisma.brand.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: BRAND_LIST_SELECT,
    }),
  ]);

  return (
    <AdminPage>
      <AdminPageHeader
        title="Brands"
        description="Manufacturers whose equipment the company supplies. Link each one to the categories it covers."
        actions={
          can("BRANDS", "CREATE") ? (
            <Link href="/admin/brands/new" className={buttonStyles()}>
              <BadgePlus aria-hidden="true" className="size-4" />
              New brand
            </Link>
          ) : null
        }
      />

      <DataTable<BrandRow>
        rows={rows}
        rowId={(row) => row.id}
        rowLabel={(row) => row.name}
        rowHref={(row) => `/admin/brands/${row.id}`}
        basePath="/admin/brands"
        searchParams={params}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        entityLabel="brand"
        toolbar={<TableSearch placeholder="Search name or slug" />}
        emptyState={
          <EmptyState
            title={query ? "No matching brands" : "No brands yet"}
            description={
              query
                ? "Try a different name or slug."
                : "Add the manufacturers the company supplies."
            }
            action={
              query ? (
                <Link
                  href={buildQueryHref("/admin/brands", {}, {})}
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
            header: "Brand",
            priority: "primary",
            sortable: true,
            cell: (row) => (
              <div className="flex items-center gap-3">
                {row.logo ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- served
                     from our own media route at its stored size */
                  <img
                    src={publicUrlForKey(row.logo.storageKey)}
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
                    /brands/{row.slug}
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
