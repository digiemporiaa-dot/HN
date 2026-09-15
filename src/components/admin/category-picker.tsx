"use client";

import { useMemo, useState } from "react";

import { Checkbox, Input } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import type { CategoryChoice } from "@/server/categories/service";

/**
 * Picks the categories an entity relates to.
 *
 * A checkbox list rather than a multi-select: the catalogue is a two-level tree
 * and an editor needs to see a subcategory sitting under its parent to pick the
 * right one. Filtering keeps it usable once the catalogue is large.
 *
 * Note what this component deliberately does NOT do: the checkboxes carry no
 * form `name`. A checkbox the filter has hidden is not in the DOM, so
 * submitting the rendered boxes would silently drop every link the editor had
 * filtered out of view. The owning form posts the selection from its own state.
 */
export function CategoryPicker({
  choices,
  selected,
  onToggle,
  disabled,
  emptyMessage,
}: {
  choices: CategoryChoice[];
  selected: Set<string>;
  onToggle: (id: string, on: boolean) => void;
  disabled: boolean;
  emptyMessage: string;
}) {
  const [filter, setFilter] = useState("");

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return choices;
    // A matching parent keeps its children visible, so narrowing to a category
    // does not hide the subcategory the editor is looking for.
    const matches = (choice: CategoryChoice) =>
      choice.name.toLowerCase().includes(needle) ||
      (choice.parentName ?? "").toLowerCase().includes(needle);
    return choices.filter(matches);
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
      <Input
        type="search"
        value={filter}
        disabled={disabled}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filter categories"
        aria-label="Filter categories"
      />

      <div className="border-line max-h-72 overflow-y-auto rounded-md border p-3">
        {visible.length === 0 ? (
          <p className="text-body-sm text-ink-muted py-2 text-center">
            No categories match that filter.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {visible.map((choice) => (
              <li key={choice.id}>
                <label
                  className={cn(
                    "text-body-sm text-ink flex items-center gap-2.5 py-1",
                    choice.depth === 1 && "pl-6",
                  )}
                >
                  {/* No `name`: the selection is submitted from state below,
                      so filtering the list cannot change what is saved. */}
                  <Checkbox
                    value={choice.id}
                    checked={selected.has(choice.id)}
                    disabled={disabled}
                    onChange={(event) =>
                      onToggle(choice.id, event.target.checked)
                    }
                  />
                  <span className={choice.depth === 0 ? "font-medium" : ""}>
                    {choice.name}
                  </span>
                  {choice.depth === 1 ? (
                    <span className="text-caption text-ink-subtle">
                      in {choice.parentName}
                    </span>
                  ) : null}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-caption text-ink-subtle">
        {selected.size} selected
      </p>
    </div>
  );
}
