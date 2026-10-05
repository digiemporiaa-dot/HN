import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { formatBytes } from "@/lib/backups/format";
import { prisma } from "@/server/db";
import { requirePermission } from "@/server/permissions";
import { compatibility, type BackupManifest } from "@/server/backups/service";
import { RestoreForm } from "./restore-form";

export const metadata: Metadata = {
  title: "Restore backup",
  robots: { index: false, follow: false },
};

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

function isManifest(value: unknown): value is BackupManifest {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as BackupManifest).migrations) &&
    typeof (value as BackupManifest).tables === "object"
  );
}

export default async function RestoreBackupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("BACKUPS", "RESTORE");
  const { id } = await params;

  const backup = await prisma.backup.findUnique({
    where: { id },
    select: {
      id: true,
      filename: true,
      status: true,
      sizeBytes: true,
      manifest: true,
      startedAt: true,
    },
  });
  if (
    !backup ||
    backup.status !== "COMPLETED" ||
    !isManifest(backup.manifest)
  ) {
    notFound();
  }

  const manifest = backup.manifest;
  const { ok, missing } = await compatibility(manifest);
  const rows = Object.values(manifest.tables).reduce(
    (sum, count) => sum + count,
    0,
  );
  const count = (table: string) => manifest.tables[table] ?? 0;

  return (
    <AdminPage>
      <AdminPageHeader
        title="Restore backup"
        description={backup.filename}
        backHref="/admin/backups"
        backLabel="Back to backups"
      />

      <Card>
        <CardHeader>
          <CardTitle as="h2">What this backup contains</CardTitle>
          <CardDescription>
            Made {dateFormatter.format(new Date(manifest.createdAt))}
            {backup.sizeBytes !== null
              ? ` · ${formatBytes(Number(backup.sizeBytes))}`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="text-body-sm grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
            {[
              ["Products", count("Product")],
              ["Categories", count("Category")],
              ["Pages", count("Page")],
              ["Enquiries", count("Lead")],
              ["Staff accounts", count("Staff")],
              ["Media items", count("MediaAsset")],
              ["Database rows", rows],
              ["Uploaded files", manifest.uploads.files],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col">
                <dt className="text-ink-muted">{label}</dt>
                <dd className="text-ink font-medium">
                  {Number(value).toLocaleString("en-IN")}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {!ok ? (
        <div
          role="alert"
          className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm rounded-md border p-3.5"
        >
          This backup was made by a newer version of the application (
          {missing.length} database migration
          {missing.length === 1 ? "" : "s"} not applied here). Deploy that
          version first; it cannot be restored into this one.
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle as="h2">Restore</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="border-warning-100 bg-warning-50 text-warning-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3.5">
              <AlertTriangle
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />
              <div className="flex flex-col gap-1.5">
                <p>
                  <strong>The whole site is replaced</strong> with this backup:
                  every product, page, enquiry, setting, staff account and
                  uploaded file. Anything added or changed since it was made is
                  removed.
                </p>
                <p>
                  A backup of the site as it is now is taken first, so the
                  restore can be undone from the Backups list. The audit log is
                  not rolled back: what happened since stays on record.
                </p>
                <p>
                  <strong>Everyone is signed out</strong>, you included. Staff
                  sign in again with the password they had when the backup was
                  made; accounts created since then no longer exist.
                </p>
              </div>
            </div>
            <RestoreForm id={backup.id} />
          </CardContent>
        </Card>
      )}
    </AdminPage>
  );
}
