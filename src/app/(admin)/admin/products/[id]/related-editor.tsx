"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

import { Button, Input, Modal } from "@/components/ui";
import { FormFeedback } from "@/components/admin/form-feedback";
import { RowControls, moveItem } from "@/components/admin/row-controls";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import type { InfoActionState } from "@/server/products/info-actions";

export type RelatableProduct = { id: string; name: string; group: string };

type InfoAction = (
  previous: InfoActionState,
  formData: FormData,
) => Promise<InfoActionState>;

const INITIAL: InfoActionState = {};

/**
 * The products shown alongside this one.
 *
 * Ordered, because the first suggestion is the one that gets clicked, and
 * chosen from a searchable list rather than a set of checkboxes: a catalogue
 * has more products than anyone will scroll past.
 */
export function RelatedEditor({
  productId,
  related: initial,
  version,
  choices,
  saveAction,
  readOnly,
}: {
  productId: string;
  related: string[];
  version: string;
  choices: RelatableProduct[];
  saveAction: InfoAction;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveAction, INITIAL);
  const [ids, setIds] = useSyncedState(initial, version);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const byId = new Map(choices.map((choice) => [choice.id, choice]));

  const needle = query.trim().toLowerCase();
  const available = choices.filter(
    (choice) =>
      !ids.includes(choice.id) &&
      (!needle ||
        choice.name.toLowerCase().includes(needle) ||
        choice.group.toLowerCase().includes(needle)),
  );

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="relatedIds" value={JSON.stringify(ids)} />

      <FormFeedback state={state} />

      {ids.length === 0 ? (
        <p className="border-line text-body-sm text-ink-muted rounded-md border border-dashed p-6 text-center">
          No related products yet.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {ids.map((id, index) => {
            const choice = byId.get(id);
            return (
              <li
                key={id}
                className="border-line bg-surface flex items-center gap-3 rounded-md border p-3"
              >
                <span className="text-caption text-ink-subtle w-5 shrink-0 text-right">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-body-sm text-ink block truncate font-medium">
                    {choice?.name ?? "This product is no longer available."}
                  </span>
                  {choice ? (
                    <span className="text-caption text-ink-subtle block truncate">
                      {choice.group}
                    </span>
                  ) : null}
                </span>
                <RowControls
                  label={choice?.name ?? `item ${index + 1}`}
                  index={index}
                  count={ids.length}
                  disabled={readOnly}
                  onMove={(offset) =>
                    setIds((current) => moveItem(current, index, offset))
                  }
                  onRemove={() =>
                    setIds((current) => current.filter((value) => value !== id))
                  }
                />
              </li>
            );
          })}
        </ol>
      )}

      {readOnly ? null : (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={pending}>
            Save related products
          </Button>
          <Button type="button" variant="outline" onClick={() => setOpen(true)}>
            <Plus aria-hidden="true" className="size-4" />
            Add a product
          </Button>
          <span className="text-caption text-ink-subtle">
            {ids.length} of 12
          </span>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add a related product"
        description="This product is not offered, and neither are products already on the list."
        size="lg"
      >
        <div className="flex flex-col gap-4">
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, model or category"
            aria-label="Search products"
          />

          {available.length === 0 ? (
            <p className="text-body-sm text-ink-muted py-6 text-center">
              {choices.length === 0
                ? "There are no other products in the catalogue yet."
                : "Nothing else matches."}
            </p>
          ) : (
            <ul className="flex max-h-96 flex-col gap-1.5 overflow-y-auto">
              {available.slice(0, 50).map((choice) => (
                <li key={choice.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setIds((current) => [...current, choice.id]);
                      setOpen(false);
                    }}
                    className="border-line hover:border-line-strong flex w-full flex-col gap-0.5 rounded-md border p-3 text-left transition-colors"
                  >
                    <span className="text-body-sm text-ink truncate font-medium">
                      {choice.name}
                    </span>
                    <span className="text-caption text-ink-subtle truncate">
                      {choice.group}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </form>
  );
}
