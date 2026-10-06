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
import { LEAD_STATUSES } from "@/lib/validation/leads";
import { RFQ_STATUS_TONE } from "@/server/rfq/admin";

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
 * One quotation request, laid out for pricing it: who is asking, and the list.
 * Stage, notes and assignment live on the lead, where the rest of the sales
 * work happens.
 */
export default async function RfqPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("RFQ", "VIEW");
  const { can } = await currentPermissions();
  const { id } = await params;

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
      status: true,
      createdAt: true,
      assignedTo: { select: { name: true } },
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

  const units = rfq.items.reduce((sum, item) => sum + item.quantity, 0);
  const status =
    LEAD_STATUSES.find((s) => s.value === rfq.status)?.label ?? rfq.status;

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
    ["City", rfq.city ?? "—"],
    ["Received", dateFormatter.format(rfq.createdAt)],
    ["Owner", rfq.assignedTo?.name ?? "Unassigned"],
  ];

  return (
    <AdminPage>
      <AdminPageHeader
        title={`Quotation request ${rfq.reference}`}
        description={`${rfq.items.length} ${rfq.items.length === 1 ? "product" : "products"}, ${units} ${units === 1 ? "unit" : "units"}`}
        backHref="/admin/rfqs"
        backLabel="Back to RFQs"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={RFQ_STATUS_TONE[rfq.status] ?? "neutral"}>
              {status}
            </Badge>
            {can("LEADS", "VIEW") ? (
              <Link
                href={`/admin/leads/${rfq.id}`}
                className={buttonStyles({ size: "sm" })}
              >
                Work on this in Leads
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
            <dl className="text-body-sm grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2.5">
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
            <CardTitle as="h2">Message</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-body-sm text-ink break-words whitespace-pre-line">
              {rfq.message || "No message."}
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminPage>
  );
}
