"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";

import { Button, Input } from "@/components/ui";
import { FormFeedback } from "@/components/admin/form-feedback";
import { RowControls, moveItem } from "@/components/admin/row-controls";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import type { SpecTemplateActionState } from "@/server/spec-templates/actions";

export type TemplateField = { label: string; unit: string };
export type TemplateGroup = { label: string; fields: TemplateField[] };

type TemplateAction = (
  previous: SpecTemplateActionState,
  formData: FormData,
) => Promise<SpecTemplateActionState>;

const INITIAL: SpecTemplateActionState = {};

/**
 * The specification fields every product in this category should carry.
 *
 * Deliberately not the same component as the product's own specification
 * editor, which it resembles. One declares which fields exist, the other
 * records their values, and they will grow apart rather than together: a
 * template will want field types and required flags, a product's copy will
 * want per-product notes. Sharing them now would mean a configuration flag for
 * every one of those.
 */
export function SpecTemplateEditor({
  categoryId,
  name: initialName,
  groups: initialGroups,
  version,
  saveAction,
  readOnly,
}: {
  categoryId: string;
  name: string;
  groups: TemplateGroup[];
  /** Changes only when a write lands, so edits survive a rejected save. */
  version: string;
  saveAction: TemplateAction;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveAction, INITIAL);
  const [form, setForm] = useSyncedState(
    { name: initialName, groups: initialGroups },
    version,
  );

  const setGroups = (next: TemplateGroup[]) =>
    setForm((current) => ({ ...current, groups: next }));

  const updateGroup = (index: number, next: Partial<TemplateGroup>) =>
    setGroups(
      form.groups.map((group, position) =>
        position === index ? { ...group, ...next } : group,
      ),
    );

  const fieldCount = form.groups.reduce(
    (sum, group) => sum + group.fields.length,
    0,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="categoryId" value={categoryId} />
      <input type="hidden" name="groups" value={JSON.stringify(form.groups)} />

      <FormFeedback state={state} />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="spec-template-name"
          className="text-label text-ink font-medium"
        >
          Template name
        </label>
        <Input
          id="spec-template-name"
          name="name"
          value={form.name}
          disabled={readOnly}
          placeholder="Ventilator specifications"
          onChange={(event) =>
            setForm((current) => ({ ...current, name: event.target.value }))
          }
        />
        {state.fieldErrors?.name ? (
          <p className="text-caption text-danger-700">
            {state.fieldErrors.name}
          </p>
        ) : null}
      </div>

      {form.groups.length === 0 ? (
        <p className="border-line text-body-sm text-ink-muted rounded-md border border-dashed p-6 text-center">
          No groups yet. Add one to describe what products in this category
          should specify.
        </p>
      ) : (
        <ol className="flex flex-col gap-4">
          {form.groups.map((group, groupIndex) => (
            <li
              key={groupIndex}
              className="border-line flex flex-col gap-3 rounded-lg border p-4"
            >
              <div className="flex items-start gap-3">
                <Input
                  value={group.label}
                  disabled={readOnly}
                  placeholder="Group heading, e.g. Performance"
                  aria-label={`Group ${groupIndex + 1} heading`}
                  onChange={(event) =>
                    updateGroup(groupIndex, { label: event.target.value })
                  }
                />
                <RowControls
                  label={group.label || `group ${groupIndex + 1}`}
                  index={groupIndex}
                  count={form.groups.length}
                  disabled={readOnly}
                  onMove={(offset) =>
                    setGroups(moveItem(form.groups, groupIndex, offset))
                  }
                  onRemove={() =>
                    setGroups(
                      form.groups.filter(
                        (_, position) => position !== groupIndex,
                      ),
                    )
                  }
                />
              </div>

              <ol className="flex flex-col gap-2">
                {group.fields.map((field, fieldIndex) => (
                  <li
                    key={fieldIndex}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center"
                  >
                    <Input
                      value={field.label}
                      disabled={readOnly}
                      placeholder="Field label"
                      aria-label={`Field ${fieldIndex + 1} label in ${group.label || `group ${groupIndex + 1}`}`}
                      className="sm:flex-1"
                      onChange={(event) =>
                        updateGroup(groupIndex, {
                          fields: group.fields.map((row, position) =>
                            position === fieldIndex
                              ? { ...row, label: event.target.value }
                              : row,
                          ),
                        })
                      }
                    />
                    <Input
                      value={field.unit}
                      disabled={readOnly}
                      placeholder="Unit"
                      aria-label={`Field ${fieldIndex + 1} unit in ${group.label || `group ${groupIndex + 1}`}`}
                      className="sm:w-28"
                      onChange={(event) =>
                        updateGroup(groupIndex, {
                          fields: group.fields.map((row, position) =>
                            position === fieldIndex
                              ? { ...row, unit: event.target.value }
                              : row,
                          ),
                        })
                      }
                    />
                    <RowControls
                      label={field.label || `field ${fieldIndex + 1}`}
                      index={fieldIndex}
                      count={group.fields.length}
                      disabled={readOnly}
                      onMove={(offset) =>
                        updateGroup(groupIndex, {
                          fields: moveItem(group.fields, fieldIndex, offset),
                        })
                      }
                      onRemove={() =>
                        updateGroup(groupIndex, {
                          fields: group.fields.filter(
                            (_, position) => position !== fieldIndex,
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
                        fields: [...group.fields, { label: "", unit: "" }],
                      })
                    }
                  >
                    <Plus aria-hidden="true" className="size-4" />
                    Add field
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
            Save template
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setGroups([...form.groups, { label: "", fields: [] }])
            }
          >
            <Plus aria-hidden="true" className="size-4" />
            Add group
          </Button>
          <span className="text-caption text-ink-subtle">
            {form.groups.length} group{form.groups.length === 1 ? "" : "s"},{" "}
            {fieldCount} field{fieldCount === 1 ? "" : "s"}
          </span>
        </div>
      )}
    </form>
  );
}
