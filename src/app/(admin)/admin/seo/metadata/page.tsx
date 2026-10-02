import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

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
  title: "Page metadata",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 25;

const SORTABLE = { path: "path", updatedAt: "updatedAt" } as const;

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

type OverrideRow = {
  id: string;
  path: string;
  title: string | null;
  description: string | null;
  canonical: string | null;
  noindex: boolean;
  ogImageId: string | null;
  updatedAt: Date;
};

export default async function OverridesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("SEO", "VIEW");
  const { can } = await currentPermissions();

  const params = await searchParams;
  const page = readPageParam(params.page);
  const query = readStringParam(params.q);
  const index = readStringParam(params.index);
  const sortKey = readStringParam(params.sort);
  const sortField =
    sortKey && sortKey in SORTABLE
      ? SORTABLE[sortKey as keyof typeof SORTABLE]
      : "updatedAt";
  const sortDir = params.dir === "asc" ? "asc" : "desc";

  const where: Prisma.SeoOverrideWhereInput = {
    ...(query
      ? {
          OR: [
            { path: { contains: query, mode: "insensitive" as const } },
            { title: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(index === "noindex" ? { noindex: true } : {}),
    ...(index === "canonical" ? { canonical: { not: null } } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.seoOverride.count({ where }),
    prisma.seoOverride.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        path: true,
        title: true,
        description: true,
        canonical: true,
        noindex: true,
        ogImageId: true,
        updatedAt: true,
      },
    }),
  ]);

  const filtered = Boolean(query || index);

  return (
    <AdminPage>
      <AdminPageHeader
        title="Page metadata"
        description="Titles, descriptions, canonicals, sharing images and indexation set for particular pages, in place of what the page would say on its own."
        actions={
          can("SEO", "EDIT") ? (
            <Link href="/admin/seo/metadata/new" className={buttonStyles()}>
              <Plus aria-hidden="true" className="size-4" />
              New override
            </Link>
          ) : null
        }
      />

      {params.deleted === "1" ? (
        <p
          role="status"
          className="border-success-100 bg-success-50 text-success-700 text-body-sm rounded-md border p-3.5"
        >
          Override deleted. The page is back to its own metadata.
        </p>
      ) : null}

      <DataTable<OverrideRow>
        rows={rows}
        rowId={(row) => row.id}
        rowLabel={(row) => row.path}
        rowHref={(row) => `/admin/seo/metadata/${row.id}`}
        basePath="/admin/seo/metadata"
        searchParams={params}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        entityLabel="override"
        toolbar={
          <>
            <TableSearch placeholder="Search address or title" />
            <TableFilter
              paramName="index"
              label="Filter"
              allLabel="All overrides"
              options={[
                { value: "noindex", label: "Not indexed" },
                { value: "canonical", label: "Canonical set" },
              ]}
            />
          </>
        }
        emptyState={
          <EmptyState
            title={filtered ? "No matching overrides" : "No overrides yet"}
            description={
              filtered
                ? "Try a different address or filter."
                : "Every page writes its own title and description. Add an override only where the SEO team wants something different."
            }
            action={
              filtered ? (
                <Link
                  href={buildQueryHref("/admin/seo/metadata", {}, {})}
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
            key: "path",
            header: "Page",
            priority: "primary",
            sortable: true,
            cell: (row) => (
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-body-sm text-ink font-medium break-all">
                  {row.path}
                </span>
                {row.title ? (
                  <span className="text-caption text-ink-muted line-clamp-1">
                    {row.title}
                  </span>
                ) : null}
              </div>
            ),
          },
          {
            key: "changes",
            header: "Overrides",
            cell: (row) => (
              <span className="flex flex-wrap gap-1.5">
                {row.title ? <Badge>Title</Badge> : null}
                {row.description ? <Badge>Description</Badge> : null}
                {row.ogImageId ? <Badge>Image</Badge> : null}
                {row.canonical ? <Badge tone="info">Canonical</Badge> : null}
                {row.noindex ? <Badge tone="warning">Noindex</Badge> : null}
              </span>
            ),
          },
          {
            key: "updatedAt",
            header: "Last changed",
            sortable: true,
            priority: "meta",
            cell: (row) => dateFormatter.format(row.updatedAt),
          },
        ]}
      />
    </AdminPage>
  );
}
