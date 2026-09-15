"use client";

import { useState } from "react";

/**
 * Controlled form state that re-syncs when the server sends a newer record.
 *
 * Plain `useState` keeps what the editor typed when validation fails, which is
 * what we want — but it also means a *successful* save leaves the form showing
 * the pre-save values, silently diverging from what was stored. An editor who
 * publishes, sees "Saved", then presses save again would unpublish without
 * asking for it.
 *
 * `version` is a value that changes only when a write actually lands (the
 * record's updatedAt). Resetting on it gives both behaviours: edits survive a
 * rejected submit, and the form catches up after an accepted one.
 *
 * Assigning state during render is React's documented way to derive state from
 * props; it re-renders before committing rather than after painting.
 */
export function useSyncedState<T>(
  initial: T,
  version: string,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState(initial);
  const [seenVersion, setSeenVersion] = useState(version);

  if (seenVersion !== version) {
    setSeenVersion(version);
    setState(initial);
  }

  return [state, setState];
}
