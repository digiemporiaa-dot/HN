"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button, Input, Modal, StatusBadge } from "@/components/ui";
import { RowControls, moveItem } from "@/components/admin/row-controls";
import { ENTITY_LABELS, type EntityKind } from "@/cms/sections/entity-kinds";
import type { EntityChoice } from "@/server/cms/catalogue-choices";

/**
 * Picks catalogue records for a section, in the order they should appear.
 *
 * A searchable list rather than checkboxes: a catalogue has more products than
 * anyone will scroll past, and the order is part of the answer — the first card
 * in a grid is the one that gets clicked.
 */
export function EntityPicker({
  entity,
  value,
  choices,
  max,
  disabled,
  onChange,
}: {
  entity: EntityKind;
  value: string[];
  choices: EntityChoice[];
  max: number;
  disabled?: boolean;
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const byId = new Map(choices.map((choice) => [choice.id, choice]));
  const words = ENTITY_LABELS[entity];

  const needle = query.trim().toLowerCase();
  const available = choices.filter(
    (choice) =>
      !value.includes(choice.id) &&
      (!needle ||
        choice.name.toLowerCase().includes(needle) ||
        choice.group.toLowerCase().includes(needle)),
  );

  const full = value.length >= max;

  return (
    <div className="flex flex-col gap-3">
      {value.length === 0 ? (
        <p className="border-line text-body-sm text-ink-muted rounded-md border border-dashed p-4">
          No {words.many} chosen yet.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {value.map((id, index) => {
            const choice = byId.get(id);
            return (
              <li
                key={id}
                className="border-line bg-surface flex items-center gap-3 rounded-md border p-2.5"
              >
                <span className="text-caption text-ink-subtle w-5 shrink-0 text-right">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-body-sm text-ink block truncate font-medium">
                    {choice?.name ??
                      `This ${words.one} is no longer available.`}
                  </span>
                  {choice?.group ? (
                    <span className="text-caption text-ink-subtle block truncate">
                      {choice.group}
                    </span>
                  ) : null}
                </span>
                {choice && choice.status !== "PUBLISHED" ? (
                  <StatusBadge status={choice.status} />
                ) : null}
                <RowControls
                  label={choice?.name ?? `item ${index + 1}`}
                  index={index}
                  count={value.length}
                  disabled={disabled}
                  onMove={(offset) => onChange(moveItem(value, index, offset))}
                  onRemove={() =>
                    onChange(value.filter((current) => current !== id))
                  }
                />
              </li>
            );
          })}
        </ol>
      )}

      {disabled ? null : (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={full}
            onClick={() => setOpen(true)}
          >
            <Plus aria-hidden="true" className="size-4" />
            Add {max === 1 ? `a ${words.one}` : words.many}
          </Button>
          <span className="text-caption text-ink-subtle">
            {value.length} of {max}
          </span>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Add ${max === 1 ? `a ${words.one}` : words.many}`}
        description={`Anything still in draft is marked — it will not appear on the public page until it is published.`}
        size="lg"
      >
        <div className="flex flex-col gap-4">
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name"
            aria-label={`Search ${words.many}`}
          />

          {available.length === 0 ? (
            <p className="text-body-sm text-ink-muted py-6 text-center">
              {choices.length === 0
                ? `There are no ${words.many} in the catalogue yet.`
                : "Nothing else matches."}
            </p>
          ) : (
            <ul className="flex max-h-96 flex-col gap-1.5 overflow-y-auto">
              {available.slice(0, 60).map((choice) => (
                <li key={choice.id}>
                  <button
                    type="button"
                    onClick={() => {
                      // A picker capped at one replaces rather than refusing:
                      // choosing a different product is the obvious intent.
                      onChange(max === 1 ? [choice.id] : [...value, choice.id]);
                      setOpen(false);
                    }}
                    className="border-line hover:border-line-strong flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="text-body-sm text-ink block truncate font-medium">
                        {choice.name}
                      </span>
                      {choice.group ? (
                        <span className="text-caption text-ink-subtle block truncate">
                          {choice.group}
                        </span>
                      ) : null}
                    </span>
                    {choice.status !== "PUBLISHED" ? (
                      <StatusBadge status={choice.status} />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </div>
  );
}
