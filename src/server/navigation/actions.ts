"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/log";
import { requirePermission } from "@/server/permissions";
import { clearUsage, recordUsage } from "@/server/media/service";
import {
  addItemSchema,
  itemIdSchema,
  moveItemSchema,
  navigationItemSchema,
} from "@/lib/validation/navigation";
import { MAX_NAVIGATION_DEPTH } from "./service";

export type NavigationActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Every menu appears on every page, so a change to one invalidates the whole
 * public site rather than a single route.
 */
function revalidateSite(menuKey: string): void {
  revalidatePath("/", "layout");
  revalidatePath(`/admin/navigation/${menuKey}`);
}

async function itemContext(itemId: string) {
  return prisma.navigationItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      menuId: true,
      parentId: true,
      order: true,
      depth: true,
      label: true,
      menu: { select: { key: true, name: true } },
    },
  });
}

/** Rewrites an item's media usage so the library's "in use" count stays true. */
async function syncImageUsage(itemId: string, imageId: string): Promise<void> {
  await clearUsage({
    entityType: "NavigationItem",
    entityId: itemId,
    field: "image",
  });

  if (!imageId) return;

  await recordUsage({
    assetId: imageId,
    entityType: "NavigationItem",
    entityId: itemId,
    field: "image",
  });
}

