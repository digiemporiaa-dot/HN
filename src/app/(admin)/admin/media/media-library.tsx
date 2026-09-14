"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileText,
  Shapes,
  Trash2,
} from "lucide-react";

import {
  Badge,
  Button,
  Drawer,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
} from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import {
  deleteAssetAction,
  moveAssetAction,
  updateAssetMetadataAction,
  type MediaActionState,
} from "@/server/media/actions";

const INITIAL: MediaActionState = {};

export type MediaAssetView = {
  id: string;
  url: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  kind: "IMAGE" | "VECTOR" | "DOCUMENT";
  sizeLabel: string;
  dimensions: string | null;
  altText: string | null;
  title: string | null;
  caption: string | null;
  description: string | null;
  uploadedBy: string;
  uploadedAt: string;
  folderId: string | null;
  usageCount: number;
};

export type FolderOption = { id: string; label: string };

function Feedback({ state }: { state: MediaActionState }) {
  if (state.error) {
    return (
      <div
        role="alert"
        className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3"
      >
        <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>{state.error}</span>
      </div>
    );
  }
  if (state.success) {
    return (
      <div className="border-success-100 bg-success-50 text-success-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>{state.success}</span>
      </div>
    );
  }
  return null;
}

function AssetThumbnail({
  asset,
  className,
}: {
  asset: MediaAssetView;
  className?: string;
}) {
  if (asset.kind === "DOCUMENT") {
    return (
      <div
        className={cn(
          "bg-surface-muted text-ink-subtle flex items-center justify-center",
          className,
        )}
      >
        <FileText aria-hidden="true" className="size-6" />
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element -- served from our own
       media route; Next/Image adds no value for library thumbnails and would
       re-encode files we deliberately store untouched. */
    <img
      src={asset.url}
      alt={asset.altText ?? ""}
      loading="lazy"
      className={cn("bg-surface-muted object-contain", className)}
    />
  );
}

export function MediaLibrary({
  assets,
  folders,
  view,
  canEdit,
  canDelete,
}: {
  assets: MediaAssetView[];
  folders: FolderOption[];
  view: "grid" | "list";
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [selected, setSelected] = useState<MediaAssetView | null>(null);

  return (
    <>
      {view === "grid" ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {assets.map((asset) => (
            <li key={asset.id}>
              <button
                type="button"
                onClick={() => setSelected(asset)}
                className="border-line bg-surface hover:border-line-strong flex w-full flex-col overflow-hidden rounded-lg border text-left transition-colors"
              >
                <AssetThumbnail asset={asset} className="h-32 w-full" />
                <span className="flex flex-col gap-1 p-3">
                  <span className="text-body-sm text-ink truncate font-medium">
                    {asset.title ?? asset.originalName}
                  </span>
                  <span className="text-caption text-ink-subtle">
                    {asset.sizeLabel}
                    {asset.dimensions ? ` · ${asset.dimensions}` : ""}
                  </span>
                  {!asset.altText && asset.kind !== "DOCUMENT" ? (
                    <Badge tone="warning">No alt text</Badge>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="border-line divide-line bg-surface divide-y rounded-lg border">
          {assets.map((asset) => (
            <li key={asset.id}>
              <button
                type="button"
                onClick={() => setSelected(asset)}
                className="hover:bg-surface-subtle flex w-full items-center gap-4 p-3 text-left transition-colors"
              >
                <AssetThumbnail
                  asset={asset}
                  className="size-12 shrink-0 rounded-md"
                />
                <span className="min-w-0 flex-1">
                  <span className="text-body-sm text-ink block truncate font-medium">
                    {asset.title ?? asset.originalName}
                  </span>
                  <span className="text-caption text-ink-subtle block truncate">
                    {asset.mimeType} · {asset.sizeLabel}
                    {asset.dimensions ? ` · ${asset.dimensions}` : ""} ·{" "}
                    {asset.uploadedAt}
                  </span>
                </span>
                {asset.usageCount > 0 ? (
                  <Badge tone="info">In use</Badge>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      <AssetDetail
        asset={selected}
        folders={folders}
        canEdit={canEdit}
        canDelete={canDelete}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

function AssetDetail({
  asset,
  folders,
  canEdit,
  canDelete,
  onClose,
}: {
  asset: MediaAssetView | null;
  folders: FolderOption[];
  canEdit: boolean;
  canDelete: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [metaState, metaAction, savingMeta] = useActionState(
    updateAssetMetadataAction,
    INITIAL,
  );
  const [moveState, moveActionFn, moving] = useActionState(
    moveAssetAction,
    INITIAL,
  );
  const [deleteState, deleteActionFn, deleting] = useActionState(
    deleteAssetAction,
    INITIAL,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!asset) return null;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(asset.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Drawer open={Boolean(asset)} onClose={onClose} title="File details">
      <div className="flex flex-col gap-6">
        <AssetThumbnail
          asset={asset}
          className="border-line max-h-56 w-full rounded-md border"
        />

        <dl className="flex flex-col gap-2">
          {[
            ["File name", asset.originalName],
            ["Type", asset.mimeType],
            ["Size", asset.sizeLabel],
            ["Dimensions", asset.dimensions ?? "—"],
            ["Uploaded by", asset.uploadedBy],
            ["Uploaded", asset.uploadedAt],
            [
              "References",
              asset.usageCount === 0
                ? "Not used anywhere yet"
                : `${asset.usageCount} ${asset.usageCount === 1 ? "place" : "places"}`,
            ],
          ].map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <dt className="text-caption text-ink-subtle shrink-0">{label}</dt>
              <dd className="text-body-sm text-ink-muted min-w-0 text-right break-all">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex items-center gap-2">
          <Input readOnly value={asset.url} aria-label="File URL" />
          <Button type="button" variant="outline" size="sm" onClick={copyUrl}>
            <Copy aria-hidden="true" className="size-4" />
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        {canEdit ? (
          <>
            <form action={metaAction} className="flex flex-col gap-4">
              <input type="hidden" name="assetId" value={asset.id} />
              <Feedback state={metaState} />

              <Field
                label="Alt text"
                help="Describes the image for screen readers and when it fails to load."
              >
                {(props) => (
                  <Input
                    name="altText"
                    defaultValue={asset.altText ?? ""}
                    {...props}
                  />
                )}
              </Field>

              <Field label="Title">
                {(props) => (
                  <Input name="title" defaultValue={asset.title ?? ""} {...props} />
                )}
              </Field>

              <Field label="Caption">
                {(props) => (
                  <Input
                    name="caption"
                    defaultValue={asset.caption ?? ""}
                    {...props}
                  />
                )}
              </Field>

              <Field label="Description">
                {(props) => (
                  <Textarea
                    name="description"
                    rows={3}
                    defaultValue={asset.description ?? ""}
                    {...props}
                  />
                )}
              </Field>

              <div>
                <Button type="submit" loading={savingMeta}>
                  {savingMeta ? "Saving" : "Save details"}
                </Button>
              </div>
            </form>

            <form
              action={moveActionFn}
              className="border-line flex flex-col gap-3 border-t pt-5"
            >
              <input type="hidden" name="assetId" value={asset.id} />
              <Feedback state={moveState} />
              <Field label="Folder">
                {(props) => (
                  <Select
                    name="folderId"
                    defaultValue={asset.folderId ?? ""}
                    {...props}
                  >
                    <option value="">Unfiled</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <div>
                <Button type="submit" variant="outline" loading={moving}>
                  {moving ? "Moving" : "Move file"}
                </Button>
              </div>
            </form>
          </>
        ) : null}

        {canDelete ? (
          <div className="border-line flex flex-col gap-3 border-t pt-5">
            <Feedback state={deleteState} />

            {deleteState.usageWarning ? (
              <div className="border-warning-100 bg-warning-50 text-warning-700 flex flex-col gap-2 rounded-md border p-3">
                <span className="text-body-sm flex items-center gap-2 font-medium">
                  <AlertTriangle aria-hidden="true" className="size-4" />
                  This file is still in use
                </span>
                <p className="text-caption">
                  Referenced in {deleteState.usageWarning.count}{" "}
                  {deleteState.usageWarning.count === 1 ? "place" : "places"}:{" "}
                  {deleteState.usageWarning.places.join(", ")}. Deleting it will
                  leave those references broken.
                </p>
              </div>
            ) : null}

            <div>
              <Button
                type="button"
                variant="danger"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Delete file
              </Button>
            </div>

            <Modal
              open={confirmOpen}
              onClose={() => setConfirmOpen(false)}
              title="Delete this file?"
              description={`${asset.originalName} will be removed from the library and from disk.`}
              footer={
                <>
                  <Button
                    variant="ghost"
                    onClick={() => setConfirmOpen(false)}
                  >
                    Cancel
                  </Button>
                  <form
                    action={(formData) => {
                      deleteActionFn(formData);
                      setConfirmOpen(false);
                      router.refresh();
                    }}
                  >
                    <input type="hidden" name="assetId" value={asset.id} />
                    <input
                      type="hidden"
                      name="confirmInUse"
                      value={String(Boolean(deleteState.usageWarning))}
                    />
                    <Button type="submit" variant="danger" loading={deleting}>
                      {deleteState.usageWarning
                        ? "Delete anyway"
                        : "Delete file"}
                    </Button>
                  </form>
                </>
              }
            >
              <p className="text-body-sm text-ink-muted">
                {asset.usageCount > 0
                  ? "This file is referenced elsewhere. You will be shown where before it is removed."
                  : "This cannot be undone."}
              </p>
            </Modal>
          </div>
        ) : null}

        {!canEdit && !canDelete ? (
          <p className="text-caption text-ink-subtle flex items-center gap-2">
            <Shapes aria-hidden="true" className="size-4" />
            You have read-only access to the media library.
          </p>
        ) : null}
      </div>
    </Drawer>
  );
}
