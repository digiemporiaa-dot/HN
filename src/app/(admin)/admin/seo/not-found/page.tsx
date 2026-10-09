import type { Metadata } from "next";
import Link from "next/link";

import { Button, buttonStyles, EmptyState } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { TableFilter, TableSearch } from "@/components/admin/data-table-parts";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import {
  clearIgnoredNotFoundAction,
  setNotFoundIgnoredAction,
} from "@/server/seo/not-found-actions";
import {
  buildQueryHref,
  readPageParam,
  readStringParam,
} from "@/lib/utils/query";

export const metadata: Metadata = {
  title: "Not found",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 25;
const SORTABLE = {
  hits: "hits",
  lastSeenAt: "lastSeenAt",
  path: "path",
} as const;

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

type Row = {
  id: string;
  path: string;
  hits: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  lastReferrer: string | null;
  ignored: boolean;
};

/**
 * Addresses that answered "not found", most requested first.
 *
 * The working list after moving from an old site: each row is a link someone
 * — a person, a search engine, another site — still follows. An address
 * leaves the list when it gets a redirect or something is published there.
 */
export default async function NotFoundLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("SEO_NOT_FOUND", "VIEW");
  const { can } = await currentPermissions();
  const canEdit = can("SEO_NOT_FOUND", "EDIT");
  const canRedirect = can("SEO_REDIRECTS", "CREATE");

  const params = await searchParams;
  const page = readPageParam(params.page);
  const query = readStringParam(params.q);
  const show = readStringParam(params.show) === "ignored" ? "ignored" : "open";
  const sortKey = readStringParam(params.sort);
  const sortField =
    sortKey && sortKey in SORTABLE
      ? SORTABLE[sortKey as keyof typeof SORTABLE]
      : "hits";
  const sortDir = params.dir === "asc" ? "asc" : "desc";

  const where: Prisma.NotFoundHitWhereInput = {
    ignored: show === "ignored",
    ...(query
      ? { path: { contains: query, mode: "insensitive" as const } }
      : {}),
  };

  const [total, rows, ignoredCount] = await Promise.all([
    prisma.notFoundHit.count({ where }),
    prisma.notFoundHit.findMany({
      where,
      orderBy: [{ [sortField]: sortDir }, { lastSeenAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        path: true,
        hits: true,
        firstSeenAt: true,
        lastSeenAt: true,
        lastReferrer: true,
        ignored: true,
      },
    }),
    prisma.notFoundHit.count({ where: { ignored: true } }),
  ]);

  return (
    <AdminPage>
      <AdminPageHeader
        title="Not found"
        description="Addresses that answered “not found”, most requested first. Give each one a redirect, or dismiss it. An address leaves this list once it redirects or something is published there."
        backHref="/admin/seo"
        backLabel="Back to SEO"
        actions={
          canEdit && ignoredCount > 0 && show === "ignored" ? (
            <form action={clearIgnoredNotFoundAction}>
              <Button type="submit" variant="outline" size="sm">
                Clear {ignoredCount} dismissed
              </Button>
            </form>
          ) : null
        }
      />

      <DataTable<Row>
        rows={rows}
        rowId={(row) => row.id}
        rowLabel={(row) => row.path}
        basePath="/admin/seo/not-found"
        searchParams={params}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        entityLabel="address"
        toolbar={
          <>
            <TableSearch placeholder="Search addresses" />
            <TableFilter
              paramName="show"
              label="Show"
              allLabel="Open"
              options={[{ value: "ignored", label: "Dismissed" }]}
            />
          </>
        }
        emptyState={
          <EmptyState
            title={
              query
                ? "No matching addresses"
                : show === "ignored"
                  ? "Nothing dismissed"
                  : "No missing pages recorded"
            }
            description={
              query
                ? "Try a different address."
                : "When someone follows a link to an address that does not exist, it appears here."
            }
            action={
              query ? (
                <Link
                  href={buildQueryHref("/admin/seo/not-found", {}, {})}
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
            key: "path",
            header: "Address",
            priority: "primary",
            sortable: true,
            cell: (row) => (
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-body-sm text-ink font-medium break-all">
                  {row.path}
                </span>
                {row.lastReferrer ? (
                  <span className="text-caption text-ink-muted break-all">
                    Linked from {row.lastReferrer}
                  </span>
                ) : null}
              </div>
            ),
          },
          {
            key: "hits",
            header: "Requests",
            sortable: true,
            cell: (row) => row.hits,
          },
          {
            key: "lastSeenAt",
            header: "Last requested",
            sortable: true,
            priority: "meta",
            cell: (row) => dateFormatter.format(row.lastSeenAt),
          },
          {
            key: "actions",
            header: "",
            cell: (row) =>
              canEdit || canRedirect ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {row.ignored || !canRedirect ? null : (
                    <Link
                      href={`/admin/seo/redirects/new?from=${encodeURIComponent(row.path)}`}
                      className={buttonStyles({ size: "sm" })}
                    >
                      Create redirect
                    </Link>
                  )}
                  {canEdit ? (
                  <form action={setNotFoundIgnoredAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <input
                      type="hidden"
                      name="ignored"
                      value={row.ignored ? "false" : "true"}
                    />
                    <Button type="submit" variant="outline" size="sm">
                      {row.ignored ? "Restore" : "Dismiss"}
                    </Button>
                  </form>
                  ) : null}
                </div>
              ) : null,
          },
        ]}
      />
    </AdminPage>
  );
}
