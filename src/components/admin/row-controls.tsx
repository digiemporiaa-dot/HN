"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { Button } from "@/components/ui";

/**
 * Move and remove controls for one row of an ordered list.
 *
 * Buttons rather than drag handles: every editor in the admin is reachable from
 * a keyboard, and a drag target that only responds to a mouse would be the one
 * control that is not.
 */
export function RowControls({
  label,
  index,
  count,
  disabled,
  onMove,
  onRemove,
}: {
  /** Names the row in the button labels, e.g. "Dimensions". */
  label: string;
  index: number;
  count: number;
  disabled?: boolean;
  onMove: (offset: number) => void;
  onRemove: () => void;
}) {
  if (disabled) return null;

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={index === 0}
        onClick={() => onMove(-1)}
        aria-label={`Move ${label} up`}
      >
        <ArrowUp aria-hidden="true" className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={index === count - 1}
        onClick={() => onMove(1)}
        aria-label={`Move ${label} down`}
      >
        <ArrowDown aria-hidden="true" className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
      >
        <Trash2 aria-hidden="true" className="text-danger-600 size-4" />
      </Button>
    </div>
  );
}

/** Swaps an item with its neighbour, leaving the list alone at either end. */
export function moveItem<T>(list: T[], index: number, offset: number): T[] {
  const target = index + offset;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
