import { cache } from "react";

import type { NavigationLocation } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";
import { publicUrlForKey } from "@/server/storage/paths";

/**
 * The menus the public layout draws.
 *
 * Seeded rather than created by hand, because the header and footer render
 * whatever these contain and a missing menu is a broken layout. An empty menu
 * is recoverable; an absent one is not, so they cannot be deleted.
 */
export const SYSTEM_MENUS: Array<{
  key: string;
  name: string;
  location: NavigationLocation;
  description: string;
}> = [
  {
    key: "HEADER",
    name: "Main navigation",
    location: "HEADER",
    description:
      "The primary header menu. Top-level items with children open as a mega menu; items without children are plain links.",
  },
  {
    key: "FOOTER",
    name: "Footer columns",
    location: "FOOTER",
    description:
      "Each top-level item becomes a footer column heading, and its children become the links beneath it.",
  },
  {
    key: "LEGAL",
    name: "Legal links",
    location: "LEGAL",
    description:
      "The small print row at the very bottom of every page. Top level only.",
  },
];

/** Deepest level the editor and the renderers support. */
export const MAX_NAVIGATION_DEPTH = 2;

export async function ensureSystemMenus(): Promise<void> {
  for (const menu of SYSTEM_MENUS) {
    await prisma.navigationMenu.upsert({
      where: { key: menu.key },
      update: {},
      create: { ...menu, isSystem: true },
    });
  }
}

export type NavigationNode = {
  id: string;
  label: string;
  href: string | null;
  description: string | null;
  order: number;
  depth: number;
  visible: boolean;
  openInNewTab: boolean;
  highlight: boolean;
  imageUrl: string | null;
  imageAlt: string;
  children: NavigationNode[];
};

type ItemRow = {
  id: string;
  parentId: string | null;
  label: string;
  href: string | null;
  description: string | null;
  order: number;
  depth: number;
  visible: boolean;
  openInNewTab: boolean;
  highlight: boolean;
  image: { storageKey: string; altText: string | null } | null;
};

/**
 * Rebuilds the tree from one flat query.
 *
 * A menu is small but arbitrarily deep, and issuing a query per level would
 * mean the header cost grows with how the content team organises it.
 */
function toTree(rows: ItemRow[], includeHidden: boolean): NavigationNode[] {
  const nodes = new Map<string, NavigationNode>();
  const roots: NavigationNode[] = [];

  for (const row of rows) {
    nodes.set(row.id, {
      id: row.id,
      label: row.label,
      href: row.href,
      description: row.description,
      order: row.order,
      depth: row.depth,
      visible: row.visible,
      openInNewTab: row.openInNewTab,
      highlight: row.highlight,
      imageUrl: row.image ? publicUrlForKey(row.image.storageKey) : null,
      imageAlt: row.image?.altText ?? "",
      children: [],
    });
  }

  for (const row of rows) {
    if (!includeHidden && !row.visible) continue;
    const node = nodes.get(row.id);
    if (!node) continue;

    // An item whose parent is hidden is unreachable, so it is dropped with the
    // parent rather than promoted to the top level.
    const parent = row.parentId ? nodes.get(row.parentId) : null;
    if (row.parentId && !parent) continue;
    if (parent) {
      if (!includeHidden && !parent.visible) continue;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sort = (list: NavigationNode[]) => {
    list.sort((a, b) => a.order - b.order);
    for (const child of list) sort(child.children);
  };
  sort(roots);

  // An item with neither a destination nor any surviving child leads nowhere,
  // so the public menu drops it rather than rendering dead text. Applied
  // bottom-up, because losing its last child is what makes a heading dead.
  const prune = (list: NavigationNode[]): NavigationNode[] =>
    list
      .map((node) => ({ ...node, children: prune(node.children) }))
      .filter((node) => node.href || node.children.length > 0);

  return includeHidden ? roots : prune(roots);
}

const SELECT = {
  id: true,
  parentId: true,
  label: true,
  href: true,
  description: true,
  order: true,
  depth: true,
  visible: true,
  openInNewTab: true,
  highlight: true,
  image: { select: { storageKey: true, altText: true } },
} as const;

/**
 * The public tree for one menu, hidden items removed.
 *
 * Cached per request: the header and the mobile drawer render the same menu,
 * and a footer appears on every page.
 */
export const getMenuTree = cache(
  async (key: string): Promise<NavigationNode[]> => {
    const menu = await prisma.navigationMenu.findUnique({
      where: { key },
      select: { items: { select: SELECT, orderBy: { order: "asc" } } },
    });

    if (!menu) return [];
    return toTree(menu.items, false);
  },
);

/** The editing tree, hidden items included. */
export async function getEditableMenu(key: string) {
  const menu = await prisma.navigationMenu.findUnique({
    where: { key },
    select: {
      id: true,
      key: true,
      name: true,
      location: true,
      description: true,
      items: { select: SELECT, orderBy: { order: "asc" } },
    },
  });

  if (!menu) return null;
  return { ...menu, tree: toTree(menu.items, true) };
}

export async function listMenus() {
  return prisma.navigationMenu.findMany({
    orderBy: { location: "asc" },
    select: {
      id: true,
      key: true,
      name: true,
      location: true,
      description: true,
      _count: { select: { items: true } },
    },
  });
}
