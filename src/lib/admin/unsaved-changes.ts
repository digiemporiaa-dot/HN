"use client";

import { useEffect, useId } from "react";

/**
 * Whether the admin screen has edits that have not been saved.
 *
 * Two sources. Native fields inside an editing <form> are noticed by listening
 * on <main> (`trackFormEdits`); controls that fire no native event — a switch,
 * a date picker — announce themselves with `announceEdit`. Components that
 * know their own dirty state register it with `useUnsavedChanges`.
 *
 * Filter and search forms are not edits: an explicit method="get", a
 * role="search" region, [data-unsaved-ignore], a search box and an unnamed
 * checkbox (row selection) are all ignored. `form.method` reads "get" for a
 * form with no attribute at all, so only the attribute itself counts.
 */

export const EDIT_EVENT = "admin:edit";

const owners = new Set<string>();
let formEdited = false;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function hasUnsavedChanges(): boolean {
  return formEdited || owners.size > 0;
}

/** Subscribe to changes of `hasUnsavedChanges()`. */
export function subscribeUnsaved(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetFormEdits(): void {
  if (!formEdited) return;
  formEdited = false;
  notify();
}

export function announceEdit(target: Element | null | undefined): void {
  target?.dispatchEvent(new CustomEvent(EDIT_EVENT, { bubbles: true }));
}

/** For components that know whether they hold unsaved state. */
export function useUnsavedChanges(dirty: boolean): void {
  const id = useId();
  useEffect(() => {
    if (dirty) owners.add(id);
    else owners.delete(id);
    notify();
    return () => {
      owners.delete(id);
      notify();
    };
  }, [dirty, id]);
}

export function isEditTarget(target: EventTarget | null, root: HTMLElement): boolean {
  if (!(target instanceof HTMLElement) || !root.contains(target)) return false;
  const form = target.closest("form");
  if (!form || form.getAttribute("method")?.toLowerCase() === "get") return false;
  if (target.closest('[role="search"],[data-unsaved-ignore]')) return false;
  if (
    target instanceof HTMLInputElement &&
    (target.type === "search" || (target.type === "checkbox" && !target.name))
  ) {
    return false;
  }
  return true;
}

/**
 * Watches a subtree for edits. A submit clears the flag; the screen the
 * save lands on starts clean, and `resetFormEdits` is called on navigation.
 */
export function trackFormEdits(root: HTMLElement): () => void {
  const onEdit = (event: Event) => {
    if (!formEdited && isEditTarget(event.target, root)) {
      formEdited = true;
      notify();
    }
  };
  const onSubmit = (event: Event) => {
    const form = event.target as HTMLFormElement | null;
    if (form?.getAttribute("method")?.toLowerCase() === "get") return;
    resetFormEdits();
  };
  root.addEventListener("input", onEdit, true);
  root.addEventListener("change", onEdit, true);
  root.addEventListener(EDIT_EVENT, onEdit, true);
  root.addEventListener("submit", onSubmit, true);
  return () => {
    root.removeEventListener("input", onEdit, true);
    root.removeEventListener("change", onEdit, true);
    root.removeEventListener(EDIT_EVENT, onEdit, true);
    root.removeEventListener("submit", onSubmit, true);
  };
}
