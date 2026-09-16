import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";

/**
 * Exports enquiries as CSV.
 *
 * Two things are deliberately absent. The IP address and user agent are kept
 * for investigating abuse and do not leave the system — an export lands in a
 * spreadsheet on somebody's laptop, and that is not where a visitor's address
 * should end up. And every value is escaped for the spreadsheet as well as for
 * CSV: a cell beginning with =, +, - or @ is a formula to Excel, and enquiry
 * text is written by strangers.
 */
function csvCell(value: unknown): string {
  const text =
    value === null || value === undefined
      ? ""
      : value instanceof Date
        ? value.toISOString()
        : String(value);

  // Prefixing with an apostrophe stops a spreadsheet treating the cell as a
  // formula, which is how a CSV export becomes a way to run something on a
  // colleague's machine.
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;

  return `"${guarded.replace(/"/g, '""')}"`;
}

const COLUMNS = [
  "Reference",
  "Received",
  "Status",
  "Source",
  "Name",
  "Email",
  "Phone",
  "Organisation",
  "City",
  "Product",
  "Owner",
  "Message",
  "Consent given",
] as const;

export async function GET(request: Request) {
  const actor = await requirePermission("LEADS", "EXPORT");

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const source = url.searchParams.get("source");

  const leads = await prisma.lead.findMany({
    where: {
      deletedAt: null,
      ...(status ? { status: status as never } : {}),
      ...(source ? { source: source as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 10000,
    select: {
      reference: true,
      createdAt: true,
      status: true,
      source: true,
      name: true,
      email: true,
      phone: true,
      organisation: true,
      city: true,
      productName: true,
      message: true,
      consentedAt: true,
      assignedTo: { select: { name: true } },
    },
  });

  const rows = leads.map((lead) =>
    [
      lead.reference,
      lead.createdAt,
      lead.status,
      lead.source,
      lead.name,
      lead.email,
      lead.phone,
      lead.organisation,
      lead.city,
      lead.productName,
      lead.assignedTo?.name ?? "",
      lead.message,
      lead.consentedAt,
    ]
      .map(csvCell)
      .join(","),
  );

  const body = [COLUMNS.map(csvCell).join(","), ...rows].join("\r\n");

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "LEADS_EXPORTED",
    module: "LEADS",
    summary: `Exported ${leads.length} enquir${leads.length === 1 ? "y" : "ies"}`,
    metadata: { status, source, count: leads.length },
  });

  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    headers: {
      // The BOM makes Excel open a UTF-8 file as UTF-8 rather than guessing.
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="enquiries-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
