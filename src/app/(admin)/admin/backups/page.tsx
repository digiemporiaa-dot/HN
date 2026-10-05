import type { Metadata } from "next";
import Link from "next/link";
import { Download, RotateCcw } from "lucide-react";

import {
  Badge,
  buttonStyles,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  type BadgeTone,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import type { BackupKind, BackupStatus } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { getSettings } from "@/server/settings/service";
import { backupConfigured } from "@/server/backups/paths";
import { backupVolumeSpace } from "@/server/backups/service";
import { formatBytes } from "@/lib/backups/format";
import { readPageParam } from "@/lib/utils/query";
import {
  CreateBackupForm,
  DeleteBackupButton,
  UploadBackupForm,
} from "./backup-forms";

export const metadata: Metadata = {
  title: "Backups",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 25;

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

const KIND_LABELS: Record<BackupKind, string> = {
  MANUAL: "Manual",
  SCHEDULED: "Scheduled",
  PRE_RESTORE: "Before a restore",
  UPLOADED: "Uploaded",
};

const STATUS: Record<BackupStatus, { label: string; tone: BadgeTone }> = {
  RUNNING: { label: "Running", tone: "info" },
  COMPLETED: { label: "Complete", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
};

function scheduleSummary(values: Record<string, string | null>): string {
  const schedule = values["backups.schedule"] ?? "daily";
  if (schedule === "off") return "Scheduled backups are off.";
  const hour = Number(values["backups.hour"] ?? "2");
  const time = `${String(hour).padStart(2, "0")}:00 India time`;
  const keep = values["backups.keep"] ?? "14";
  return `${schedule === "weekly" ? "Every Sunday" : "Every day"} at ${time}; the newest ${keep} scheduled backups are kept.`;
}

type Row = {
  id: string;
  filename: string;
  kind: BackupKind;
  status: BackupStatus;
  sizeBytes: bigint | null;
  note: string | null;
  error: string | null;
  createdByName: string | null;
  startedAt: Date;
  restoredAt: Date | null;
};

/**
 * Backups of the whole site — database and uploaded files in one archive.
 *
 * Archives live on the backup volume and are only reachable through this
 * screen's authorised download. Restoring is a separate page that asks for a
 * password and a typed confirmation.
 */
export default async function BackupsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("BACKUPS", "VIEW");
  const { can } = await currentPermissions();
  const canCreate = can("BACKUPS", "CREATE");
  const canDelete = can("BACKUPS", "DELETE");
  const canRestore = can("BACKUPS", "RESTORE");
  const canExport = can("BACKUPS", "EXPORT");
  const canSettings = can("SETTINGS", "MANAGE_SETTINGS");

  const params = await searchParams;
  const page = readPageParam(params.page);
  const configured = backupConfigured();

  const [total, rows, space, settings] = await Promise.all([
    prisma.backup.count(),
    prisma.backup.findMany({
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        filename: true,
        kind: true,
        status: true,
        sizeBytes: true,
        note: true,
        error: true,
        createdByName: true,
        startedAt: true,
        restoredAt: true,
      },
    }),
    configured ? backupVolumeSpace() : Promise.resolve(null),
    getSettings(),
  ]);

  return (
    <AdminPage>
      <AdminPageHeader
        title="Backups"
        description="Each backup is one archive holding the whole database and every uploaded file. Download copies regularly and keep them somewhere other than this server."
      />

      {!configured ? (
        <div
          role="alert"
          className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm rounded-md border p-3.5"
        >
          BACKUP_ROOT is not set on this server, so backups cannot be taken. See
          DEPLOYMENT.md, “Persistent volumes”.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle as="h2">Schedule</CardTitle>
            <CardDescription>{scheduleSummary(settings)}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {space ? (
              <p className="text-body-sm text-ink-muted">
                Free space on the backup volume:{" "}
                <span className="text-ink font-medium">
                  {formatBytes(space.free)}
                </span>{" "}
                of {formatBytes(space.total)}.
              </p>
            ) : null}
            {canSettings ? (
              <div>
                <Link
                  href="/admin/settings?group=backups"
                  className={buttonStyles({ variant: "outline", size: "sm" })}
                >
                  Change schedule
                </Link>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {canCreate && configured ? (
          <Card>
            <CardHeader>
              <CardTitle as="h2">Back up now</CardTitle>
              <CardDescription>
                Takes a consistent copy while the site keeps running.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreateBackupForm />
            </CardContent>
          </Card>
        ) : null}
      </div>

      <DataTable<Row>
        rows={rows}
        rowId={(row) => row.id}
        rowLabel={(row) => row.filename}
        basePath="/admin/backups"
        searchParams={params}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        entityLabel="backup"
        emptyState={
          <EmptyState
            title="No backups yet"
            description={
              canCreate
                ? "Take the first one with “Back up now”, or wait for the schedule."
                : "Backups appear here once the schedule runs."
            }
          />
        }
        columns={[
          {
            key: "startedAt",
            header: "Taken",
            priority: "primary",
            cell: (row) => (
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-body-sm text-ink font-medium">
                  {dateFormatter.format(row.startedAt)}
                </span>
                <span className="text-caption text-ink-muted break-all">
                  {row.filename}
                </span>
                {row.note ? (
                  <span className="text-caption text-ink-muted">
                    {row.note}
                  </span>
                ) : null}
                {row.status === "FAILED" && row.error ? (
                  <span className="text-caption text-danger-700">
                    {row.error}
                  </span>
                ) : null}
                {row.restoredAt ? (
                  <span className="text-caption text-ink-muted">
                    Restored {dateFormatter.format(row.restoredAt)}
                  </span>
                ) : null}
              </div>
            ),
          },
          {
            key: "kind",
            header: "Type",
            cell: (row) => (
              <div className="flex flex-col gap-0.5">
                <span>{KIND_LABELS[row.kind]}</span>
                {row.createdByName ? (
                  <span className="text-caption text-ink-muted">
                    by {row.createdByName}
                  </span>
                ) : null}
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            cell: (row) => (
              <Badge tone={STATUS[row.status].tone}>
                {STATUS[row.status].label}
              </Badge>
            ),
          },
          {
            key: "size",
            header: "Size",
            priority: "meta",
            align: "right",
            cellClassName: "whitespace-nowrap",
            cell: (row) =>
              row.sizeBytes !== null ? formatBytes(Number(row.sizeBytes)) : "—",
          },
          {
            key: "actions",
            header: "",
            cell: (row) => (
              <div className="flex flex-wrap items-center justify-end gap-2">
                {row.status === "COMPLETED" && canExport ? (
                  <a
                    href={`/api/admin/backups/${row.id}`}
                    className={buttonStyles({ variant: "outline", size: "sm" })}
                    download
                  >
                    <Download aria-hidden="true" className="size-4" />
                    Download
                  </a>
                ) : null}
                {row.status === "COMPLETED" && canRestore ? (
                  <Link
                    href={`/admin/backups/${row.id}/restore`}
                    className={buttonStyles({ variant: "outline", size: "sm" })}
                  >
                    <RotateCcw aria-hidden="true" className="size-4" />
                    Restore…
                  </Link>
                ) : null}
                {row.status !== "RUNNING" && canDelete ? (
                  <DeleteBackupButton id={row.id} filename={row.filename} />
                ) : null}
              </div>
            ),
          },
        ]}
      />

      {canRestore && configured ? (
        <Card>
          <CardHeader>
            <CardTitle as="h2">Upload an archive</CardTitle>
            <CardDescription>
              To move the site to this server, or to restore from a copy kept
              elsewhere. The archive is checked and added to the list; nothing
              changes until you restore it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadBackupForm />
          </CardContent>
        </Card>
      ) : null}
    </AdminPage>
  );
}
