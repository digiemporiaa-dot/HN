import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/server/db";
import { publicUrlForKey } from "@/server/storage/paths";
import { clientForm, publicFormById, type ClientForm } from "@/server/forms/service";
import { popupState, storedRules, type PopupState } from "@/lib/popups/rules";

const LIST_SELECT = {
  id: true,
  name: true,
  heading: true,
  type: true,
  trigger: true,
  device: true,
  active: true,
  startsAt: true,
  endsAt: true,
  targetMode: true,
  targetRules: true,
  priority: true,
  updatedAt: true,
} as const satisfies Prisma.PopupSelect;

export type PopupRow = Prisma.PopupGetPayload<{ select: typeof LIST_SELECT }> & {
  state: PopupState;
  rules: string[];
};

/**
 * Every popup that has not been deleted, with its state worked out against
 * the clock now. The state is derived, never stored, so "scheduled" turns
 * into "live" on time without anything having to run.
 */
export async function listPopups(now: Date = new Date()): Promise<PopupRow[]> {
  const rows = await prisma.popup.findMany({
    where: { deletedAt: null },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    take: 500,
    select: LIST_SELECT,
  });
  return rows.map((row) => ({
    ...row,
    state: popupState(row, now),
    rules: storedRules(row.targetRules),
  }));
}

export function popupMetrics(rows: PopupRow[]) {
  return {
    total: rows.length,
    live: rows.filter((row) => row.state === "live").length,
    scheduled: rows.filter((row) => row.state === "scheduled").length,
    off: rows.filter((row) => row.state === "inactive" || row.state === "expired").length,
  };
}

export async function findPopup(id: string) {
  const popup = await prisma.popup.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      type: true,
      active: true,
      eyebrow: true,
      heading: true,
      description: true,
      imageId: true,
      productId: true,
      formId: true,
      ctaLabel: true,
      ctaHref: true,
      trigger: true,
      delaySeconds: true,
      scrollPercent: true,
      device: true,
      frequencyDays: true,
      startsAt: true,
      endsAt: true,
      targetMode: true,
      targetRules: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return popup ? { ...popup, rules: storedRules(popup.targetRules) } : null;
}

export type PopupRecord = NonNullable<Awaited<ReturnType<typeof findPopup>>>;

/** What the editor's pickers offer: published records only. */
export async function popupEditorOptions() {
  const [products, forms] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null, status: "PUBLISHED" },
      orderBy: { name: "asc" },
      take: 500,
      select: {
        id: true,
        name: true,
        slug: true,
        shortDescription: true,
        primaryImage: { select: { storageKey: true } },
      },
    }),
    prisma.form.findMany({
      where: { deletedAt: null, status: "PUBLISHED" },
      orderBy: { name: "asc" },
      take: 200,
      select: { id: true },
    }),
  ]);
  // Drawn in the preview exactly as visitors would see them; the client
  // shape, so nothing about recipients reaches the editor's browser either.
  const published = await Promise.all(forms.map((form) => publicFormById(form.id)));
  return {
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      href: `/products/${product.slug}`,
      summary: product.shortDescription ?? "",
      imageUrl: product.primaryImage ? publicUrlForKey(product.primaryImage.storageKey) : null,
    })),
    forms: published.flatMap((form) =>
      form ? [{ id: form.id, name: form.name, preview: clientForm(form) }] : [],
    ),
  };
}

export type PopupEditorOptions = Awaited<ReturnType<typeof popupEditorOptions>>;

/**
 * Checks the records a popup points at, as they are now. Used when saving and
 * again when switching a popup on, because a form or product may have been
 * unpublished in between.
 */
export async function checkPopupLinks(input: {
  imageId: string | null;
  productId: string | null;
  formId: string | null;
}): Promise<Record<string, string>> {
  const errors: Record<string, string> = {};
  const [image, product, form] = await Promise.all([
    input.imageId
      ? prisma.mediaAsset.findFirst({
          where: { id: input.imageId, deletedAt: null, kind: { in: ["IMAGE", "VECTOR"] } },
          select: { id: true },
        })
      : null,
    input.productId
      ? prisma.product.findFirst({
          where: { id: input.productId, deletedAt: null, status: "PUBLISHED" },
          select: { id: true },
        })
      : null,
    input.formId
      ? prisma.form.findFirst({
          where: { id: input.formId, deletedAt: null, status: "PUBLISHED" },
          select: { id: true },
        })
      : null,
  ]);
  if (input.imageId && !image) errors.imageId = "That image is no longer in the media library";
  if (input.productId && !product) errors.productId = "That product is not published";
  if (input.formId && !form) errors.formId = "That form is not published";
  return errors;
}

/* -------------------------------------------------------------- public -- */

