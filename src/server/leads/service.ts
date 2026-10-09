import { randomBytes } from "node:crypto";

import { prisma } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";
import { leadContextSchema } from "@/lib/validation/leads";

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
  categoryName: true,
  landingCityName: true,
  priority: true,
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
  categoryName: string | null;
  landingCityName: string | null;
  priority: string;
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
export { requestContext } from "@/server/http/client";

/**
 * Stores an enquiry under the next free reference.
 *
 * The reference is unique at the column, so two enquiries arriving together
 * cannot take the same number: the second insert fails and we count again.
 * Returns null once the attempts run out, which the caller reports rather than
 * pretending the enquiry was saved.
 */
/**
 * Where an enquiry was sent from, as the form reported it.
 *
 * The browser posts these because only the browser knows them: the page a form
 * sits on and the campaign parameters in its address bar are gone by the time a
 * server action runs. They are therefore treated as what they are — a claim,
 * clamped and stored for a person to read, never used to decide anything.
 */
export function readLeadContext(formData: FormData): {
  landingPage: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
} {
  const context = leadContextSchema.safeParse({
    landingPage: formData.get("landingPage") ?? "",
    utmSource: formData.get("utmSource") ?? "",
    utmMedium: formData.get("utmMedium") ?? "",
    utmCampaign: formData.get("utmCampaign") ?? "",
    utmTerm: formData.get("utmTerm") ?? "",
    utmContent: formData.get("utmContent") ?? "",
  });

  const data = context.success ? context.data : null;
  return {
    landingPage: data?.landingPage || null,
    utmSource: data?.utmSource || null,
    utmMedium: data?.utmMedium || null,
    utmCampaign: data?.utmCampaign || null,
    utmTerm: data?.utmTerm || null,
    utmContent: data?.utmContent || null,
  };
}

export async function createLeadWithReference(
  data: Omit<Prisma.LeadUncheckedCreateInput, "reference">,
  items?: Prisma.RfqItemCreateWithoutLeadInput[],
): Promise<{ id: string; reference: string } | null> {
  const result = await storeLead({
    ...data,
    ...(items?.length ? { items: { create: items } } : {}),
  });
  return result ? { id: result.id, reference: result.reference } : null;
}

export type StoredLead = {
  id: string;
  reference: string;
  /** True when the submission key had already been used: nothing new was written. */
  replayed: boolean;
};

/**
 * Stores a lead, and everything created with it, in one statement.
 *
 * Nested creates (line items, a quotation row, a download grant, the first
 * activity entry) go in the same INSERT transaction as the lead, so a request
 * is either recorded completely or not at all.
 *
 * With a submission key, a second submission carrying the same key returns the
 * first lead instead of creating another: a double click, a retry after a
 * timeout or a resent request all land on one record.
 */
export async function storeLead(
  data: Omit<Prisma.LeadUncheckedCreateInput, "reference">,
): Promise<StoredLead | null> {
  const key = typeof data.submissionKey === "string" ? data.submissionKey : null;
  const existing = async () =>
    key
      ? prisma.lead.findUnique({
          where: { submissionKey: key },
          select: { id: true, reference: true },
        })
      : null;

  const earlier = await existing();
  if (earlier) return { ...earlier, replayed: true };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const reference = await nextLeadReference();
    try {
      const lead = await prisma.lead.create({
        data: { ...data, reference },
        select: { id: true, reference: true },
      });
      return { ...lead, replayed: false };
    } catch {
      // Either the reference was taken in the moment between counting and
      // inserting (count again), or the same submission arrived twice at once
      // and the other one won (answer with it).
      const raced = await existing();
      if (raced) return { ...raced, replayed: true };
    }
  }
  return null;
}

/** A browser-generated submission key: random, url-safe, bounded. */
export function readSubmissionKey(formData: FormData): string | null {
  const value = String(formData.get("submissionKey") ?? "");
  return /^[A-Za-z0-9_-]{16,64}$/.test(value) ? value : null;
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
      consentedAt: true,
      consentText: true,
      createdAt: true,
      updatedAt: true,
      assignedToId: true,
      product: { select: { id: true, name: true, slug: true } },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          parent: { select: { slug: true } },
        },
      },
      landingCity: {
        select: { id: true, name: true, slug: true, deletedAt: true },
      },
      formSubmission: {
        select: {
          id: true,
          answers: true,
          form: {
            select: {
              id: true,
              name: true,
              fields: {
                orderBy: { order: "asc" },
                select: { key: true, label: true },
              },
            },
          },
          files: {
            select: {
              id: true,
              fieldKey: true,
              originalName: true,
              sizeBytes: true,
            },
          },
        },
      },
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
        select: {
          id: true,
          body: true,
          kind: true,
          authorName: true,
          createdAt: true,
        },
      },
      grants: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          expiresAt: true,
          downloadCount: true,
          lastDownloadedAt: true,
          document: { select: { title: true, kind: true } },
          media: { select: { title: true, originalName: true } },
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
export async function resolveGrant(token: string): Promise<{
  id: string;
  leadId: string;
  title: string;
  storageKey: string;
} | null> {
  const grant = await prisma.documentGrant.findUnique({
    where: { token },
    select: {
      id: true,
      expiresAt: true,
      leadId: true,
      document: {
        select: {
          title: true,
          media: { select: { storageKey: true, deletedAt: true } },
        },
      },
      // A file handed out by a call to action rather than attached to a
      // product: the company catalogue, typically.
      media: {
        select: {
          storageKey: true,
          deletedAt: true,
          title: true,
          originalName: true,
        },
      },
    },
  });

  if (!grant) return null;
  if (grant.expiresAt.getTime() < Date.now()) return null;

  const file = grant.document
    ? { title: grant.document.title, ...grant.document.media }
    : grant.media
      ? {
          title:
            grant.media.title ||
            grant.media.originalName.replace(/\.[^.]+$/, "") ||
            "Catalogue",
          storageKey: grant.media.storageKey,
          deletedAt: grant.media.deletedAt,
        }
      : null;
  if (!file || file.deletedAt) return null;

  return {
    id: grant.id,
    leadId: grant.leadId,
    title: file.title,
    storageKey: file.storageKey,
  };
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
  const [document, cta] = await Promise.all([
    prisma.productDocument.findFirst({
      where: { gated: true, media: { storageKey } },
      select: { id: true },
    }),
    // A file a call to action releases only after its form: refused here for
    // as long as any live configuration gates it, so the form cannot be
    // skipped by guessing the file's address.
    prisma.ctaConfig.findFirst({
      where: {
        file: { storageKey },
        active: true,
        deletedAt: null,
        mode: "POPUP",
        popupType: "GATED_DOWNLOAD",
      },
      select: { id: true },
    }),
  ]);
  return document !== null || cta !== null;
}
