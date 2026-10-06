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
  kind: "page" | "city" | "post";
  id: string;
  /** The permission module whose EDIT right governs this owner's sections. */
  module: Extract<PermissionModule, "PAGES" | "LOCATIONS" | "BLOGS">;
  /** How the audit log names it: "/about" or "Pune, Maharashtra". */
  label: string;
  adminPath: string;
  /** Where it renders publicly, for revalidation. */
  publicPath: string;
  /** Whether the owner is live, so a save would be seen by visitors at once. */
  published: boolean;
};

export type OwnerRef = { kind: "page" | "city" | "post"; id: string };

const OWNER_SELECT = {
  page: { select: { id: true, slug: true, status: true, deletedAt: true } },
  city: {
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      deletedAt: true,
      state: { select: { name: true } },
    },
  },
  post: {
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      deletedAt: true,
    },
  },
} as const;

type OwnerRows = {
  page: {
    id: string;
    slug: string;
    status: string;
    deletedAt: Date | null;
  } | null;
  city: {
    id: string;
    slug: string;
    name: string;
    status: string;
    deletedAt: Date | null;
    state: { name: string };
  } | null;
  post?: {
    id: string;
    slug: string;
    title: string;
    status: string;
    deletedAt: Date | null;
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
      published: rows.page.status === "PUBLISHED",
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
      published: rows.city.status === "PUBLISHED",
    };
  }
  if (rows.post && !rows.post.deletedAt) {
    return {
      kind: "post",
      id: rows.post.id,
      module: "BLOGS",
      label: `the post “${rows.post.title}”`,
      adminPath: `/admin/blogs/${rows.post.id}`,
      publicPath: `/blog/${rows.post.slug}`,
      published: rows.post.status === "PUBLISHED",
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
      postId: true,
      content: true,
      design: true,
      enabled: true,
      ...OWNER_SELECT,
    },
  });
  if (!section) return null;

  const owner = describe({
    page: section.page,
    city: section.city,
    post: section.post,
  });
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
  if (ref.kind === "post") {
    const post = await prisma.blogPost.findFirst({
      where: { id: ref.id },
      ...OWNER_SELECT.post,
    });
    return describe({ page: null, city: null, post });
  }
  const city = await prisma.city.findFirst({
    where: { id: ref.id },
    ...OWNER_SELECT.city,
  });
  return describe({ page: null, city });
}

/** The where-clause that selects every section with the same owner. */
export function siblingsOf(owner: SectionOwner) {
  if (owner.kind === "page") return { pageId: owner.id };
  if (owner.kind === "post") return { postId: owner.id };
  return { cityId: owner.id };
}