export async function addNavigationItemAction(
  _previous: NavigationActionState,
  formData: FormData,
): Promise<NavigationActionState> {
  const actor = await requirePermission("NAVIGATION", "EDIT");

  const parsed = addItemSchema.safeParse({
    menuKey: formData.get("menuKey"),
    parentId: formData.get("parentId") ?? "",
  });
  if (!parsed.success) return { error: "Invalid request." };

  const menu = await prisma.navigationMenu.findUnique({
    where: { key: parsed.data.menuKey },
    select: { id: true, key: true, location: true },
  });
  if (!menu) return { error: "That menu no longer exists." };

  let depth = 0;
  let parentId: string | null = null;

  if (parsed.data.parentId) {
    const parent = await prisma.navigationItem.findUnique({
      where: { id: parsed.data.parentId },
      select: { id: true, menuId: true, depth: true },
    });
    // Checked rather than trusted: the parent id arrives from the form, and a
    // parent in another menu would silently move the item between menus.
    if (!parent || parent.menuId !== menu.id) {
      return { error: "That parent item no longer exists." };
    }
    if (parent.depth >= MAX_NAVIGATION_DEPTH) {
      return { error: "This menu cannot nest any deeper." };
    }
    parentId = parent.id;
    depth = parent.depth + 1;
  }

  // The legal row is a single line of small print; nesting it would render
  // items that nothing draws.
  if (menu.location === "LEGAL" && parentId) {
    return { error: "Legal links cannot be nested." };
  }

  const last = await prisma.navigationItem.findFirst({
    where: { menuId: menu.id, parentId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const item = await prisma.navigationItem.create({
    data: {
      menuId: menu.id,
      parentId,
      depth,
      order: (last?.order ?? -1) + 1,
      label: depth === 0 ? "New item" : "New link",
      href: "",
      visible: false,
    },
    select: { id: true },
  });

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "NAVIGATION_ITEM_ADDED",
    module: "NAVIGATION",
    entityType: "NavigationItem",
    entityId: item.id,
    summary: `Added an item to ${menu.key}`,
  });

  revalidateSite(menu.key);
  return { success: "Item added. It stays hidden until you show it." };
}

export async function updateNavigationItemAction(
  _previous: NavigationActionState,
  formData: FormData,
): Promise<NavigationActionState> {
  const actor = await requirePermission("NAVIGATION", "EDIT");

  const itemId = String(formData.get("itemId") ?? "");
  const item = await itemContext(itemId);
  if (!item) return { error: "That item no longer exists." };

  const parsed = navigationItemSchema.safeParse({
    label: formData.get("label"),
    href: formData.get("href") ?? "",
    description: formData.get("description") ?? "",
    imageId: formData.get("imageId") ?? "",
    visible: formData.get("visible") === "on",
    openInNewTab: formData.get("openInNewTab") === "on",
    highlight: formData.get("highlight") === "on",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  // A destination is deliberately not required here. A column heading
  // legitimately has none, and demanding one up front would make the natural
  // order — create the column, name it, then add links under it — impossible.
  // An item that ends up with neither a destination nor children is dropped by
  // the renderer and flagged in the editor instead.

  await prisma.navigationItem.update({
    where: { id: item.id },
    data: {
      label: parsed.data.label,
      href: parsed.data.href || null,
      description: parsed.data.description || null,
      imageId: parsed.data.imageId || null,
      visible: parsed.data.visible,
      openInNewTab: parsed.data.openInNewTab,
      highlight: parsed.data.highlight,
    },
  });

  await syncImageUsage(item.id, parsed.data.imageId);

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "NAVIGATION_ITEM_UPDATED",
    module: "NAVIGATION",
    entityType: "NavigationItem",
    entityId: item.id,
    summary: `Updated "${parsed.data.label}" in ${item.menu.key}`,
  });

  revalidateSite(item.menu.key);
  return { success: "Item saved." };
}

export async function moveNavigationItemAction(
  formData: FormData,
): Promise<void> {
  await requirePermission("NAVIGATION", "EDIT");

  const parsed = moveItemSchema.safeParse({
    itemId: formData.get("itemId"),
    direction: formData.get("direction"),
  });
  if (!parsed.success) return;

  const item = await itemContext(parsed.data.itemId);
  if (!item) return;

  // Items only move within their own level: promoting or demoting would change
  // what the item means (a column heading is not a top-level menu entry), so
  // that is a separate, deliberate action rather than a side effect of nudging.
  const neighbour = await prisma.navigationItem.findFirst({
    where: {
      menuId: item.menuId,
      parentId: item.parentId,
      order:
        parsed.data.direction === "up"
          ? { lt: item.order }
          : { gt: item.order },
    },
    orderBy: { order: parsed.data.direction === "up" ? "desc" : "asc" },
    select: { id: true, order: true },
  });
  if (!neighbour) return;

  await prisma.$transaction([
    prisma.navigationItem.update({
      where: { id: item.id },
      data: { order: neighbour.order },
    }),
    prisma.navigationItem.update({
      where: { id: neighbour.id },
      data: { order: item.order },
    }),
  ]);

  revalidateSite(item.menu.key);
}

export async function deleteNavigationItemAction(
  formData: FormData,
): Promise<void> {
  const actor = await requirePermission("NAVIGATION", "EDIT");

  const parsed = itemIdSchema.safeParse({ itemId: formData.get("itemId") });
  if (!parsed.success) return;

  const item = await itemContext(parsed.data.itemId);
  if (!item) return;

  // Children cascade in the database; their media usage rows do not, so the
  // whole subtree is collected first. Two levels, because the editor caps
  // nesting at MAX_NAVIGATION_DEPTH.
  const children = await prisma.navigationItem.findMany({
    where: { parentId: item.id },
    select: { id: true },
  });
  const grandchildren = children.length
    ? await prisma.navigationItem.findMany({
        where: { parentId: { in: children.map((row) => row.id) } },
        select: { id: true },
      })
    : [];
  const descendants = [...children, ...grandchildren];

  await prisma.navigationItem.delete({ where: { id: item.id } });

  for (const id of [item.id, ...descendants.map((row) => row.id)]) {
    await clearUsage({
      entityType: "NavigationItem",
      entityId: id,
      field: "image",
    });
  }

  await recordAuditEvent({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "NAVIGATION_ITEM_DELETED",
    module: "NAVIGATION",
    entityType: "NavigationItem",
    entityId: item.id,
    summary: `Removed "${item.label}" from ${item.menu.key}`,
    metadata: { removedChildren: descendants.length },
  });

  revalidateSite(item.menu.key);
}
