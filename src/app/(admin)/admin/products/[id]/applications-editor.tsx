"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui";
import { CheckboxPicker } from "@/components/admin/checkbox-picker";
import { FormFeedback } from "@/components/admin/form-feedback";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import type { InfoActionState } from "@/server/products/info-actions";
import type { NamedChoice } from "@/server/products/service";

type InfoAction = (
  previous: InfoActionState,
  formData: FormData,
) => Promise<InfoActionState>;

const INITIAL: InfoActionState = {};

/** The procedures this product is bought to perform. */
export function ApplicationsEditor({
  productId,
  selected: initial,
  version,
  choices,
  saveAction,
  readOnly,
}: {
  productId: string;
  selected: string[];
  version: string;
  choices: NamedChoice[];
  saveAction: InfoAction;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveAction, INITIAL);
  const [ids, setIds] = useSyncedState(initial, version);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="productId" value={productId} />

      {/* Posted from state rather than from the rendered checkboxes: a box the
          filter has hidden is not in the DOM, and submitting only the visible
          ones would silently unlink everything out of view. */}
      {ids.map((id) => (
        <input key={id} type="hidden" name="applicationIds" value={id} />
      ))}

      <FormFeedback state={state} />

      <CheckboxPicker
        choices={choices}
        selected={new Set(ids)}
        disabled={readOnly}
        filterLabel="Filter applications"
        emptyMessage="No applications yet. Add them under Applications."
        onToggle={(id, on) =>
          setIds((current) =>
            on ? [...current, id] : current.filter((value) => value !== id),
          )
        }
      />

      {readOnly ? null : (
        <div>
          <Button type="submit" loading={pending}>
            Save applications
          </Button>
        </div>
      )}
    </form>
  );
}
