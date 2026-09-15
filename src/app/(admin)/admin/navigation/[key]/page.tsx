import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { prisma } from "@/server/db";
import { currentPermissions, requirePermission } from "@/server/permissions";
import { publicUrlForKey } from "@/server/storage/paths";
import {
  ensureSystemMenus,
  getEditableMenu,
  MAX_NAVIGATION_DEPTH,
  type NavigationNode,
} from "@/server/navigation/service";
import type { MediaOption } from "../../pages/[id]/field-inputs";
import {
  MenuEditor,
  type EditorNode,
  type MenuShape,
} from "./menu-editor";

export const metadata: Metadata = {
  title: "Edit menu",
  robots: { index: false, follow: false },
};

/** Only images can sit in a menu; a PDF there would render as a broken card. */
const PICKABLE_KINDS = ["IMAGE", "VECTOR"] as const;

/**
 * The public tree carries resolved image URLs for rendering; the editor needs
 * the asset ids instead, so the two shapes are mapped rather than shared.
 */
function toEditorNodes(
  nodes: NavigationNode[],
  imageIdByItem: Map<string, string>,
): EditorNode[] {
  return nodes.map((node) => ({
    id: node.id,
    label: node.label,
    href: node.href,
    description: node.description,
    visible: node.visible,
    openInNewTab: node.openInNewTab,
    highlight: node.highlight,
    imageId: imageIdByItem.get(node.id) ?? null,
    depth: node.depth,
    children: toEditorNodes(node.children, imageIdByItem),
  }));
}

export default async function EditMenuPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  await requirePermission("NAVIGATION", "VIEW");
  const { can } = await currentPermissions();

  await ensureSystemMenus();

  const { key } = await params;
  const menu = await getEditableMenu(key.toUpperCase());
  if (!menu) notFound();

  const [imageRows, assets] = await Promise.all([
    prisma.navigationItem.findMany({
      where: { menuId: menu.id, imageId: { not: null } },
      select: { id: true, imageId: true },
    }),
    prisma.mediaAsset.findMany({
      where: { deletedAt: null, kind: { in: [...PICKABLE_KINDS] } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        storageKey: true,
        originalName: true,
        title: true,
        kind: true,
      },
    }),
  ]);

  const imageIdByItem = new Map(
    imageRows.flatMap((row) => (row.imageId ? [[row.id, row.imageId]] : [])),
  );

  const mediaOptions: MediaOption[] = assets.map((asset) => ({
    id: asset.id,
    url: publicUrlForKey(asset.storageKey),
    name: asset.title || asset.originalName,
    isImage: true,
  }));

  return (
    <AdminPage>
      <AdminPageHeader
        title={menu.name}
        description={menu.description ?? undefined}
        backHref="/admin/navigation"
        backLabel="Back to navigation"
      />

      <MenuEditor
        menuKey={menu.key}
        shape={menu.location as MenuShape}
        tree={toEditorNodes(menu.tree, imageIdByItem)}
        mediaOptions={mediaOptions}
        maxDepth={MAX_NAVIGATION_DEPTH}
        readOnly={!can("NAVIGATION", "EDIT")}
      />
    </AdminPage>
  );
}
