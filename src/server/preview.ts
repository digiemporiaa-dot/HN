import { draftMode } from "next/headers";

import type {
  PermissionAction,
  PermissionModule,
} from "@/generated/prisma/enums";
import { visitorHasPermission } from "@/server/permissions";

/**
 * Whether this request may see unpublished content.
 *
 * The public pages are prerendered, and a prerendered page cannot read the
 * session cookie: doing so turns a request for a missing or unpublished
 * address into a server error instead of a 404. So the session is consulted
 * only once the visitor has entered preview — Next's draft mode, switched on
 * by /api/preview for signed-in staff — which is exactly when the page is
 * rendered per request anyway. Everyone else gets the static 404.
 */
export async function canPreview(
  module: PermissionModule,
  action: PermissionAction = "VIEW",
): Promise<boolean> {
  const { isEnabled } = await draftMode();
  if (!isEnabled) return false;
  return visitorHasPermission(module, action);
}

/** Where to send staff to see an address as it is, published or not. */
export function previewHref(path: string): string {
  return `/api/preview?path=${encodeURIComponent(path)}`;
}
