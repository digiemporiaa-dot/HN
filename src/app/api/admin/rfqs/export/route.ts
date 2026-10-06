import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { clientIpFrom } from "@/server/http/client";
import { requirePermission } from "@/server/permissions";
import { readRfqFilters, rfqWhere } from "@/server/rfq/admin";
import { LEAD_STATUSES } from "@/lib/validation/leads";
import { csvDocument } from "@/lib/utils/csv";

const COLUMNS = [
  "Reference",
  "Received",
  "Status",
  "Name",
  "Organisation",
  "Email",
  "Phone",
  "City",
  "Owner",
  "Product",
  "Model",
  "Quantity",
  "Item notes",
] as const;

/**
 * Quotation requests as CSV, one row per product requested — the shape a
 * pricing spreadsheet wants. Like the enquiry export, it carries no internal
 * comments and no visitor IP addresses, and every cell is formula-safe.
 */
export async function GET(request: Request) {
  const actor = await requirePermission("RFQ", "EXPORT");

  const filters = readRfqFilters(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  const rfqs = await prisma.lead.findMany({
    where: rfqWhere(filters, actor.id),
    orderBy: { createdAt: "desc" },
    take: 10_000,
    select: {
      reference: true,
      createdAt: true,
      status: true,
      name: true,
      organisation: true,
      email: true,
      phone: true,
      city: true,
      assignedTo: { select: { name: true } },
      items: {
        orderBy: { order: "asc" },
        select: {
          productName: true,
          modelNumber: true,
          quantity: true,
          notes: true,
        },
      },
    },
  });

  const rows = rfqs.flatMap((rfq) =>
    rfq.items.map((item) => [
      rfq.reference,
      rfq.createdAt,
      LEAD_STATUSES.find((s) => s.value === rfq.status)?.label ?? rfq.status,
      rfq.name,
      rfq.organisation ?? "",
      rfq.email,
      rfq.phone ?? "",
      rfq.city ?? "",
      rfq.assignedTo?.name ?? "",
      item.productName,
      item.modelNumber ?? "",
      item.quantity,
      item.notes?.replace(/\s+/g, " ") ?? "",
    ]),
  );

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "RFQS_EXPORTED",
    module: "RFQ",
    summary: `Exported ${rfqs.length} quotation request${rfqs.length === 1 ? "" : "s"} (${rows.length} lines)`,
    metadata: { ...filters, requests: rfqs.length, lines: rows.length },
    ipAddress: clientIpFrom(request.headers),
    userAgent: request.headers.get("user-agent"),
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csvDocument(COLUMNS, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="quotation-requests-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
