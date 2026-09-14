"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, FolderPlus, Pencil, Trash2 } from "lucide-react";

import { Button, Field, Input, Modal, Select } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import {
  createFolderAction,
  deleteFolderAction,
  renameFolderAction,
  type MediaActionState,
} from "@/server/media/actions";

const INITIAL: MediaActionState = {};

export type FolderView = {
  id: string;
  name: string;
  depth: number;
  isRoot: boolean;
  assetCount: number;
  href: string;
  active: boolean;
};

function Error({ state }: { state: MediaActionState }) {
  if (!state.error) return null;
  return (
    <div
      role="alert"
      className="border-danger-100 bg-danger-50 text-danger-700 text-caption flex items-start gap-2 rounded-md border p-2.5"
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <span>{state.error}</span>
    </div>
  );
}

export function FolderPanel({
  folders,
  allHref,
  allActive,
  totalCount,
  canManage,
}: {
  folders: FolderView[];
  allHref: string;
  allActive: boolean;
  totalCount: number;
  canManage: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const [createState, createActionFn, creating] = useActionState(
    createFolderAction,
    INITIAL,
  );
  const [renameState, renameActionFn, renaming] = useActionState(
    renameFolderAction,
    INITIAL,
  );
  const [deleteState, deleteActionFn, deletingFolder] = useActionState(
    deleteFolderAction,
    INITIAL,
  );

  const subFolders = folders.filter((folder) => !folder.isRoot);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-label text-ink-muted uppercase">Folders</h2>
        {canManage ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              aria-label="Create folder"
              className="text-ink-muted hover:bg-surface-muted hover:text-ink rounded-md p-1.5 transition-colors"
            >
              <FolderPlus aria-hidden="true" className="size-4" />
            </button>
            {subFolders.length > 0 ? (
              <button
                type="button"
                onClick={() => setManageOpen(true)}
                aria-label="Manage folders"
                className="text-ink-muted hover:bg-surface-muted hover:text-ink rounded-md p-1.5 transition-colors"
              >
                <Pencil aria-hidden="true" className="size-4" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <ul className="flex flex-col gap-0.5">
        <li>
          <Link
            href={allHref}
            aria-current={allActive ? "page" : undefined}
            className={cn(
              "text-body-sm flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 transition-colors",
              allActive
                ? "bg-navy-900 font-medium text-white"
                : "text-ink-muted hover:bg-surface-muted hover:text-ink",
            )}
          >
            <span>All files</span>
            <span className="text-caption tabular-nums opacity-70">
              {totalCount}
            </span>
          </Link>
        </li>

        {folders.map((folder) => (
          <li key={folder.id}>
            <Link
              href={folder.href}
              aria-current={folder.active ? "page" : undefined}
              style={{ paddingLeft: `${0.625 + folder.depth * 0.75}rem` }}
              className={cn(
                "text-body-sm flex items-center justify-between gap-2 rounded-md py-1.5 pr-2.5 transition-colors",
                folder.active
                  ? "bg-navy-900 font-medium text-white"
                  : "text-ink-muted hover:bg-surface-muted hover:text-ink",
              )}
            >
              <span className="truncate">{folder.name}</span>
              <span className="text-caption shrink-0 tabular-nums opacity-70">
                {folder.assetCount}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New folder"
        description="Subfolders organise the library. Files stay where they are on disk."
      >
        <form action={createActionFn} className="flex flex-col gap-4">
          <Error state={createState} />

          <Field label="Parent folder" required>
            {(props) => (
              <Select name="parentId" defaultValue={folders[0]?.id ?? ""} {...props}>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {"— ".repeat(folder.depth)}
                    {folder.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Folder name" error={createState.fieldErrors?.name} required>
            {(props) => <Input name="name" autoFocus {...props} />}
          </Field>

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              {creating ? "Creating" : "Create folder"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        title="Manage folders"
        description="Top-level folders mirror the storage layout and cannot be changed."
      >
        <div className="flex flex-col gap-4">
          <Error state={renameState} />
          <Error state={deleteState} />

          <ul className="border-line divide-line divide-y rounded-lg border">
            {subFolders.map((folder) => (
              <li
                key={folder.id}
                className="flex flex-wrap items-center gap-3 p-3"
              >
                <form
                  action={renameActionFn}
                  className="flex flex-1 items-center gap-2"
                >
                  <input type="hidden" name="folderId" value={folder.id} />
                  <Input
                    name="name"
                    defaultValue={folder.name}
                    aria-label={`Rename ${folder.name}`}
                  />
                  <Button type="submit" variant="outline" size="sm" loading={renaming}>
                    Rename
                  </Button>
                </form>

                <form action={deleteActionFn}>
                  <input type="hidden" name="folderId" value={folder.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    loading={deletingFolder}
                    aria-label={`Delete ${folder.name}`}
                  >
                    <Trash2 aria-hidden="true" className="text-danger-600 size-4" />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </div>
  );
}
