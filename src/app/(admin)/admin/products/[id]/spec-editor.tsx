"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";

import { Button, Input } from "@/components/ui";
import { FormFeedback } from "@/components/admin/form-feedback";
import { RowControls, moveItem } from "@/components/admin/row-controls";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import type { InfoActionState } from "@/server/products/info-actions";

export type SpecItem = { label: string; value: string; unit: string };
export type SpecGroup = { label: string; items: SpecItem[] };

type InfoAction = (
  previous: InfoActionState,
  formData: FormData,
) => Promise<InfoActionState>;

const INITIAL: InfoActionState = {};

/**
 * A product's specifications: named groups, each holding labelled rows.
 *
 * Two levels deep is as far as this goes. A specification table that needs a
 * third level is a document, and the description field is where a document
 * belongs.
 */
export function SpecEditor({
  productId,
  groups: initial,
  version,
  saveAction,
  applyAction,
  templateName,
  readOnly,
}: {
  productId: string;
  groups: SpecGroup[];
  /** Changes only when a write lands, so edits survive a rejected save. */
  version: string;
  saveAction: InfoAction;
  applyAction: InfoAction;
  /** The template this product's category defines, if it has one. */
  templateName: string | null;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveAction, INITIAL);
  const [applyState, applyFormAction, applying] = useActionState(
    applyAction,
    INITIAL,
  );
  const [groups, setGroups] = useSyncedState(initial, version);

  const updateGroup = (index: number, next: Partial<SpecGroup>) =>
    setGroups((current) =>
      current.map((group, position) =>
        position === index ? { ...group, ...next } : group,
      ),
    );

  const updateItem = (
    groupIndex: number,
    itemIndex: number,
    next: Partial<SpecItem>,
  ) =>
    setGroups((current) =>
      current.map((group, position) =>
        position === groupIndex
          ? {
              ...group,
              items: group.items.map((item, itemPosition) =>
                itemPosition === itemIndex ? { ...item, ...next } : item,
              ),
            }
          : group,
      ),
    );

  const totalRows = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <div className="flex flex-col gap-6">
      {templateName ? (
        <form
          action={applyFormAction}
          className="border-line bg-surface-muted flex flex-wrap items-center justify-between gap-3 rounded-md border p-3.5"
        >
          <input type="hidden" name="productId" value={productId} />
          <p className="text-body-sm text-ink-muted">
            This category defines a template,{" "}
            <span className="text-ink font-medium">{templateName}</span>.
            Applying it adds any missing groups and rows; nothing already
            entered is changed or removed.
          </p>
          {readOnly ? null : (
            <Button
              type="submit"
              variant="outline"
              size="sm"
              loading={applying}
            >
              Apply template
            </Button>
          )}
        </form>
      ) : null}

      <FormFeedback state={applyState} />

      <form action={formAction} className="flex flex-col gap-5" noValidate>
        <input type="hidden" name="productId" value={productId} />
        {/* The whole structure is posted from state: it is two levels deep and
            ordered, neither of which form encoding can express. */}
        <input type="hidden" name="groups" value={JSON.stringify(groups)} />

        <FormFeedback state={state} />

        {groups.length === 0 ? (
          <p className="border-line text-body-sm text-ink-muted rounded-md border border-dashed p-6 text-center">
            No specifications yet.
            {templateName
              ? " Apply the template above, or add a group by hand."
              : " Add a group to start."}
          </p>
        ) : (
          <ol className="flex flex-col gap-5">
            {groups.map((group, groupIndex) => (
              <li
                key={groupIndex}
                className="border-line flex flex-col gap-3 rounded-lg border p-4"
              >
                <div className="flex items-start gap-3">
                  <Input
                    value={group.label}
                    disabled={readOnly}
                    placeholder="Group heading, e.g. Physical"
                    aria-label={`Group ${groupIndex + 1} heading`}
                    onChange={(event) =>
                      updateGroup(groupIndex, { label: event.target.value })
                    }
                  />
                  <RowControls
                    label={group.label || `group ${groupIndex + 1}`}
                    index={groupIndex}
                    count={groups.length}
                    disabled={readOnly}
                    onMove={(offset) =>
                      setGroups((current) =>
                        moveItem(current, groupIndex, offset),
                      )
                    }
                    onRemove={() =>
                      setGroups((current) =>
                        current.filter(
                          (_, position) => position !== groupIndex,
                        ),
                      )
                    }
                  />
                </div>

                <ol className="flex flex-col gap-2">
                  {group.items.map((item, itemIndex) => (
                    <li
                      key={itemIndex}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center"
                    >
                      <Input
                        value={item.label}
                        disabled={readOnly}
                        placeholder="Label"
                        aria-label={`Row ${itemIndex + 1} label in ${group.label || `group ${groupIndex + 1}`}`}
                        className="sm:flex-[2]"
                        onChange={(event) =>
                          updateItem(groupIndex, itemIndex, {
                            label: event.target.value,
                          })
                        }
                      />
                      <Input
                        value={item.value}
                        disabled={readOnly}
                        placeholder="Value"
                        aria-label={`Row ${itemIndex + 1} value in ${group.label || `group ${groupIndex + 1}`}`}
                        className="sm:flex-[3]"
                        onChange={(event) =>
                          updateItem(groupIndex, itemIndex, {
                            value: event.target.value,
                          })
                        }
                      />
                      <Input
                        value={item.unit}
                        disabled={readOnly}
                        placeholder="Unit"
                        aria-label={`Row ${itemIndex + 1} unit in ${group.label || `group ${groupIndex + 1}`}`}
                        className="sm:w-24"
                        onChange={(event) =>
                          updateItem(groupIndex, itemIndex, {
                            unit: event.target.value,
                          })
                        }
                      />
                      <RowControls
                        label={item.label || `row ${itemIndex + 1}`}
                        index={itemIndex}
                        count={group.items.length}
                        disabled={readOnly}
                        onMove={(offset) =>
                          updateGroup(groupIndex, {
                            items: moveItem(group.items, itemIndex, offset),
                          })
                        }
                        onRemove={() =>
                          updateGroup(groupIndex, {
                            items: group.items.filter(
                              (_, position) => position !== itemIndex,
                            ),
                          })
                        }
                      />
                    </li>
                  ))}
                </ol>

                {readOnly ? null : (
                  <div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updateGroup(groupIndex, {
                          items: [
                            ...group.items,
                            { label: "", value: "", unit: "" },
                          ],
                        })
                      }
                    >
                      <Plus aria-hidden="true" className="size-4" />
                      Add row
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}

        {readOnly ? null : (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={pending}>
              Save specifications
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setGroups((current) => [...current, { label: "", items: [] }])
              }
            >
              <Plus aria-hidden="true" className="size-4" />
              Add group
            </Button>
            <span className="text-caption text-ink-subtle">
              {groups.length} group{groups.length === 1 ? "" : "s"}, {totalRows}{" "}
              row{totalRows === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </form>
    </div>
  );
}
