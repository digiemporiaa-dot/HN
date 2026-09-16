import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";

import { buttonStyles, EmptyState, Badge } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { TableFilter, TableSearch } from "@/components/admin/data-table-parts";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { LEAD_LIST_SELECT, type LeadRow } from "@/server/leads/service";
import {
  LEAD_PRIORITIES,
  LEAD_SOURCE_LABELS,
  LEAD_SOURCES,
  LEAD_STATUSES,
} from "@/lib/validation/leads";
import {
  buildQueryHref,
  readPageParam,
  readStringParam,
} from "@/lib/utils/query";
import { DeletedLeads } from "./deleted-leads";

export const metadata: Metadata = {
  title: "Leads",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 25;

const SORTABLE = {
  createdAt: "createdAt",
  status: "status",
  name: "name",
} as const;

const STATUS_VALUES = new Set<string>(LEAD_STATUSES.map((s) => s.value));
const SOURCE_VALUES = new Set<string>(LEAD_SOURCES);

const PRIORITY_VALUES = new Set<string>(LEAD_PRIORITIES.map((p) => p.value));

const STATUS_TONE: Record<
  string,
  "neutral" | "info" | "success" | "warning" | "danger"
> = {
  NEW: "info",
  CONTACTED: "neutral",
  QUALIFIED: "neutral",
  QUOTATION_SENT: "warning",
  NEGOTIATION: "warning",
  WON: "success",
  LOST: "danger",
};

/**
 * Only the two priorities worth interrupting someone for are coloured.
 *
 * Colouring all four would make the column a stripe of noise and leave nothing
 * standing out, which is the opposite of what a priority is for.
 */
const PRIORITY_TONE: Record<string, "neutral" | "warning" | "danger"> = {
  LOW: "neutral",
  NORMAL: "neutral",
  HIGH: "warning",
  URGENT: "danger",
};

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("LEADS", "VIEW");
  const { can, staff } = await currentPermissions();

  const params = await searchParams;
  const page = readPageParam(params.page);
  const query = readStringParam(params.q);
  const sortKey = readStringParam(params.sort);
  const sortField =
    sortKey && sortKey in SORTABLE
      ? SORTABLE[sortKey as keyof typeof SORTABLE]
      : "createdAt";
  const sortDir = params.dir === "asc" ? "asc" : "desc";

  const rawStatus = readStringParam(params.status);
  const rawSource = readStringParam(params.source);
  const rawPriority = readStringParam(params.priority);
  const rawOwner = readStringParam(params.owner);
  // Every filter is checked against what exists rather than passed through, so
  // a hand-edited URL cannot reach the query builder.
  const status =
    rawStatus && STATUS_VALUES.has(rawStatus) ? rawStatus : undefined;
  const source =
    rawSource && SOURCE_VALUES.has(rawSource) ? rawSource : undefined;
  const priority =
    rawPriority && PRIORITY_VALUES.has(rawPriority) ? rawPriority : undefined;
  const owner =
    rawOwner === "mine" || rawOwner === "none" ? rawOwner : undefined;
  const viewer = owner === "mine" ? staff : null;

  const where: Prisma.LeadWhereInput = {
    deletedAt: null,
    ...(status ? { status: status as Prisma.LeadWhereInput["status"] } : {}),
    ...(source ? { source: source as Prisma.LeadWhereInput["source"] } : {}),
    ...(priority
      ? { priority: priority as Prisma.LeadWhereInput["priority"] }
      : {}),
    ...(owner === "none" ? { assignedToId: null } : {}),
    ...(owner === "mine" && viewer ? { assignedToId: viewer.id } : {}),
    ...(query
      ? {
          OR: [
            { reference: { contains: query, mode: "insensitive" as const } },
            { name: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
            { organisation: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, rows, deletedCount] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: LEAD_LIST_SELECT,
    }),
    prisma.lead.count({ where: { deletedAt: { not: null } } }),
  ]);

  const filtered = Boolean(query || status || source || priority || owner);

  return (
    <AdminPage>
      <AdminPageHeader
        title="Leads"
        description="Every enquiry from the website, newest first."
        actions={
          can("LEADS", "EXPORT") ? (
            <a
              href={buildQueryHref(
                "/api/admin/leads/export",
                {},
                { status, source, priority },
              )}
              className={buttonStyles({ variant: "outline" })}
            >
              <Download aria-hidden="true" className="size-4" />
              Export CSV
            </a>
          ) : null
        }
      />

      <DataTable<LeadRow>
        rows={rows}
        rowId={(row) => row.id}
        rowLabel={(row) => row.reference}
        rowHref={(row) => `/admin/leads/${row.id}`}
        basePath="/admin/leads"
        searchParams={params}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        entityLabel="lead"
        toolbar={
          <>
            <TableSearch placeholder="Search reference, name, email" />
            <TableFilter
              paramName="status"
              label="Filter by status"
              allLabel="Any status"
              options={LEAD_STATUSES.map((s) => ({
                value: s.value,
                label: s.label,
              }))}
            />
            <TableFilter
              paramName="source"
              label="Filter by source"
              allLabel="Any source"
              options={LEAD_SOURCES.map((value) => ({
                value,
                label: LEAD_SOURCE_LABELS[value] ?? value,
              }))}
            />
            <TableFilter
              paramName="priority"
              label="Filter by priority"
              allLabel="Any priority"
              options={LEAD_PRIORITIES.map((entry) => ({
                value: entry.value,
                label: entry.label,
              }))}
            />
            <TableFilter
              paramName="owner"
              label="Filter by owner"
              allLabel="Anyone"
              options={[
                { value: "mine", label: "Assigned to me" },
                { value: "none", label: "Unassigned" },
              ]}
            />
          </>
        }
        emptyState={
          <EmptyState
            title={filtered ? "No matching leads" : "No enquiries yet"}
            description={
              filtered
                ? "Try a different search, or clear the filters."
                : "Enquiries from the website will appear here as they arrive."
            }
            action={
              filtered ? (
                <Link
                  href={buildQueryHref("/admin/leads", {}, {})}
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
            key: "name",
            header: "Enquiry",
            priority: "primary",
            sortable: true,
            cell: (row) => (
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-body-sm text-ink font-medium">
                  {row.name}
                  {row.organisation ? (
                    <span className="text-ink-muted font-normal">
                      {" "}
                      · {row.organisation}
                    </span>
                  ) : null}
                </span>
                <span className="text-caption text-ink-muted break-all">
                  {row.reference} · {row.email}
                </span>
              </div>
            ),
          },
          {
            key: "product",
            header: "About",
            priority: "meta",
            // A quotation request covers a list, so it says how long the list
            // is rather than naming a product that would misdescribe the rest.
            cell: (row) =>
              row.productName ??
              (row._count.items > 0
                ? `${row._count.items} ${row._count.items === 1 ? "product" : "products"}`
                : (row.categoryName ?? LEAD_SOURCE_LABELS[row.source] ?? "—")),
          },
          {
            key: "priority",
            header: "Priority",
            priority: "meta",
            cell: (row) =>
              row.priority === "NORMAL" ? (
                <span className="text-ink-subtle">—</span>
              ) : (
                <Badge tone={PRIORITY_TONE[row.priority] ?? "neutral"}>
                  {LEAD_PRIORITIES.find((p) => p.value === row.priority)
                    ?.label ?? row.priority}
                </Badge>
              ),
          },
          {
            key: "status",
            header: "Status",
            sortable: true,
            cell: (row) => (
              <Badge tone={STATUS_TONE[row.status] ?? "neutral"}>
                {LEAD_STATUSES.find((s) => s.value === row.status)?.label ??
                  row.status}
              </Badge>
            ),
          },
          {
            key: "assignedTo",
            header: "Owner",
            priority: "meta",
            cell: (row) => row.assignedTo?.name ?? "Unassigned",
          },
          {
            key: "createdAt",
            header: "Received",
            sortable: true,
            cell: (row) => dateFormatter.format(row.createdAt),
          },
        ]}
      />

      {deletedCount > 0 && can("LEADS", "EDIT") ? <DeletedLeads /> : null}
    </AdminPage>
  );
}
