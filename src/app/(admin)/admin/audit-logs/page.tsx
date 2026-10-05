import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";

import { Badge, buttonStyles, EmptyState } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { TableFilter, TableSearch } from "@/components/admin/data-table-parts";
import type { PermissionModule } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { MODULE_LABELS, MODULE_ORDER } from "@/server/permissions/catalogue";
import {
  actionLabel,
  AUDIT_PERIODS,
  auditWhere,
  readAuditFilters,
} from "@/server/audit/query";
import { buildQueryHref, readPageParam } from "@/lib/utils/query";

export const metadata: Metadata = {
  title: "Audit log",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 50;

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "Asia/Kolkata",
});

type Row = {
  id: string;
  createdAt: Date;
  actorEmail: string | null;
  action: string;
  module: PermissionModule | null;
  summary: string | null;
  ipAddress: string | null;
};

function tone(action: string) {
  if (/FAILED|THROTTLED|DENIED/.test(action)) return "danger" as const;
  if (/DELETED|RESTORED|DISABLED|REVOKED/.test(action))
    return "warning" as const;
  return "neutral" as const;
}

/**
 * Who did what, and when. Read-only by design: nothing on this screen — or
 * anywhere else in the admin — edits or deletes an audit entry.
 */
export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("AUDIT_LOGS", "VIEW");
  const { can } = await currentPermissions();
  const canExport = can("AUDIT_LOGS", "EXPORT");

  const params = await searchParams;
  const page = readPageParam(params.page);
  const filters = readAuditFilters(params);
  const where = auditWhere(filters);

  const [total, rows, actions] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        createdAt: true,
        actorEmail: true,
        action: true,
        module: true,
        summary: true,
        ipAddress: true,
      },
    }),
    prisma.auditLog.groupBy({ by: ["action"], orderBy: { action: "asc" } }),
  ]);

  const exportHref = buildQueryHref("/api/admin/audit-logs/export", params, {
    page: undefined,
  });

  return (
    <AdminPage>
      <AdminPageHeader
        title="Audit log"
        description="Every sign-in, change, export, backup and restore, newest first. Entries cannot be edited or deleted."
        actions={
          canExport ? (
            <a
              href={exportHref}
              className={buttonStyles({ variant: "outline", size: "sm" })}
            >
              <Download aria-hidden="true" className="size-4" />
              Export CSV
            </a>
          ) : null
        }
      />

      <DataTable<Row>
        rows={rows}
        rowId={(row) => row.id}
        rowLabel={(row) => actionLabel(row.action)}
        rowHref={(row) => `/admin/audit-logs/${row.id}`}
        basePath="/admin/audit-logs"
        searchParams={params}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        entityLabel="entry"
        toolbar={
          <>
            <TableSearch placeholder="Search email, summary, IP or record id" />
            <TableFilter
              paramName="days"
              label="Period"
              allLabel="All time"
              options={AUDIT_PERIODS.map((period) => ({ ...period }))}
            />
            <TableFilter
              paramName="module"
              label="Area"
              allLabel="All areas"
              options={MODULE_ORDER.map((module) => ({
                value: module,
                label: MODULE_LABELS[module],
              }))}
            />
            <TableFilter
              paramName="action"
              label="Event"
              allLabel="All events"
              options={actions.map(({ action }) => ({
                value: action,
                label: actionLabel(action),
              }))}
            />
          </>
        }
        emptyState={
          <EmptyState
            title="No matching entries"
            description="Try a longer period or fewer filters."
            action={
              <Link
                href="/admin/audit-logs"
                className={buttonStyles({ variant: "outline" })}
              >
                Clear filters
              </Link>
            }
          />
        }
        columns={[
          {
            key: "createdAt",
            header: "When",
            priority: "meta",
            cellClassName: "whitespace-nowrap",
            cell: (row) => dateFormatter.format(row.createdAt),
          },
          {
            key: "action",
            header: "Event",
            priority: "primary",
            cell: (row) => (
              <div className="flex min-w-0 flex-col gap-1">
                <span>
                  <Badge tone={tone(row.action)}>
                    {actionLabel(row.action)}
                  </Badge>
                </span>
                {row.summary ? (
                  <span className="text-caption text-ink-muted break-words">
                    {row.summary}
                  </span>
                ) : null}
              </div>
            ),
          },
          {
            key: "actor",
            header: "By",
            cell: (row) => (
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="break-all">{row.actorEmail ?? "System"}</span>
                {row.ipAddress ? (
                  <span className="text-caption text-ink-muted">
                    {row.ipAddress}
                  </span>
                ) : null}
              </div>
            ),
          },
          {
            key: "module",
            header: "Area",
            priority: "meta",
            cell: (row) => (row.module ? MODULE_LABELS[row.module] : "—"),
          },
        ]}
      />
    </AdminPage>
  );
}
