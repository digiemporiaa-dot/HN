import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Pin } from "lucide-react";

import {
  Button,
  buttonStyles,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  StatusBadge,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { TableFilter, TableSearch } from "@/components/admin/data-table-parts";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { restorePostAction } from "@/server/blog/actions";
import { CONTENT_STATUS_OPTIONS } from "@/lib/validation/content-status";
import { readPageParam, readStringParam } from "@/lib/utils/query";

export const metadata: Metadata = {
  title: "Blog",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 25;
const STATUS_VALUES = new Set<string>(
  CONTENT_STATUS_OPTIONS.map((o) => o.value),
);

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

type Row = {
  id: string;
  title: string;
  slug: string;
  status: string;
  featured: boolean;
  authorName: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
};

export default async function BlogPostsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("BLOGS", "VIEW");
  const { can } = await currentPermissions();

  const params = await searchParams;
  const page = readPageParam(params.page);
  const query = readStringParam(params.q);
  const rawStatus = readStringParam(params.status);
  const status =
    rawStatus && STATUS_VALUES.has(rawStatus) ? rawStatus : undefined;

  const where: Prisma.BlogPostWhereInput = {
    deletedAt: null,
    ...(status
      ? { status: status as Prisma.BlogPostWhereInput["status"] }
      : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { slug: { contains: query, mode: "insensitive" } },
            { authorName: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, rows, deleted] = await Promise.all([
    prisma.blogPost.count({ where }),
    prisma.blogPost.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        featured: true,
        authorName: true,
        publishedAt: true,
        updatedAt: true,
      },
    }),
    can("BLOGS", "DELETE")
      ? prisma.blogPost.findMany({
          where: { deletedAt: { not: null } },
          orderBy: { deletedAt: "desc" },
          take: 20,
          select: { id: true, title: true, deletedAt: true },
        })
      : Promise.resolve([]),
  ]);

  const filtered = Boolean(query || status);

  return (
    <AdminPage>
      <AdminPageHeader
        title="Blog"
        description="Articles at /blog. Each post is written in sections, like a page."
        actions={
          can("BLOGS", "CREATE") ? (
            <Link href="/admin/blogs/new" className={buttonStyles()}>
              <Plus aria-hidden="true" className="size-4" />
              New post
            </Link>
          ) : null
        }
      />

      <DataTable<Row>
        rows={rows}
        rowId={(row) => row.id}
        rowLabel={(row) => row.title}
        rowHref={(row) => `/admin/blogs/${row.id}`}
        basePath="/admin/blogs"
        searchParams={params}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        entityLabel="post"
        toolbar={
          <>
            <TableSearch placeholder="Search title, slug or author" />
            <TableFilter
              paramName="status"
              label="Filter by status"
              allLabel="Any status"
              options={CONTENT_STATUS_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
            />
          </>
        }
        emptyState={
          <EmptyState
            title={filtered ? "No matching posts" : "No posts yet"}
            description={
              filtered
                ? "Try a different search, or clear the filter."
                : "Write the first article; it stays a draft until it is published."
            }
            action={
              filtered ? (
                <Link
                  href="/admin/blogs"
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
            key: "title",
            header: "Post",
            priority: "primary",
            cell: (row) => (
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-body-sm text-ink flex items-center gap-1.5 font-medium">
                  {row.featured ? (
                    <Pin
                      aria-label="Pinned"
                      className="text-primary size-3.5 shrink-0"
                    />
                  ) : null}
                  {row.title}
                </span>
                <span className="text-caption text-ink-muted break-all">
                  /blog/{row.slug}
                </span>
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            cell: (row) => <StatusBadge status={row.status} />,
          },
          {
            key: "author",
            header: "Byline",
            priority: "meta",
            cell: (row) => row.authorName ?? "—",
          },
          {
            key: "publishedAt",
            header: "Published",
            priority: "meta",
            cell: (row) =>
              row.publishedAt ? dateFormatter.format(row.publishedAt) : "—",
          },
          {
            key: "updatedAt",
            header: "Updated",
            priority: "meta",
            cell: (row) => dateFormatter.format(row.updatedAt),
          },
        ]}
      />

      {deleted.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle as="h2">Deleted posts</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col">
              {deleted.map((post) => (
                <li
                  key={post.id}
                  className="border-line text-body-sm flex flex-wrap items-center justify-between gap-3 border-b py-2.5 last:border-0"
                >
                  <span className="text-ink">
                    {post.title}
                    <span className="text-ink-muted">
                      {" "}
                      · deleted {dateFormatter.format(post.deletedAt!)}
                    </span>
                  </span>
                  <form action={restorePostAction}>
                    <input type="hidden" name="postId" value={post.id} />
                    <Button type="submit" variant="outline" size="sm">
                      Restore as draft
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </AdminPage>
  );
}