/**
 * The public shape of a popup: exactly what the dialog draws and the rules it
 * needs to decide when, and nothing else. No internal name, no timestamps
 * beyond the schedule, no form recipients.
 */
export type PublicPopup = {
  id: string;
  type: "ENQUIRY" | "PRODUCT_SPOTLIGHT" | "RESOURCE" | "ANNOUNCEMENT";
  eyebrow: string | null;
  heading: string;
  description: string | null;
  image: { url: string; alt: string } | null;
  cta: { label: string; href: string } | null;
  product: { name: string; href: string; summary: string | null } | null;
  form: ClientForm | null;
  trigger: "DELAY" | "SCROLL" | "EXIT_INTENT" | "IMMEDIATE";
  delaySeconds: number;
  scrollPercent: number;
  device: "ALL" | "DESKTOP" | "MOBILE";
  frequencyDays: number;
  startsAt: string | null;
  endsAt: string | null;
  targetMode: "INCLUDE" | "EXCLUDE";
  targetRules: string[];
  priority: number;
};

/**
 * Popups a visitor could be shown right now: active, not deleted, inside
 * their schedule, and with whatever they depend on still published. A popup
 * whose form or product has been taken down is left out rather than shown
 * half-empty. Page, device and frequency are decided in the browser, from the
 * same rules (src/lib/popups/rules.ts).
 */
export async function livePopups(now: Date = new Date()): Promise<PublicPopup[]> {
  const rows = await prisma.popup.findMany({
    where: {
      active: true,
      deletedAt: null,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      ],
    },
    orderBy: [{ priority: "desc" }, { id: "asc" }],
    take: 20,
    select: {
      id: true,
      type: true,
      eyebrow: true,
      heading: true,
      description: true,
      ctaLabel: true,
      ctaHref: true,
      trigger: true,
      delaySeconds: true,
      scrollPercent: true,
      device: true,
      frequencyDays: true,
      startsAt: true,
      endsAt: true,
      targetMode: true,
      targetRules: true,
      priority: true,
      formId: true,
      image: { select: { storageKey: true, altText: true, deletedAt: true } },
      product: {
        select: {
          name: true,
          slug: true,
          shortDescription: true,
          status: true,
          deletedAt: true,
          primaryImage: { select: { storageKey: true, altText: true, deletedAt: true } },
        },
      },
    },
  });

  const result: PublicPopup[] = [];
  for (const row of rows) {
    const product =
      row.product && row.product.status === "PUBLISHED" && !row.product.deletedAt
        ? row.product
        : null;
    if (row.type === "PRODUCT_SPOTLIGHT" && !product) continue;

    let form: ClientForm | null = null;
    if (row.type === "ENQUIRY") {
      const published = row.formId ? await publicFormById(row.formId) : null;
      if (!published) continue;
      form = clientForm(published);
    }

    const ownImage = row.image && !row.image.deletedAt ? row.image : null;
    const productImage =
      product?.primaryImage && !product.primaryImage.deletedAt ? product.primaryImage : null;
    const image = ownImage ?? productImage;

    result.push({
      id: row.id,
      type: row.type,
      eyebrow: row.eyebrow,
      heading: row.heading,
      description: row.description,
      image: image
        ? { url: publicUrlForKey(image.storageKey), alt: image.altText ?? "" }
        : null,
      cta:
        row.ctaLabel && row.ctaHref
          ? { label: row.ctaLabel, href: row.ctaHref }
          : product && row.ctaLabel
            ? { label: row.ctaLabel, href: `/products/${product.slug}` }
            : null,
      product: product
        ? { name: product.name, href: `/products/${product.slug}`, summary: product.shortDescription }
        : null,
      form,
      trigger: row.trigger,
      delaySeconds: row.delaySeconds,
      scrollPercent: row.scrollPercent,
      device: row.device,
      frequencyDays: row.frequencyDays,
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      targetMode: row.targetMode,
      targetRules: storedRules(row.targetRules),
      priority: row.priority,
    });
  }
  return result;
}

/**
 * Whether a submission may be credited to a popup: the popup must be live
 * now, be an enquiry popup, and carry exactly the form that was submitted.
 * Anything else is treated as no popup at all, so a hand-made popupId cannot
 * attach a lead to an arbitrary record.
 */
export async function verifiedPopupForForm(
  popupId: string,
  formId: string,
  now: Date = new Date(),
): Promise<{ id: string; name: string } | null> {
  if (!/^[a-z0-9]{8,40}$/i.test(popupId)) return null;
  const popup = await prisma.popup.findFirst({
    where: {
      id: popupId,
      formId,
      type: "ENQUIRY",
      active: true,
      deletedAt: null,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      ],
    },
    select: { id: true, name: true },
  });
  return popup;
}
