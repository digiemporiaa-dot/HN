import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import { csvDocument } from "@/lib/utils/csv";

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
  "Priority",
  "Product",
  "Category",
  "City page",
  "Products requested",
  "Landing page",
  "UTM source",
  "UTM medium",
  "UTM campaign",
  "UTM term",
  "UTM content",
  "Owner",
  "Message",
  "Notes",
  "Consent given",
] as const;

/**
 * Exports enquiries as CSV.
 *
 * Three things are deliberately absent. Internal comments never leave the team:
 * the column carries the notes about the conversation with the customer and
 * nothing a colleague wrote to a colleague about them, which is the whole
 * distinction between the two and would be worth nothing if an export ignored
 * it. The IP address and user agent are kept
 * for investigating abuse and do not leave the system — an export lands in a
 * spreadsheet on somebody's laptop, and that is not where a visitor's address
 * should end up. And every value is escaped for the spreadsheet as well as for
 * CSV: a cell beginning with =, +, - or @ is a formula to Excel, and enquiry
 * text is written by strangers.
 */
export async function GET(request: Request) {
  const actor = await requirePermission("LEADS", "EXPORT");

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const source = url.searchParams.get("source");
  const priority = url.searchParams.get("priority");

  const leads = await prisma.lead.findMany({
    where: {
      deletedAt: null,
      ...(status ? { status: status as never } : {}),
      ...(source ? { source: source as never } : {}),
      ...(priority ? { priority: priority as never } : {}),
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
      priority: true,
      productName: true,
      categoryName: true,
      landingCityName: true,
      landingPage: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      utmTerm: true,
      utmContent: true,
      items: {
        orderBy: { order: "asc" },
        select: {
          productName: true,
          modelNumber: true,
          quantity: true,
          notes: true,
        },
      },
      message: true,
      // Notes only. An internal comment is not part of the customer record and
      // is filtered in the query rather than after it, so no later edit to the
      // mapping below can let one through.
      notes: {
        where: { kind: "NOTE" },
        orderBy: { createdAt: "asc" },
        select: { authorName: true, body: true, createdAt: true },
      },
      consentedAt: true,
      assignedTo: { select: { name: true } },
    },
  });

  const rows = leads.map((lead) => [
    lead.reference,
    lead.createdAt,
    lead.status,
    lead.source,
    lead.name,
    lead.email,
    lead.phone,
    lead.organisation,
    lead.city,
    lead.priority,
    lead.productName,
    lead.categoryName,
    lead.landingCityName,
    // A quotation request's whole list in one cell, one line per product, so
    // a row still reads as a row in a spreadsheet.
    lead.items
      .map(
        (item) =>
          `${item.quantity} x ${item.productName}` +
          (item.modelNumber ? ` (${item.modelNumber})` : "") +
          (item.notes ? ` - ${item.notes.replace(/\s+/g, " ")}` : ""),
      )
      .join("\n"),
    lead.landingPage,
    lead.utmSource,
    lead.utmMedium,
    lead.utmCampaign,
    lead.utmTerm,
    lead.utmContent,
    lead.assignedTo?.name ?? "",
    lead.message,
    lead.notes
      .map(
        (note) =>
          `${note.createdAt.toISOString().slice(0, 10)} ${note.authorName}: ${note.body.replace(/\s+/g, " ")}`,
      )
      .join("\n"),
    lead.consentedAt,
  ]);

  const body = csvDocument(COLUMNS, rows);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "LEADS_EXPORTED",
    module: "LEADS",
    summary: `Exported ${leads.length} enquir${leads.length === 1 ? "y" : "ies"}`,
    metadata: { status, source, priority, count: leads.length },
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
