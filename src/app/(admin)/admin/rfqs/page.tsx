import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";

import {
  Badge,
  buttonStyles,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { TableFilter, TableSearch } from "@/components/admin/data-table-parts";
import { DateRangeFilter } from "@/components/admin/date-range-filter";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import {
  mostRequestedProducts,
  readRfqFilters,
  requestedProductChoices,
  rfqWhere,
} from "@/server/rfq/admin";
import { assignableStaff } from "@/server/leads/service";
import { QUOTE_STATUSES, quoteStatusLabel, quoteStatusTone } from "@/lib/quotes/status";
import { buildQueryHref, readPageParam } from "@/lib/utils/query";

export const metadata: Metadata = {
  title: "Quotations",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 25;
const WINDOW_DAYS = 90;

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

type Row = {
  id: string;
  reference: string;
  name: string;
  organisation: string | null;
  city: string | null;
  phone: string | null;
  email: string;
  createdAt: Date;
  quote: { status: string } | null;
  assignedTo: { name: string } | null;
  items: Array<{ productName: string; quantity: number }>;
};

/**
 * Quotation requests: enquiries that came with a list of products. The
 * conversation itself is worked on the lead; this screen is about what was
 * asked for — the lists, and which products are in demand.
 */
export default async function RfqsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("RFQ", "VIEW");
  const { can, staff } = await currentPermissions();

  const params = await searchParams;
  const page = readPageParam(params.page);
  const filters = readRfqFilters(params);
  const where = rfqWhere(filters, staff.id);

  const [total, rows, openCount, popular, staffChoices, productChoices] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        reference: true,
        name: true,
        organisation: true,
        city: true,
        phone: true,
        email: true,
        createdAt: true,
        quote: { select: { status: true } },
        assignedTo: { select: { name: true } },
        items: {
          orderBy: { order: "asc" },
          select: { productName: true, quantity: true },
        },
      },
    }),
    prisma.lead.count({
      where: {
        source: "RFQ",
        deletedAt: null,
        quote: { is: { status: { in: QUOTE_STATUSES.filter((s) => s.open).map((s) => s.value) } } },
      },
    }),
    mostRequestedProducts(WINDOW_DAYS),
    assignableStaff(),
    requestedProductChoices(),
  ]);

  const filtered = Object.values(filters).some(Boolean);

  return (
    <AdminPage>
      <AdminPageHeader
        title="Quotations"
        description={`Quotation requests from the website, newest first. ${openCount} still open. Nothing here is an order: a request becomes a sale only through your own process.`}
        actions={
          can("RFQ", "EXPORT") ? (
            <a
              href={buildQueryHref("/api/admin/rfqs/export", {}, filters)}
              className={buttonStyles({ variant: "outline" })}
            >
              <Download aria-hidden="true" className="size-4" />
              Export CSV
            </a>
          ) : null
        }
      />

      <DataTable<Row>
        rows={rows}
        rowId={(row) => row.id}
        rowLabel={(row) => row.reference}
        rowHref={(row) => `/admin/rfqs/${row.id}`}
        basePath="/admin/rfqs"
        searchParams={params}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        entityLabel="quotation"
        toolbar={
          <>
            <TableSearch placeholder="Search reference, customer, email, phone, company or product" />
            <TableFilter
              paramName="status"
              label="Filter by status"
              allLabel="Any status"
              options={QUOTE_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
            />
            <TableFilter
              paramName="owner"
              label="Filter by owner"
              allLabel="Anyone"
              options={[
                { value: "mine", label: "Assigned to me" },
                { value: "none", label: "Unassigned" },
                ...staffChoices.map((person) => ({ value: person.id, label: person.name })),
              ]}
            />
            {productChoices.length > 0 ? (
              <TableFilter paramName="product" label="Filter by product" allLabel="Any product" options={productChoices} />
            ) : null}
            <DateRangeFilter label="Received" />
          </>
        }
        emptyState={
          <EmptyState
            title={
              filtered ? "No matching requests" : "No quotation requests yet"
            }
            description={
              filtered
                ? "Try a different search, or clear the filters."
                : "When a visitor sends a quotation list from the website, it appears here."
            }
            action={
              filtered ? (
                <Link
                  href="/admin/rfqs"
                  className={buttonStyles({ variant: "outline" })}
                >
                  Clear filters
                </Link>
              ) : null
            }
          />
        }
        columns={[
          {
            key: "customer",
            header: "Request",
            priority: "primary",
            cell: (row) => (
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-body-sm text-ink font-medium">
                  {row.name}
                  {row.organisation ? (
                    <span className="text-ink-muted font-normal">
                      {" "}
                      · {row.organisation}
                    </span>
                  ) : null}
                </span>
                <span className="text-caption text-ink-muted break-all">
                  {row.reference} · {row.email}
                  {row.phone ? ` · ${row.phone}` : ""}
                </span>
              </div>
            ),
          },
          {
            key: "items",
            header: "Products",
            cell: (row) => {
              const units = row.items.reduce((sum, i) => sum + i.quantity, 0);
              const shown = row.items.slice(0, 2);
              return (
                <div className="flex min-w-0 flex-col gap-0.5">
                  {shown.map((item, index) => (
                    <span key={index} className="text-body-sm break-words">
                      {item.quantity} × {item.productName}
                    </span>
                  ))}
                  <span className="text-caption text-ink-muted">
                    {row.items.length > 2
                      ? `+${row.items.length - 2} more · `
                      : ""}
                    {row.items.length}{" "}
                    {row.items.length === 1 ? "product" : "products"}, {units}{" "}
                    {units === 1 ? "unit" : "units"}
                  </span>
                </div>
              );
            },
          },
          {
            key: "status",
            header: "Status",
            cell: (row) => (
              <Badge tone={quoteStatusTone(row.quote?.status ?? "NEW")}>
                {quoteStatusLabel(row.quote?.status ?? "NEW")}
              </Badge>
            ),
          },
          {
            key: "owner",
            header: "Owner",
            priority: "meta",
            cell: (row) => row.assignedTo?.name ?? "Unassigned",
          },
          {
            key: "createdAt",
            header: "Received",
            priority: "meta",
            cellClassName: "whitespace-nowrap",
            cell: (row) => dateFormatter.format(row.createdAt),
          },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle as="h2">Most requested products</CardTitle>
          <CardDescription>
            Last {WINDOW_DAYS} days, by the number of quotation requests that
            included each product.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {popular.length === 0 ? (
            <p className="text-body-sm text-ink-muted">
              Nothing requested in this period yet.
            </p>
          ) : (
            <ol className="flex flex-col">
              {popular.map((product, index) => (
                <li
                  key={`${product.productId ?? "none"}-${product.productName}`}
                  className="border-line text-body-sm flex items-baseline justify-between gap-4 border-b py-2.5 last:border-0"
                >
                  <span className="min-w-0 break-words">
                    <span className="text-ink-subtle mr-2 tabular-nums">
                      {index + 1}.
                    </span>
                    {product.productId && can("PRODUCTS", "VIEW") ? (
                      <Link
                        href={`/admin/products/${product.productId}`}
                        className="text-ink font-medium hover:underline"
                      >
                        {product.productName}
                      </Link>
                    ) : (
                      <span className="text-ink font-medium">
                        {product.productName}
                      </span>
                    )}
                  </span>
                  <span className="text-ink-muted shrink-0 tabular-nums">
                    {product.requests}{" "}
                    {product.requests === 1 ? "request" : "requests"} ·{" "}
                    {product.units} {product.units === 1 ? "unit" : "units"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </AdminPage>
  );
}
