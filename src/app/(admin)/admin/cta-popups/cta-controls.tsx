"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button, ConfirmDialog, Switch, usePersistedToggle } from "@/components/ui";
import { deleteCtaConfigAction, setCtaConfigActiveAction } from "@/server/cta/admin-actions";

/** The live on/off switch: shows what the server actually stored. */
export function CtaActiveSwitch({
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
    const result = await setCtaConfigActiveAction(id, next);
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
        hint={withLabel ? (canPublish ? "Saved as soon as you switch it." : "You cannot publish CTA popups.") : undefined}
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

export function DeleteCtaConfigButton({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(true)}>
        <Trash2 aria-hidden="true" className="size-4" />
        Delete
      </Button>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Delete ${name}?`}
        message="Buttons using it fall back to the default for their kind, or their built-in behaviour. Leads keep its key."
        confirmLabel="Delete"
        tone="danger"
        pending={pending}
        onConfirm={() => {
          setPending(true);
          const data = new FormData();
          data.set("configId", id);
          void deleteCtaConfigAction(data);
        }}
      />
    </>
  );
}
