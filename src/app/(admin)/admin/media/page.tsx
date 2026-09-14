import type { Metadata } from "next";
import Link from "next/link";
import { LayoutGrid, List } from "lucide-react";

import { EmptyState, Pagination } from "@/components/ui";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminPageHeader } from "@/components/admin/page-header";
import { TableSearch } from "@/components/admin/data-table-parts";
import { cn } from "@/lib/utils/cn";
import {
  buildQueryHref,
  readPageParam,
  readStringParam,
} from "@/lib/utils/query";
import { currentPermissions, requirePermission } from "@/server/permissions";
import {
  countAllAssets,
  ensureRootFolders,
  listAssets,
  listFolders,
} from "@/server/media/service";
import { publicUrlForKey } from "@/server/storage/paths";
import { MediaLibrary, type MediaAssetView } from "./media-library";
import { MediaUploader } from "./media-uploader";
import { FolderPanel, type FolderView } from "./folder-panel";

export const metadata: Metadata = {
  title: "Media",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 24;
const BASE = "/admin/media";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const KIND_FILTERS = [
  { value: undefined, label: "All types" },
  { value: "IMAGE", label: "Images" },
  { value: "VECTOR", label: "Vectors" },
  { value: "DOCUMENT", label: "Documents" },
] as const;

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("MEDIA", "VIEW");
  const { can } = await currentPermissions();

  // The fixed roots mirror the storage layout; creating them here means the
  // library is usable on a fresh install without a separate seed step.
  await ensureRootFolders();

  const params = await searchParams;
  const page = readPageParam(params.page);
  const query = readStringParam(params.q);
  const folderId = readStringParam(params.folder) ?? null;
  const kindParam = readStringParam(params.kind);
  const kind =
    kindParam === "IMAGE" || kindParam === "VECTOR" || kindParam === "DOCUMENT"
      ? kindParam
      : undefined;
  const view = params.view === "list" ? "list" : "grid";

  const [folders, { total, assets }, totalAssets] = await Promise.all([
    listFolders(),
    listAssets({ folderId, query, kind, page, pageSize: PAGE_SIZE }),
    countAllAssets(),
  ]);

  const folderViews: FolderView[] = folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    depth: folder.depth,
    isRoot: folder.isRoot,
    assetCount: folder.assetCount,
    href: buildQueryHref(BASE, params, { folder: folder.id, page: null }),
    active: folderId === folder.id,
  }));

  const assetViews: MediaAssetView[] = assets.map((asset) => ({
    id: asset.id,
    url: publicUrlForKey(asset.storageKey),
    storageKey: asset.storageKey,
    originalName: asset.originalName,
    mimeType: asset.mimeType,
    kind: asset.kind,
    sizeLabel: formatBytes(asset.sizeBytes),
    dimensions:
      asset.width && asset.height ? `${asset.width}×${asset.height}` : null,
    altText: asset.altText,
    title: asset.title,
    caption: asset.caption,
    description: asset.description,
    uploadedBy: asset.uploadedBy?.name ?? "Unknown",
    uploadedAt: dateFormatter.format(asset.createdAt),
    folderId: asset.folderId,
    usageCount: asset._count.usages,
  }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminPage>
      <AdminPageHeader
        title="Media"
        description="Images, vectors and documents used across the website. Files are stored on the server's persistent volume."
      />

      <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <FolderPanel
            folders={folderViews}
            allHref={buildQueryHref(BASE, params, { folder: null, page: null })}
            allActive={!folderId}
            totalCount={totalAssets}
            canManage={can("MEDIA", "CREATE")}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          {can("MEDIA", "CREATE") ? (
            <MediaUploader folderId={folderId} />
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <TableSearch placeholder="Search files" />

              <div className="flex flex-wrap items-center gap-1">
                {KIND_FILTERS.map((filter) => {
                  const active = kind === filter.value;
                  return (
                    <Link
                      key={filter.label}
                      href={buildQueryHref(BASE, params, {
                        kind: filter.value ?? null,
                        page: null,
                      })}
                      className={cn(
                        "text-caption rounded-md px-2.5 py-1.5 transition-colors",
                        active
                          ? "bg-navy-900 text-white"
                          : "text-ink-muted hover:bg-surface-muted hover:text-ink",
                      )}
                    >
                      {filter.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {(
                [
                  ["grid", LayoutGrid, "Grid view"],
                  ["list", List, "List view"],
                ] as const
              ).map(([value, Icon, label]) => (
                <Link
                  key={value}
                  href={buildQueryHref(BASE, params, { view: value })}
                  aria-label={label}
                  aria-current={view === value ? "true" : undefined}
                  className={cn(
                    "rounded-md p-2 transition-colors",
                    view === value
                      ? "bg-navy-900 text-white"
                      : "text-ink-muted hover:bg-surface-muted hover:text-ink",
                  )}
                >
                  <Icon aria-hidden="true" className="size-4" />
                </Link>
              ))}
            </div>
          </div>

          {assetViews.length === 0 ? (
            <EmptyState
              title={
                query || kind || folderId
                  ? "No files match these filters"
                  : "No files yet"
              }
              description={
                query || kind || folderId
                  ? "Try a different search, folder or file type."
                  : "Upload images, logos and brochures to use them across the website."
              }
            />
          ) : (
            <>
              <MediaLibrary
                assets={assetViews}
                folders={folderViews.map((folder) => ({
                  id: folder.id,
                  label: `${"— ".repeat(folder.depth)}${folder.name}`,
                }))}
                view={view}
                canEdit={can("MEDIA", "EDIT")}
                canDelete={can("MEDIA", "DELETE")}
              />

              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-caption text-ink-muted">
                  Showing {(page - 1) * PAGE_SIZE + 1}&ndash;
                  {Math.min(page * PAGE_SIZE, total)} of {total}
                </p>
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  buildHref={(target) =>
                    buildQueryHref(BASE, params, { page: target })
                  }
                />
              </div>
            </>
          )}
        </div>
      </div>
    </AdminPage>
  );
}
