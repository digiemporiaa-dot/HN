import { randomBytes } from "node:crypto";

import { headers } from "next/headers";

import { prisma } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";

/** How long a download link stays usable. Long enough to find the email. */
export const GRANT_TTL_DAYS = 14;

export const LEAD_LIST_SELECT = {
  id: true,
  reference: true,
  name: true,
  email: true,
  organisation: true,
  source: true,
  status: true,
  productName: true,
  createdAt: true,
  assignedTo: { select: { id: true, name: true } },
  _count: { select: { items: true } },
} as const;

export type LeadRow = {
  id: string;
  reference: string;
  name: string;
  email: string;
  organisation: string | null;
  source: string;
  status: string;
  productName: string | null;
  createdAt: Date;
  assignedTo: { id: string; name: string } | null;
  _count: { items: number };
};

/**
 * The next reference for this year, as HN-2026-0001.
 *
 * Derived from a count rather than a database sequence, and unique at the
 * column, so two enquiries arriving in the same instant cannot take the same
 * number: the second insert fails and the caller tries again. A sequence would
 * avoid the retry but would also hand out numbers across year boundaries and
 * leave gaps whenever a transaction rolled back.
 */
export async function nextLeadReference(): Promise<string> {
  const year = new Date().getFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1));

  const count = await prisma.lead.count({
    where: { createdAt: { gte: startOfYear } },
  });

  return `HN-${year}-${String(count + 1).padStart(4, "0")}`;
}

/**
 * Where a submission came from, as far as the request can tell.
 *
 * Kept for abuse handling only, which is why the user agent is truncated and
 * neither field leaves the database: the export deliberately omits both.
 */
export async function requestContext(): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
}> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  return {
    ipAddress:
      forwarded?.split(",")[0]?.trim() ?? headerList.get("x-real-ip") ?? null,
    userAgent: headerList.get("user-agent")?.slice(0, 512) ?? null,
  };
}

/**
 * Stores an enquiry under the next free reference.
 *
 * The reference is unique at the column, so two enquiries arriving together
 * cannot take the same number: the second insert fails and we count again.
 * Returns null once the attempts run out, which the caller reports rather than
 * pretending the enquiry was saved.
 */
export async function createLeadWithReference(
  data: Omit<Prisma.LeadUncheckedCreateInput, "reference">,
  items?: Prisma.RfqItemCreateWithoutLeadInput[],
): Promise<{ id: string; reference: string } | null> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const reference = await nextLeadReference();
    try {
      return await prisma.lead.create({
        data: {
          ...data,
          reference,
          ...(items?.length ? { items: { create: items } } : {}),
        },
        select: { id: true, reference: true },
      });
    } catch {
      // Taken in the moment between counting and inserting; count again.
    }
  }
  return null;
}

/** 32 bytes of randomness, url-safe: the whole of a download's authorisation. */
export function newGrantToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function findLead(id: string) {
  return prisma.lead.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      reference: true,
      name: true,
      email: true,
      phone: true,
      organisation: true,
      city: true,
      message: true,
      source: true,
      status: true,
      productName: true,
      consentedAt: true,
      consentText: true,
      createdAt: true,
      updatedAt: true,
      assignedToId: true,
      product: { select: { id: true, name: true, slug: true } },
      // The list on a quotation request, in the order it was sent. The name and
      // model number are the snapshot taken when it arrived: what was asked for
      // does not change because the catalogue since did.
      items: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          productName: true,
          modelNumber: true,
          quantity: true,
          notes: true,
          product: { select: { slug: true, status: true, deletedAt: true } },
        },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        select: { id: true, body: true, authorName: true, createdAt: true },
      },
      grants: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          expiresAt: true,
          downloadCount: true,
          lastDownloadedAt: true,
          document: { select: { title: true, kind: true } },
        },
      },
    },
  });
}

/** Staff an enquiry can be assigned to. */
export async function assignableStaff() {
  return prisma.staff.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
}

/**
 * Resolves a download token to the file behind it.
 *
 * Expiry is checked here rather than by the caller so that no route can serve a
 * grant that has run out by forgetting to look.
 */
export async function resolveGrant(token: string) {
  const grant = await prisma.documentGrant.findUnique({
    where: { token },
    select: {
      id: true,
      expiresAt: true,
      leadId: true,
      document: {
        select: {
          id: true,
          title: true,
          media: { select: { storageKey: true, deletedAt: true } },
        },
      },
    },
  });

  if (!grant) return null;
  if (grant.expiresAt.getTime() < Date.now()) return null;
  if (grant.document.media.deletedAt) return null;

  return grant;
}

/**
 * Whether a media asset is only available behind an enquiry.
 *
 * Asked by the ordinary file route before serving a document, so a gated
 * brochure cannot be fetched by its storage key. Documents are a small share of
 * requests and images skip the check entirely, so this costs nothing on the
 * pages that matter.
 */
export async function isGatedStorageKey(storageKey: string): Promise<boolean> {
  const gated = await prisma.productDocument.findFirst({
    where: { gated: true, media: { storageKey } },
    select: { id: true },
  });
  return gated !== null;
}
