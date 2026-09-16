import type { Metadata } from "next";
import Link from "next/link";

import { buttonStyles, EmptyState, Badge } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { TableFilter, TableSearch } from "@/components/admin/data-table-parts";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { LEAD_LIST_SELECT, type LeadRow } from "@/server/leads/service";
import { LEAD_SOURCES, LEAD_STATUSES } from "@/lib/validation/leads";
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

const SOURCE_LABELS: Record<string, string> = {
  PRODUCT_ENQUIRY: "Product enquiry",
  DOCUMENT_DOWNLOAD: "Document request",
  CONTACT_FORM: "Contact form",
  RFQ: "Quotation request",
};

const STATUS_TONE: Record<
  string,
  "neutral" | "info" | "success" | "warning" | "danger"
> = {
  NEW: "info",
  CONTACTED: "neutral",
  QUALIFIED: "neutral",
  QUOTED: "warning",
  WON: "success",
  LOST: "danger",
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
  const { can } = await currentPermissions();

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
  const status =
    rawStatus && STATUS_VALUES.has(rawStatus) ? rawStatus : undefined;
  const source =
    rawSource && SOURCE_VALUES.has(rawSource) ? rawSource : undefined;

  const where: Prisma.LeadWhereInput = {
    deletedAt: null,
    ...(status ? { status: status as Prisma.LeadWhereInput["status"] } : {}),
    ...(source ? { source: source as Prisma.LeadWhereInput["source"] } : {}),
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

  const filtered = Boolean(query || status || source);

  return (
    <AdminPage>
      <AdminPageHeader
        title="Leads"
        description="Every enquiry from the website, newest first."
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
                label: SOURCE_LABELS[value] ?? value,
              }))}
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
            cell: (row) => row.productName ?? SOURCE_LABELS[row.source] ?? "—",
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
