import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { LEAD_STATUSES } from "@/lib/validation/leads";

const STATUS_VALUES = new Set<string>(LEAD_STATUSES.map((s) => s.value));

/** Badge colours for a request's stage, matching the Leads screen. */
export const RFQ_STATUS_TONE: Record<
  string,
  "neutral" | "info" | "success" | "warning" | "danger"
> = {
  NEW: "info",
  CONTACTED: "neutral",
  QUALIFIED: "neutral",
  QUOTATION_SENT: "warning",
  NEGOTIATION: "warning",
  WON: "success",
  LOST: "danger",
};

export type RfqFilters = {
  q?: string;
  status?: string;
  owner?: "mine" | "none";
};

function single(value: string | string[] | undefined): string | undefined {
  const text = (Array.isArray(value) ? value[0] : value)?.trim();
  return text ? text.slice(0, 200) : undefined;
}

export function readRfqFilters(
  params: Record<string, string | string[] | undefined>,
): RfqFilters {
  const status = single(params.status);
  const owner = single(params.owner);
  return {
    q: single(params.q),
    status: status && STATUS_VALUES.has(status) ? status : undefined,
    owner: owner === "mine" || owner === "none" ? owner : undefined,
  };
}

/**
 * Quotation requests are leads from the basket. The same filters serve the
 * screen and its export, so what is exported is what was on screen.
 */
export function rfqWhere(
  filters: RfqFilters,
  viewerId: string,
): Prisma.LeadWhereInput {
  return {
    source: "RFQ",
    deletedAt: null,
    ...(filters.status
      ? { status: filters.status as Prisma.LeadWhereInput["status"] }
      : {}),
    ...(filters.owner === "none" ? { assignedToId: null } : {}),
    ...(filters.owner === "mine" ? { assignedToId: viewerId } : {}),
    ...(filters.q
      ? {
          OR: [
            { reference: { contains: filters.q, mode: "insensitive" } },
            { name: { contains: filters.q, mode: "insensitive" } },
            { email: { contains: filters.q, mode: "insensitive" } },
            { organisation: { contains: filters.q, mode: "insensitive" } },
            {
              items: {
                some: {
                  OR: [
                    {
                      productName: { contains: filters.q, mode: "insensitive" },
                    },
                    {
                      modelNumber: { contains: filters.q, mode: "insensitive" },
                    },
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
export async function mostRequestedProducts(
  days: number,
  limit = 10,
): Promise<RequestedProduct[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const groups = await prisma.rfqItem.groupBy({
    by: ["productName", "productId"],
    where: {
      lead: { deletedAt: null, source: "RFQ", createdAt: { gte: since } },
    },
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
