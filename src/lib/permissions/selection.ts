import { ALL_PERMISSION_IDS, parsePermissionId, requiredFor } from "./registry";

/**
 * How the role editor's checkboxes change a selection. Pure, so the rules
 * are tested.
 *
 *   - Ticking an action also ticks its resource's View.
 *   - Clearing View clears the resource's other actions.
 *   - A group (module or resource) box selects or clears only the valid
 *     actions inside it, and only those the editor may change ("locked"
 *     ones — permissions the editor does not hold — never move).
 *   - If clearing would leave a locked action without its View, the View
 *     stays: the selection is never put in a state the server refuses.
 */

export type GroupState = "all" | "none" | "some";

export function groupState(selected: ReadonlySet<string>, ids: readonly string[]): GroupState {
  if (ids.length === 0) return "none";
  let count = 0;
  for (const id of ids) if (selected.has(id)) count += 1;
  return count === 0 ? "none" : count === ids.length ? "all" : "some";
}

function dependentsOf(view: string, pool: readonly string[]): string[] {
  return pool.filter((id) => requiredFor(id) === view);
}

/** Restores the View of every selected action that lost it. */
function keepViews(next: Set<string>): Set<string> {
  for (const id of [...next]) {
    const view = requiredFor(id);
    if (view) next.add(view);
  }
  return next;
}

export function toggleAction(
  selected: ReadonlySet<string>,
  id: string,
  on: boolean,
  locked: ReadonlySet<string> = new Set(),
): Set<string> {
  const next = new Set(selected);
  if (locked.has(id) || !parsePermissionId(id)) return next;
  if (on) {
    next.add(id);
    const view = requiredFor(id);
    if (view && !locked.has(view)) next.add(view);
    return next;
  }
  next.delete(id);
  if (!requiredFor(id)) {
    for (const dependent of dependentsOf(id, ALL_PERMISSION_IDS)) {
      if (!locked.has(dependent)) next.delete(dependent);
    }
  }
  return keepViews(next);
}

export function setGroup(
  selected: ReadonlySet<string>,
  ids: readonly string[],
  on: boolean,
  locked: ReadonlySet<string> = new Set(),
): Set<string> {
  const next = new Set(selected);
  for (const id of ids) {
    if (locked.has(id) || !parsePermissionId(id)) continue;
    if (on) next.add(id);
    else next.delete(id);
  }
  if (on) {
    for (const id of ids) {
      const view = requiredFor(id);
      if (view && !locked.has(view)) next.add(view);
    }
    return next;
  }
  return keepViews(next);
}

export function selectionDiff(initial: ReadonlySet<string>, selected: ReadonlySet<string>) {
  return {
    granted: ALL_PERMISSION_IDS.filter((id) => selected.has(id) && !initial.has(id)),
    revoked: ALL_PERMISSION_IDS.filter((id) => initial.has(id) && !selected.has(id)),
  };
}
