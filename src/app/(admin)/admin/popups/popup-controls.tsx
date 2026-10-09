"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { ConfirmDialog, Menu, MenuItem, MenuSeparator, Switch, usePersistedToggle } from "@/components/ui";
import {
  deletePopupAction,
  duplicatePopupAction,
  setPopupActiveAction,
} from "@/server/popups/actions";

/**
 * The live on/off switch. It shows the new position while saving, and the
 * position the server actually stored once it answers — a refusal (no
 * permission, an unpublished form) puts it back and says why.
 */
export function PopupActiveSwitch({
  id,
  active,
  name,
  canPublish,
  withLabel,
}: {
  id: string;
  active: boolean;
  name: string;
  canPublish: boolean;
  withLabel?: boolean;
}) {
  const router = useRouter();
  const { checked, pending, error, toggle } = usePersistedToggle(active, async (next) => {
    const result = await setPopupActiveAction(id, next);
    router.refresh();
    return result.ok ? { ok: true, value: result.active } : { ok: false, error: result.error, value: result.active };
  });

  return (
    <div className="flex max-w-[16rem] flex-col items-start gap-1" data-unsaved-ignore>
      <Switch
        checked={checked}
        pending={pending}
        disabled={!canPublish}
        onChange={(next) => void toggle(next)}
        label={withLabel ? (checked ? "Active" : "Inactive") : undefined}
        hint={withLabel ? (canPublish ? "Saved as soon as you switch it." : "You cannot activate popups.") : undefined}
        aria-label={`${checked ? "Deactivate" : "Activate"} ${name}`}
        error={withLabel ? error : null}
        size={withLabel ? "md" : "sm"}
      />
      {!withLabel && error ? (
        <p role="alert" className="text-caption text-danger-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PopupRowActions({
  id,
  name,
  canEdit,
  canCreate,
  canDelete,
}: {
  id: string;
  name: string;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <>
      <Menu
        label={`Actions for ${name}`}
        triggerClassName="text-ink-muted hover:text-ink hover:bg-surface-muted size-9 justify-center rounded-lg"
        trigger={<MoreHorizontal aria-hidden="true" className="size-4" />}
      >
        <MenuItem href={`/admin/popups/${id}`} icon={<Pencil />}>
          {canEdit ? "Edit" : "View"}
        </MenuItem>
        <MenuItem href={`/admin/popups/${id}?preview=1`} icon={<Eye />}>
          Preview
        </MenuItem>
        {canCreate ? (
          <MenuItem
            icon={<Copy />}
            onClick={() => {
              const data = new FormData();
              data.set("popupId", id);
              void duplicatePopupAction(data);
            }}
          >
            Duplicate
          </MenuItem>
        ) : null}
        {canDelete ? (
          <>
            <MenuSeparator />
            <MenuItem tone="danger" icon={<Trash2 />} onClick={() => setConfirming(true)}>
              Delete
            </MenuItem>
          </>
        ) : null}
      </Menu>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        pending={pending}
        title="Delete this popup?"
        message={
          <>
            <strong className="text-ink">{name}</strong> stops showing at once and is removed from this list. The audit
            log keeps a record of it.
          </>
        }
        onConfirm={async () => {
          setPending(true);
          const data = new FormData();
          data.set("popupId", id);
          await deletePopupAction(data);
        }}
      />
    </>
  );
}

export function PopupEditLink({ id, label }: { id: string; label: string }) {
  return (
    <Link href={`/admin/popups/${id}`} className="text-ink hover:text-primary font-medium">
      {label}
    </Link>
  );
}
