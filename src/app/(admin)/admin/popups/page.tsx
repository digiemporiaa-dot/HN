import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, CirclePause, Layers, MessageSquarePlus, Radio } from "lucide-react";

import { Badge, buttonStyles, EmptyState, type BadgeTone } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { MetricCard } from "@/components/admin/metric-card";
import { DataTable } from "@/components/admin/data-table";
import { TableFilter, TableSearch } from "@/components/admin/data-table-parts";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { listPopups, popupMetrics, type PopupRow } from "@/server/popups/service";
import { targetingSummary, type PopupState } from "@/lib/popups/rules";
import { displayIstDateTime } from "@/lib/dates/ist";
import { buildQueryHref, readPageParam } from "@/lib/utils/query";
import {
  POPUP_DEVICE_LABELS,
  POPUP_TRIGGER_LABELS,
  POPUP_TYPE_LABELS,
  POPUP_TYPES,
  popupFiltersSchema,
} from "@/lib/validation/popups";
import { PopupActiveSwitch, PopupEditLink, PopupRowActions } from "./popup-controls";

export const metadata: Metadata = {
  title: "Popups",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 25;

const STATE_LABEL: Record<PopupState, { label: string; tone: BadgeTone }> = {
  live: { label: "Live", tone: "success" },
  scheduled: { label: "Scheduled", tone: "info" },
  expired: { label: "Expired", tone: "warning" },
  inactive: { label: "Inactive", tone: "neutral" },
};

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

function schedule(row: PopupRow): string {
  if (!row.startsAt && !row.endsAt) return "No schedule";
  const from = row.startsAt ? displayIstDateTime(row.startsAt) : "now";
  const to = row.endsAt ? displayIstDateTime(row.endsAt) : "no end";
  return `${from} → ${to}`;
}

export default async function PopupsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("POPUPS", "VIEW");
  const { can } = await currentPermissions();

  const params = await searchParams;
  const filters = popupFiltersSchema.parse({ q: params.q ?? "", state: params.state ?? "", type: params.type ?? "" });
  const page = readPageParam(params.page);

  const all = await listPopups();
  const metrics = popupMetrics(all);
  const needle = filters.q.toLowerCase();
  const filtered = all.filter(
    (row) =>
      (!needle || row.name.toLowerCase().includes(needle) || row.heading.toLowerCase().includes(needle)) &&
      (filters.state === "all" || row.state === filters.state) &&
      (filters.type === "all" || row.type === filters.type),
  );
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isFiltered = Boolean(needle) || filters.state !== "all" || filters.type !== "all";

  const canPublish = can("POPUPS", "PUBLISH");
  const canEdit = can("POPUPS", "EDIT");
  const canCreate = can("POPUPS", "CREATE");
  const canDelete = can("POPUPS", "DELETE");

  return (
    <AdminPage>
      <AdminPageHeader
        title="Popups"
        description="Dialogs shown to visitors of the public site: an enquiry form, a product, a resource or a notice. One at a time, on the pages you choose."
        actions={
          canCreate ? (
            <Link href="/admin/popups/new" className={buttonStyles()}>
              <MessageSquarePlus aria-hidden="true" className="size-4" />
              New popup
            </Link>
          ) : null
        }
      />

      {params.deleted === "1" ? (
        <p role="status" className="border-success-100 bg-success-50 text-success-700 text-body-sm rounded-md border p-3">
          Popup deleted.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total" value={metrics.total} icon={Layers} className="glass-card" />
        <MetricCard label="Live now" value={metrics.live} icon={Radio} hint="Active and inside their schedule" className="glass-card" />
        <MetricCard label="Scheduled" value={metrics.scheduled} icon={CalendarClock} hint="Active, starting later" className="glass-card" />
        <MetricCard label="Inactive or expired" value={metrics.off} icon={CirclePause} className="glass-card" />
      </div>

      <DataTable<PopupRow>
        rows={rows}
        rowId={(row) => row.id}
        rowLabel={(row) => row.name}
        basePath="/admin/popups"
        searchParams={params}
        total={filtered.length}
        page={page}
        pageSize={PAGE_SIZE}
        entityLabel="popup"
        toolbar={
          <>
            <TableSearch placeholder="Search name or heading" />
            <TableFilter
              paramName="state"
              label="Filter by state"
              allLabel="Any state"
              options={(Object.keys(STATE_LABEL) as PopupState[]).map((state) => ({
                value: state,
                label: STATE_LABEL[state].label,
              }))}
            />
            <TableFilter
              paramName="type"
              label="Filter by type"
              allLabel="Any type"
              options={POPUP_TYPES.map((type) => ({ value: type, label: POPUP_TYPE_LABELS[type] }))}
            />
          </>
        }
        emptyState={
          <EmptyState
            title={isFiltered ? "No matching popups" : "No popups yet"}
            description={
              isFiltered
                ? "Try a different search, or clear the filters."
                : "Create a popup to invite enquiries or point visitors to a product. It starts switched off."
            }
            action={
              isFiltered ? (
                <Link href={buildQueryHref("/admin/popups", {}, {})} className={buttonStyles({ variant: "outline" })}>
                  Clear filters
                </Link>
              ) : canCreate ? (
                <Link href="/admin/popups/new" className={buttonStyles()}>
                  New popup
                </Link>
              ) : null
            }
          />
        }
        columns={[
          {
            key: "name",
            header: "Popup",
            priority: "primary",
            cell: (row) => (
              <div className="flex min-w-0 flex-col gap-0.5">
                <PopupEditLink id={row.id} label={row.name} />
                <span className="text-caption text-ink-muted line-clamp-1">{row.heading}</span>
              </div>
            ),
          },
          {
            key: "state",
            header: "State",
            cell: (row) => <Badge tone={STATE_LABEL[row.state].tone}>{STATE_LABEL[row.state].label}</Badge>,
          },
          {
            key: "type",
            header: "Type",
            priority: "meta",
            cell: (row) => POPUP_TYPE_LABELS[row.type],
          },
          {
            key: "trigger",
            header: "Trigger",
            priority: "meta",
            cell: (row) => POPUP_TRIGGER_LABELS[row.trigger],
          },
          {
            key: "targeting",
            header: "Pages",
            priority: "meta",
            cell: (row) => <span className="line-clamp-2 break-all">{targetingSummary(row.targetMode, row.rules)}</span>,
          },
          {
            key: "device",
            header: "Devices",
            priority: "meta",
            cell: (row) => POPUP_DEVICE_LABELS[row.device],
          },
          {
            key: "schedule",
            header: "Schedule",
            priority: "meta",
            cell: (row) => <span className="text-caption">{schedule(row)}</span>,
          },
          {
            key: "active",
            header: "Active",
            cell: (row) => (
              <PopupActiveSwitch id={row.id} active={row.active} name={row.name} canPublish={canPublish} />
            ),
          },
          {
            key: "updatedAt",
            header: "Updated",
            priority: "meta",
            cell: (row) => dateFormatter.format(row.updatedAt),
          },
          {
            key: "actions",
            header: "Actions",
            align: "right",
            cell: (row) => (
              <div className="flex justify-end">
                <PopupRowActions
                  id={row.id}
                  name={row.name}
                  canEdit={canEdit}
                  canCreate={canCreate}
                  canDelete={canDelete}
                />
              </div>
            ),
          },
        ]}
      />
    </AdminPage>
  );
}
