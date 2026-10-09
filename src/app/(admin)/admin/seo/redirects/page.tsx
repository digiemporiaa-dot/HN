import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

import { Badge, buttonStyles, EmptyState } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { TableFilter, TableSearch } from "@/components/admin/data-table-parts";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import {
  buildQueryHref,
  readPageParam,
  readStringParam,
} from "@/lib/utils/query";

export const metadata: Metadata = {
  title: "Redirects",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 25;

/** Whitelisted so an arbitrary parameter can never reach the query builder. */
const SORTABLE = {
  fromPath: "fromPath",
  hits: "hits",
  lastHitAt: "lastHitAt",
  updatedAt: "updatedAt",
} as const;

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

type RedirectRow = {
  id: string;
  fromPath: string;
  toPath: string;
  type: string;
  source: string;
  active: boolean;
  hits: number;
  lastHitAt: Date | null;
};

export default async function RedirectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("SEO_REDIRECTS", "VIEW");
  const { can } = await currentPermissions();

  const params = await searchParams;
  const page = readPageParam(params.page);
  const query = readStringParam(params.q);
  const source = readStringParam(params.source);
  const status = readStringParam(params.status);
  const sortKey = readStringParam(params.sort);
  const sortField =
    sortKey && sortKey in SORTABLE
      ? SORTABLE[sortKey as keyof typeof SORTABLE]
      : "updatedAt";
  const sortDir = params.dir === "asc" ? "asc" : "desc";

  const where: Prisma.RedirectWhereInput = {
    ...(query
      ? {
          OR: [
            { fromPath: { contains: query, mode: "insensitive" as const } },
            { toPath: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(source === "MANUAL" || source === "AUTOMATIC" ? { source } : {}),
    ...(status === "active"
      ? { active: true }
      : status === "inactive"
        ? { active: false }
        : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.redirect.count({ where }),
    prisma.redirect.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        fromPath: true,
        toPath: true,
        type: true,
        source: true,
        active: true,
        hits: true,
        lastHitAt: true,
      },
    }),
  ]);

  const deleted = params.deleted === "1";
  const filtered = Boolean(query || source || status);

  return (
    <AdminPage>
      <AdminPageHeader
        title="Redirects"
        description="Old addresses and where they now lead. A published page whose address changes gets one automatically, so links in search results and old quotations keep working."
        actions={
          can("SEO_REDIRECTS", "CREATE") ? (
            <Link href="/admin/seo/redirects/new" className={buttonStyles()}>
              <Plus aria-hidden="true" className="size-4" />
              New redirect
            </Link>
          ) : null
        }
      />

      {deleted ? (
        <p
          role="status"
          className="border-success-100 bg-success-50 text-success-700 text-body-sm rounded-md border p-3.5"
        >
          Redirect deleted.
        </p>
      ) : null}

      <DataTable<RedirectRow>
        rows={rows}
        rowId={(row) => row.id}
        rowLabel={(row) => row.fromPath}
        rowHref={(row) => `/admin/seo/redirects/${row.id}`}
        basePath="/admin/seo/redirects"
        searchParams={params}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        entityLabel="redirect"
        toolbar={
          <>
            <TableSearch placeholder="Search old or new address" />
            <TableFilter
              paramName="source"
              label="Filter by source"
              allLabel="Any source"
              options={[
                { value: "MANUAL", label: "Manual" },
                { value: "AUTOMATIC", label: "Automatic" },
              ]}
            />
            <TableFilter
              paramName="status"
              label="Filter by status"
              allLabel="Any status"
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          </>
        }
        emptyState={
          <EmptyState
            title={filtered ? "No matching redirects" : "No redirects yet"}
            description={
              filtered
                ? "Try a different address or filter."
                : "Add one for each address from an old site that should still lead somewhere. Renaming a published page here adds one for you."
            }
            action={
              filtered ? (
                <Link
                  href={buildQueryHref("/admin/seo/redirects", {}, {})}
                  className={buttonStyles({ variant: "outline" })}
                >
                  Clear filters
                </Link>
              ) : null
            }
          />
        }
        columns={[
          {
            key: "fromPath",
            header: "Address",
            priority: "primary",
            sortable: true,
            cell: (row) => (
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-body-sm text-ink font-medium break-all">
                  {row.fromPath}
                </span>
                <span className="text-caption text-ink-muted flex items-center gap-1 break-all">
                  <ArrowRight aria-hidden="true" className="size-3 shrink-0" />
                  {row.toPath}
                </span>
              </div>
            ),
          },
          {
            key: "type",
            header: "Type",
            cell: (row) => (row.type === "PERMANENT" ? "301" : "302"),
          },
          {
            key: "status",
            header: "Status",
            cell: (row) =>
              row.active ? (
                <Badge tone="success">Active</Badge>
              ) : (
                <Badge>Inactive</Badge>
              ),
          },
          {
            key: "source",
            header: "Source",
            priority: "meta",
            cell: (row) =>
              row.source === "AUTOMATIC" ? (
                <Badge tone="info">Automatic</Badge>
              ) : (
                "Manual"
              ),
          },
          {
            key: "hits",
            header: "Followed",
            sortable: true,
            priority: "meta",
            cell: (row) => row.hits,
          },
          {
            key: "lastHitAt",
            header: "Last followed",
            sortable: true,
            priority: "meta",
            cell: (row) =>
              row.lastHitAt ? dateFormatter.format(row.lastHitAt) : "Never",
          },
        ]}
      />
    </AdminPage>
  );
}
