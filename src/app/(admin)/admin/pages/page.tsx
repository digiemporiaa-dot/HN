import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2 } from "lucide-react";

import { buttonStyles, EmptyState, StatusBadge } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { TableSearch } from "@/components/admin/data-table-parts";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import {
  buildQueryHref,
  readPageParam,
  readStringParam,
} from "@/lib/utils/query";

export const metadata: Metadata = {
  title: "Pages",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 20;

/** Whitelisted so an arbitrary parameter can never reach the query builder. */
const SORTABLE = {
  title: "title",
  slug: "slug",
  status: "status",
  updatedAt: "updatedAt",
} as const;

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

type PageRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  updatedAt: Date;
  _count: { sections: number };
};

export default async function PagesListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("PAGES", "VIEW");
  const { can } = await currentPermissions();

  const params = await searchParams;
  const page = readPageParam(params.page);
  const query = readStringParam(params.q);
  const sortKey = readStringParam(params.sort);
  const sortField =
    sortKey && sortKey in SORTABLE
      ? SORTABLE[sortKey as keyof typeof SORTABLE]
      : "updatedAt";
  const sortDir = params.dir === "asc" ? "asc" : "desc";

  const where: Prisma.PageWhereInput = {
    deletedAt: null,
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { slug: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, pages] = await Promise.all([
    prisma.page.count({ where }),
    prisma.page.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        updatedAt: true,
        _count: { select: { sections: true } },
      },
    }),
  ]);

  return (
    <AdminPage>
      <AdminPageHeader
        title="Pages"
        description="Content pages built from reusable sections. A page is only reachable on the public site once it is published."
        actions={
          can("PAGES", "CREATE") ? (
            <Link href="/admin/pages/new" className={buttonStyles()}>
              <FilePlus2 aria-hidden="true" className="size-4" />
              New page
            </Link>
          ) : null
        }
      />

      <DataTable<PageRow>
        rows={pages}
        rowId={(row) => row.id}
        rowLabel={(row) => row.title}
        rowHref={(row) => `/admin/pages/${row.id}`}
        basePath="/admin/pages"
        searchParams={params}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        entityLabel="page"
        toolbar={<TableSearch placeholder="Search title or slug" />}
        emptyState={
          <EmptyState
            title={query ? "No matching pages" : "No pages yet"}
            description={
              query
                ? "Try a different title or slug."
                : "Create a page, then build it up from sections."
            }
            action={
              query ? (
                <Link
                  href={buildQueryHref("/admin/pages", {}, {})}
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
            key: "title",
            header: "Title",
            priority: "primary",
            sortable: true,
            cell: (row) => (
              <div className="flex flex-col gap-0.5">
                <span className="text-body-sm text-ink font-medium">
                  {row.title}
                </span>
                <span className="text-caption text-ink-muted break-all">
                  /{row.slug}
                </span>
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            sortable: true,
            cell: (row) => <StatusBadge status={row.status} />,
          },
          {
            key: "sections",
            header: "Sections",
            priority: "meta",
            cell: (row) => row._count.sections,
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
