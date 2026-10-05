import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { auditWhere, readAuditFilters } from "@/server/audit/query";
import { requirePermission } from "@/server/permissions";
import { clientIpFrom } from "@/server/http/client";
import { csvDocument } from "@/lib/utils/csv";

const LIMIT = 50_000;

const COLUMNS = [
  "Time (UTC)",
  "Event",
  "Area",
  "Actor email",
  "Summary",
  "Record type",
  "Record id",
  "IP address",
  "Browser",
  "Details",
  "Entry id",
] as const;

/**
 * The audit log as CSV, with the screen's filters. For investigations and
 * compliance requests; exporting the log is itself logged.
 */
export async function GET(request: Request) {
  const actor = await requirePermission("AUDIT_LOGS", "EXPORT");

  const url = new URL(request.url);
  const filters = readAuditFilters(Object.fromEntries(url.searchParams));

  const entries = await prisma.auditLog.findMany({
    where: auditWhere(filters),
    orderBy: { createdAt: "desc" },
    take: LIMIT,
    select: {
      id: true,
      createdAt: true,
      action: true,
      module: true,
      actorEmail: true,
      summary: true,
      entityType: true,
      entityId: true,
      ipAddress: true,
      userAgent: true,
      metadata: true,
    },
  });

  const body = csvDocument(
    COLUMNS,
    entries.map((entry) => [
      entry.createdAt,
      entry.action,
      entry.module ?? "",
      entry.actorEmail ?? "",
      entry.summary ?? "",
      entry.entityType ?? "",
      entry.entityId ?? "",
      entry.ipAddress ?? "",
      entry.userAgent ?? "",
      entry.metadata ? JSON.stringify(entry.metadata) : "",
      entry.id,
    ]),
  );

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "AUDIT_LOG_EXPORTED",
    module: "AUDIT_LOGS",
    summary: `Exported ${entries.length} audit entr${entries.length === 1 ? "y" : "ies"}`,
    metadata: { ...filters, count: entries.length },
    ipAddress: clientIpFrom(request.headers),
    userAgent: request.headers.get("user-agent"),
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-log-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
