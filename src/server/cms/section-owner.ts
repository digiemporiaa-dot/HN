import "server-only";

import { prisma } from "@/server/db";
import type { PermissionModule } from "@/generated/prisma/enums";
import { isHomeSlug, pagePublicPath } from "./homepage";

/**
 * What a section belongs to, and what that implies.
 *
 * A section is edited by the same controls wherever it lives, but who may edit
 * it, what the audit log calls it and which paths go stale when it changes all
 * depend on its owner. That owner is always read from the database — never
 * taken from the form — so a request cannot edit a city's sections with a page
 * editor's permission by claiming the section belongs to a page.
 */
export type SectionOwner = {
  kind: "page" | "city";
  id: string;
  /** The permission module whose EDIT right governs this owner's sections. */
  module: Extract<PermissionModule, "PAGES" | "LOCATIONS">;
  /** How the audit log names it: "/about" or "Pune, Maharashtra". */
  label: string;
  adminPath: string;
  /** Where it renders publicly, for revalidation. */
  publicPath: string;
};

export type OwnerRef = { kind: "page" | "city"; id: string };

const OWNER_SELECT = {
  page: { select: { id: true, slug: true, deletedAt: true } },
  city: {
    select: {
      id: true,
      slug: true,
      name: true,
      deletedAt: true,
      state: { select: { name: true } },
    },
  },
} as const;

type OwnerRows = {
  page: { id: string; slug: string; deletedAt: Date | null } | null;
  city: {
    id: string;
    slug: string;
    name: string;
    deletedAt: Date | null;
    state: { name: string };
  } | null;
};

function describe(rows: OwnerRows): SectionOwner | null {
  if (rows.page && !rows.page.deletedAt) {
    return {
      kind: "page",
      id: rows.page.id,
      module: "PAGES",
      label: isHomeSlug(rows.page.slug) ? "the homepage" : `/${rows.page.slug}`,
      adminPath: `/admin/pages/${rows.page.id}`,
      publicPath: pagePublicPath(rows.page.slug),
    };
  }
  if (rows.city && !rows.city.deletedAt) {
    return {
      kind: "city",
      id: rows.city.id,
      module: "LOCATIONS",
      label: `${rows.city.name}, ${rows.city.state.name}`,
      adminPath: `/admin/locations/cities/${rows.city.id}`,
      publicPath: `/locations/${rows.city.slug}`,
    };
  }
  // A section whose owner has been soft-deleted belongs to nothing anyone can
  // edit, and is treated as gone.
  return null;
}

/** The section and its owner, or null if either no longer exists. */
export async function sectionWithOwner(sectionId: string) {
  if (!sectionId) return null;
  const section = await prisma.pageSection.findUnique({
    where: { id: sectionId },
    select: {
      id: true,
      type: true,
      order: true,
      pageId: true,
      cityId: true,
      content: true,
      design: true,
      enabled: true,
      ...OWNER_SELECT,
    },
  });
  if (!section) return null;

  const owner = describe({ page: section.page, city: section.city });
  if (!owner) return null;

  return { section, owner };
}

/** An owner named by a form, confirmed to exist. */
export async function resolveOwner(
  ref: OwnerRef,
): Promise<SectionOwner | null> {
  if (ref.kind === "page") {
    const page = await prisma.page.findFirst({
      where: { id: ref.id },
      ...OWNER_SELECT.page,
    });
    return describe({ page, city: null });
  }
  const city = await prisma.city.findFirst({
    where: { id: ref.id },
    ...OWNER_SELECT.city,
  });
  return describe({ page: null, city });
}

/** The where-clause that selects every section with the same owner. */
export function siblingsOf(owner: SectionOwner) {
  return owner.kind === "page" ? { pageId: owner.id } : { cityId: owner.id };
}
