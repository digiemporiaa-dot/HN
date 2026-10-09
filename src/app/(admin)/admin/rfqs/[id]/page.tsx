import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import {
  Badge,
  buttonStyles,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { LEAD_SOURCE_LABELS } from "@/lib/validation/leads";
import { quoteStatusLabel, quoteStatusTone } from "@/lib/quotes/status";
import { placementById } from "@/lib/cta/placements";
import { assignableStaff } from "@/server/leads/service";
import { QuoteAssignForm, QuoteNoteForm, QuoteStatusForm } from "./quote-manage-forms";

export const metadata: Metadata = {
  title: "Quotation request",
  robots: { index: false, follow: false },
};

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

/**
 * One quotation request, laid out for pricing it: who is asking, the list,
 * and the quotation's own status, owner and internal notes. The full lead
 * (stage, priority, customer notes) stays one click away in Leads.
 */
export default async function RfqPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("RFQ", "VIEW");
  const { can } = await currentPermissions();
  const { id } = await params;
  // An id that is not even shaped like one is not looked up.
  if (!/^[a-z0-9]{8,40}$/i.test(id)) notFound();

  const rfq = await prisma.lead.findFirst({
    where: { id, source: "RFQ", deletedAt: null },
    select: {
      id: true,
      reference: true,
      name: true,
      email: true,
      phone: true,
      organisation: true,
      city: true,
      message: true,
      country: true,
      landingPage: true,
      ctaKey: true,
      ctaPlacement: true,
      consentedAt: true,
      createdAt: true,
      assignedToId: true,
      assignedTo: { select: { name: true } },
      quote: { select: { status: true, deliveryLocation: true, expectedDeliveryDate: true, statusChangedAt: true } },
      notes: {
        where: { kind: "INTERNAL" },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, body: true, authorName: true, createdAt: true },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { id: true, summary: true, actorName: true, createdAt: true },
      },
      items: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          productId: true,
          productName: true,
          modelNumber: true,
          quantity: true,
          notes: true,
          product: { select: { slug: true, status: true, deletedAt: true } },
        },
      },
    },
  });
  if (!rfq) notFound();
  const staff = can("RFQ", "ASSIGN") ? await assignableStaff() : [];

  const units = rfq.items.reduce((sum, item) => sum + item.quantity, 0);
  const quoteStatus = rfq.quote?.status ?? "NEW";
  const status = quoteStatusLabel(quoteStatus);
  const dayFormatter = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" });

  const facts: Array<[string, React.ReactNode]> = [
    ["Name", rfq.name],
    ["Organisation", rfq.organisation ?? "—"],
    [
      "Email",
      <a key="email" href={`mailto:${rfq.email}`} className="hover:underline">
        {rfq.email}
      </a>,
    ],
    [
      "Phone",
      rfq.phone ? (
        <a key="phone" href={`tel:${rfq.phone}`} className="hover:underline">
          {rfq.phone}
        </a>
      ) : (
        "—"
      ),
    ],
    ["Country", rfq.country ?? "—"],
    ["Delivery location", rfq.quote?.deliveryLocation ?? rfq.city ?? "—"],
    [
      "Expected delivery",
      rfq.quote?.expectedDeliveryDate ? dayFormatter.format(rfq.quote.expectedDeliveryDate) : "—",
    ],
    ["Received", dateFormatter.format(rfq.createdAt)],
    ["Owner", rfq.assignedTo?.name ?? "Unassigned"],
    ["Consent", rfq.consentedAt ? `Given ${dateFormatter.format(rfq.consentedAt)}` : "—"],
  ];

  const placement = rfq.ctaPlacement ? placementById(rfq.ctaPlacement) : undefined;
  const attribution: Array<[string, string]> = [
    ["Source", LEAD_SOURCE_LABELS.RFQ],
    ["Sent from", rfq.landingPage ?? "—"],
    ["Button", placement?.label ?? rfq.ctaPlacement ?? "—"],
    ["Popup configuration", rfq.ctaKey ?? "Built-in"],
  ];

  return (
    <AdminPage>
      <AdminPageHeader
        title={`Quotation request ${rfq.reference}`}
        description={`${rfq.items.length} ${rfq.items.length === 1 ? "product" : "products"}, ${units} ${units === 1 ? "unit" : "units"}`}
        backHref="/admin/rfqs"
        backLabel="Back to quotations"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={quoteStatusTone(quoteStatus)}>{status}</Badge>
            {can("LEADS", "VIEW") ? (
              <Link
                href={`/admin/leads/${rfq.id}`}
                className={buttonStyles({ size: "sm" })}
              >
                Open the lead
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            ) : null}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle as="h2">Products requested</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Phones: one block per line, so the customer's notes are not
              pushed off the side of the screen. */}
          <ul className="flex flex-col sm:hidden">
            {rfq.items.map((item) => (
              <li
                key={item.id}
                className="border-line text-body-sm flex flex-col gap-1 border-b py-3 last:border-0"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-ink font-medium break-words">
                    {item.productName}
                  </span>
                  <span className="text-ink shrink-0 font-medium tabular-nums">
                    × {item.quantity}
                  </span>
                </div>
                {item.modelNumber ? (
                  <span className="text-ink-muted">
                    Model {item.modelNumber}
                  </span>
                ) : null}
                {item.notes ? (
                  <span className="text-ink-muted break-words whitespace-pre-line">
                    {item.notes}
                  </span>
                ) : null}
              </li>
            ))}
            <li className="text-body-sm flex justify-between pt-3">
              <span className="text-ink-muted">Total</span>
              <span className="text-ink font-medium tabular-nums">{units}</span>
            </li>
          </ul>
          <table className="text-body-sm hidden w-full border-collapse sm:table">
            <thead>
              <tr className="border-line text-ink-muted border-b text-left">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Product
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Model
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  Quantity
                </th>
                <th scope="col" className="py-2 font-medium">
                  Notes from the customer
                </th>
              </tr>
            </thead>
            <tbody>
              {rfq.items.map((item) => (
                <tr key={item.id} className="border-line border-b align-top">
                  <td className="py-2.5 pr-4">
                    {item.productId && can("PRODUCTS", "VIEW") ? (
                      <Link
                        href={`/admin/products/${item.productId}`}
                        className="text-ink font-medium hover:underline"
                      >
                        {item.productName}
                      </Link>
                    ) : (
                      <span className="text-ink font-medium">
                        {item.productName}
                      </span>
                    )}
                    {!item.product || item.product.deletedAt ? (
                      <span className="text-caption text-ink-muted block">
                        No longer in the catalogue
                      </span>
                    ) : item.product.status !== "PUBLISHED" ? (
                      <span className="text-caption text-ink-muted block">
                        Not published at the moment
                      </span>
                    ) : null}
                  </td>
                  <td className="text-ink-muted py-2.5 pr-4">
                    {item.modelNumber ?? "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {item.quantity}
                  </td>
                  <td className="text-ink-muted py-2.5 break-words whitespace-pre-line">
                    {item.notes ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="text-ink-muted py-2.5 pr-4">
                  Total
                </td>
                <td className="text-ink py-2.5 pr-4 text-right font-medium tabular-nums">
                  {units}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle as="h2">Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="text-body-sm grid grid-cols-[8rem_minmax(0,1fr)] gap-x-4 gap-y-2.5">
              {facts.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-ink-muted">{label}</dt>
                  <dd className="text-ink break-words">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2">Additional requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-body-sm text-ink break-words whitespace-pre-line">
              {rfq.message || "None given."}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle as="h2">Manage</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <QuoteStatusForm leadId={rfq.id} status={quoteStatus} disabled={!can("RFQ", "EDIT")} />
            {can("RFQ", "ASSIGN") ? (
              <QuoteAssignForm leadId={rfq.id} assignedToId={rfq.assignedToId} staff={staff} />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2">Where it came from</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="text-body-sm grid grid-cols-[9rem_minmax(0,1fr)] gap-x-4 gap-y-2.5">
              {attribution.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-ink-muted">{label}</dt>
                  <dd className="text-ink break-all">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle as="h2">Internal notes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {can("RFQ", "EDIT") ? <QuoteNoteForm leadId={rfq.id} /> : null}
            {rfq.notes.length === 0 ? (
              <p className="text-body-sm text-ink-muted">No internal notes yet.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {rfq.notes.map((note) => (
                  <li key={note.id} className="border-line flex flex-col gap-1 border-t pt-3">
                    <span className="text-caption text-ink-muted">
                      {note.authorName} · {dateFormatter.format(note.createdAt)}
                    </span>
                    <p className="text-body-sm text-ink break-words whitespace-pre-line">{note.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2">History</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-3">
              {rfq.activities.map((entry) => (
                <li key={entry.id} className="text-body-sm flex flex-col gap-0.5">
                  <span className="text-ink">{entry.summary}</span>
                  <span className="text-caption text-ink-muted">
                    {entry.actorName ?? "Website"} · {dateFormatter.format(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </AdminPage>
  );
}
