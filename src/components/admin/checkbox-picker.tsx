"use client";

import { useMemo, useState } from "react";

import { Checkbox, Input } from "@/components/ui";

export type PickerChoice = { id: string; name: string };

/**
 * Picks several rows from a flat list.
 *
 * Like the category picker, the checkboxes carry no form `name`: a checkbox the
 * filter has hidden is not in the DOM, so submitting the rendered boxes would
 * silently drop every selection filtered out of view. The owning form posts the
 * selection from its own state.
 */
export function CheckboxPicker({
  choices,
  selected,
  onToggle,
  disabled,
  filterLabel,
  emptyMessage,
}: {
  choices: PickerChoice[];
  selected: Set<string>;
  onToggle: (id: string, on: boolean) => void;
  disabled: boolean;
  filterLabel: string;
  emptyMessage: string;
}) {
  const [filter, setFilter] = useState("");

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return choices;
    return choices.filter((choice) =>
      choice.name.toLowerCase().includes(needle),
    );
  }, [choices, filter]);

  if (choices.length === 0) {
    return (
      <p className="border-line text-body-sm text-ink-muted rounded-md border border-dashed p-4">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {choices.length > 8 ? (
        <Input
          type="search"
          value={filter}
          disabled={disabled}
          onChange={(event) => setFilter(event.target.value)}
          placeholder={filterLabel}
          aria-label={filterLabel}
        />
      ) : null}

      <div className="border-line max-h-56 overflow-y-auto rounded-md border p-3">
        {visible.length === 0 ? (
          <p className="text-body-sm text-ink-muted py-2 text-center">
            Nothing matches that filter.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {visible.map((choice) => (
              <li key={choice.id}>
                <label className="text-body-sm text-ink flex items-center gap-2.5 py-1">
                  <Checkbox
                    value={choice.id}
                    checked={selected.has(choice.id)}
                    disabled={disabled}
                    onChange={(event) =>
                      onToggle(choice.id, event.target.checked)
                    }
                  />
                  {choice.name}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-caption text-ink-subtle">{selected.size} selected</p>
    </div>
  );
}
