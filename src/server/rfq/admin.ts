import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { parseIsoDate, parseIstDateTime } from "@/lib/dates/ist";
import { quoteStatusSchema, type QuoteStatus } from "@/lib/quotes/status";

/**
 * Quotation requests: leads whose source is RFQ, with their quotation row.
 * The same filters serve the screen and its export, so what is exported is
 * what was on screen. Every filter is parsed here; nothing from the address
 * bar reaches a query unchecked.
 */
export type RfqFilters = {
  q?: string;
  status?: QuoteStatus;
  /** "mine", "none" or a staff id. */
  owner?: string;
  product?: string;
  from?: string;
  to?: string;
};

function single(value: string | string[] | undefined): string | undefined {
  const text = (Array.isArray(value) ? value[0] : value)?.trim();
  return text ? text.slice(0, 200) : undefined;
}

const ID = /^[a-z0-9]{8,40}$/i;

export function readRfqFilters(params: Record<string, string | string[] | undefined>): RfqFilters {
  const status = quoteStatusSchema.safeParse(single(params.status));
  const owner = single(params.owner);
  const product = single(params.product);
  const from = single(params.from);
  const to = single(params.to);
  return {
    q: single(params.q),
    status: status.success ? status.data : undefined,
    owner: owner === "mine" || owner === "none" || (owner && ID.test(owner)) ? owner : undefined,
    product: product && ID.test(product) ? product : undefined,
    from: from && parseIsoDate(from) ? from : undefined,
    to: to && parseIsoDate(to) ? to : undefined,
  };
}

export function rfqWhere(filters: RfqFilters, viewerId: string): Prisma.LeadWhereInput {
  // Whole days in India, as the date filter shows them.
  const from = filters.from ? parseIstDateTime(`${filters.from}T00:00`) : null;
  const toStart = filters.to ? parseIstDateTime(`${filters.to}T00:00`) : null;
  const q = filters.q;

  return {
    source: "RFQ",
    deletedAt: null,
    ...(filters.status
      ? {
          // Every request has a quotation row: new ones are created with it,
          // older ones were given one by the migration.
          quote: { is: { status: filters.status } },
        }
      : {}),
    ...(filters.owner === "none"
      ? { assignedToId: null }
      : filters.owner === "mine"
        ? { assignedToId: viewerId }
        : filters.owner
          ? { assignedToId: filters.owner }
          : {}),
    ...(filters.product ? { items: { some: { productId: filters.product } } } : {}),
    ...(from || toStart
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(toStart ? { lt: new Date(toStart.getTime() + 86_400_000) } : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { reference: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { organisation: { contains: q, mode: "insensitive" } },
            {
              items: {
                some: {
                  OR: [
                    { productName: { contains: q, mode: "insensitive" } },
                    { modelNumber: { contains: q, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };
}

export type RequestedProduct = {
  productId: string | null;
  productName: string;
  requests: number;
  units: number;
};

/**
 * Which products are asked about most, by the number of requests and units,
 * over a recent window. Grouped by the name as requested: a product renamed
 * or withdrawn since still counts under what the customer asked for.
 */
export async function mostRequestedProducts(days: number, limit = 10): Promise<RequestedProduct[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const groups = await prisma.rfqItem.groupBy({
    by: ["productName", "productId"],
    where: { lead: { deletedAt: null, source: "RFQ", createdAt: { gte: since } } },
    _count: { _all: true },
    _sum: { quantity: true },
    orderBy: [{ _count: { productName: "desc" } }, { productName: "asc" }],
    take: limit,
  });
  return groups.map((group) => ({
    productId: group.productId,
    productName: group.productName,
    requests: group._count._all,
    units: group._sum.quantity ?? 0,
  }));
}

/** Products that appear on at least one request, for the product filter. */
export async function requestedProductChoices() {
  const rows = await prisma.rfqItem.findMany({
    where: { productId: { not: null }, lead: { deletedAt: null, source: "RFQ" } },
    distinct: ["productId"],
    orderBy: { productName: "asc" },
    take: 300,
    select: { productId: true, productName: true },
  });
  return rows.flatMap((row) => (row.productId ? [{ value: row.productId, label: row.productName }] : []));
}
