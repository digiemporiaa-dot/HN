import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";

import { buttonStyles, EmptyState, StatusBadge } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { TableSearch } from "@/components/admin/data-table-parts";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { bulkStaffStatusAction } from "@/server/staff/actions";
import {
  buildQueryHref,
  readPageParam,
  readStringParam,
} from "@/lib/utils/query";

export const metadata: Metadata = {
  title: "Staff",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 20;

/** Whitelisted so an arbitrary parameter can never reach the query builder. */
const SORTABLE = {
  name: "name",
  email: "email",
  status: "status",
  lastLoginAt: "lastLoginAt",
  createdAt: "createdAt",
} as const;

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

type StaffRow = {
  id: string;
  name: string;
  email: string;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  mustChangePassword: boolean;
  role: { name: string };
};

export default async function StaffListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("STAFF", "VIEW");
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

  const where: Prisma.StaffWhereInput = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      }
    : {};

  const [total, staff] = await Promise.all([
    prisma.staff.count({ where }),
    prisma.staff.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        mustChangePassword: true,
        role: { select: { name: true } },
      },
    }),
  ]);

  return (
    <AdminPage>
      <AdminPageHeader
        title="Staff"
        description="Accounts that can sign in to the admin area. Access comes from the assigned role, adjusted by any per-account permission overrides."
        actions={
          can("STAFF", "CREATE") ? (
            <Link href="/admin/staff/new" className={buttonStyles()}>
              <UserPlus aria-hidden="true" className="size-4" />
              Add staff member
            </Link>
          ) : null
        }
      />

      <DataTable<StaffRow>
        rows={staff}
        rowId={(row) => row.id}
        rowLabel={(row) => row.name}
        rowHref={(row) => `/admin/staff/${row.id}`}
        basePath="/admin/staff"
        searchParams={params}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        entityLabel="account"
        toolbar={<TableSearch placeholder="Search name or email" />}
        bulkAction={
          can("STAFF", "EDIT")
            ? {
                action: bulkStaffStatusAction,
                options: [
                  { value: "activate", label: "Activate" },
                  { value: "deactivate", label: "Deactivate" },
                ],
              }
            : undefined
        }
        emptyState={
          <EmptyState
            title={query ? "No matching accounts" : "No staff accounts yet"}
            description={
              query
                ? "Try a different name or email address."
                : "Create the first account to give a colleague access to the admin area."
            }
            action={
              query ? (
                <Link
                  href={buildQueryHref("/admin/staff", {}, {})}
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
            header: "Name",
            priority: "primary",
            sortable: true,
            cell: (row) => (
              <div className="flex flex-col gap-0.5">
                <span className="text-body-sm text-ink font-medium">
                  {row.name}
                </span>
                <span className="text-caption text-ink-muted break-all">
                  {row.email}
                </span>
              </div>
            ),
          },
          {
            key: "role",
            header: "Role",
            cell: (row) => row.role.name,
          },
          {
            key: "status",
            header: "Status",
            sortable: true,
            cell: (row) => (
              <div className="flex flex-wrap items-center justify-end gap-2 md:justify-start">
                <StatusBadge status={row.status} />
                {row.mustChangePassword ? (
                  <span className="text-caption text-warning-700">
                    Password change required
                  </span>
                ) : null}
              </div>
            ),
          },
          {
            key: "lastLoginAt",
            header: "Last sign-in",
            sortable: true,
            priority: "meta",
            cell: (row) =>
              row.lastLoginAt ? dateFormatter.format(row.lastLoginAt) : "Never",
          },
          {
            key: "createdAt",
            header: "Created",
            sortable: true,
            priority: "meta",
            cell: (row) => dateFormatter.format(row.createdAt),
          },
        ]}
      />
    </AdminPage>
  );
}
