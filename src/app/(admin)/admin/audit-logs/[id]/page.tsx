import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { prisma } from "@/server/db";
import { requirePermission } from "@/server/permissions";
import { MODULE_LABELS } from "@/server/permissions/catalogue";
import { actionLabel } from "@/server/audit/query";

export const metadata: Metadata = {
  title: "Audit entry",
  robots: { index: false, follow: false },
};

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "full",
  timeStyle: "long",
  timeZone: "Asia/Kolkata",
});

export default async function AuditEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("AUDIT_LOGS", "VIEW");
  const { id } = await params;

  const entry = await prisma.auditLog.findUnique({
    where: { id },
    select: {
      id: true,
      createdAt: true,
      action: true,
      module: true,
      summary: true,
      actorEmail: true,
      actor: { select: { name: true } },
      entityType: true,
      entityId: true,
      ipAddress: true,
      userAgent: true,
      metadata: true,
    },
  });
  if (!entry) notFound();

  const facts: Array<[string, string]> = [
    ["When", dateFormatter.format(entry.createdAt)],
    [
      "By",
      entry.actorEmail
        ? `${entry.actor?.name ? `${entry.actor.name} · ` : ""}${entry.actorEmail}`
        : "System",
    ],
    ["Area", entry.module ? MODULE_LABELS[entry.module] : "—"],
    [
      "Record",
      entry.entityType
        ? `${entry.entityType}${entry.entityId ? ` ${entry.entityId}` : ""}`
        : "—",
    ],
    ["IP address", entry.ipAddress ?? "—"],
    ["Browser", entry.userAgent ?? "—"],
    ["Entry id", entry.id],
  ];

  return (
    <AdminPage>
      <AdminPageHeader
        title={actionLabel(entry.action)}
        description={entry.summary ?? undefined}
        backHref="/admin/audit-logs"
        backLabel="Back to audit log"
      />

      <Card>
        <CardContent>
          <dl className="text-body-sm grid gap-x-6 gap-y-3 sm:grid-cols-[10rem_1fr]">
            {facts.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-ink-muted">{label}</dt>
                <dd className="text-ink break-all">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {entry.metadata ? (
        <Card>
          <CardHeader>
            <CardTitle as="h2">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-surface-muted text-ink overflow-x-auto rounded-md p-4 font-mono text-xs leading-relaxed">
              {JSON.stringify(entry.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </AdminPage>
  );
}
