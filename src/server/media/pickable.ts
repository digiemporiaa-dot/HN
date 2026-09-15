import { cache } from "react";

import { prisma } from "@/server/db";
import { publicUrlForKey } from "@/server/storage/paths";
import type { MediaOption } from "@/app/(admin)/admin/pages/[id]/field-inputs";

/**
 * Images an editor may place in content.
 *
 * Documents are excluded: nothing that takes a picker renders a PDF, and
 * offering one would only produce a broken image.
 */
export const pickableMedia = cache(async (): Promise<MediaOption[]> => {
  const assets = await prisma.mediaAsset.findMany({
    where: { deletedAt: null, kind: { in: ["IMAGE", "VECTOR"] } },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, storageKey: true, originalName: true, title: true },
  });

  return assets.map((asset) => ({
    id: asset.id,
    url: publicUrlForKey(asset.storageKey),
    name: asset.title || asset.originalName,
    isImage: true,
  }));
});
