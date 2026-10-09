/**
 * The outcome of saving a switch. Pure, so the rollback rules are tested
 * without a browser.
 */
export type ToggleSaveResult = { ok: true; value?: boolean } | { ok: false; error: string; value?: boolean };
export type ToggleSave = (next: boolean) => Promise<ToggleSaveResult>;

export const TOGGLE_NETWORK_ERROR = "Could not save. Check your connection and try again.";

/**
 * Saves `next` and returns what the switch should show afterwards: the value
 * the server reports when it reports one, `next` on success, and on refusal
 * or failure the server's value if given, otherwise the previous one. The
 * switch never stays in a position that was not stored.
 */
export async function settleToggle(
  previous: boolean,
  next: boolean,
  save: ToggleSave,
): Promise<{ value: boolean; error: string | null }> {
  try {
    const result = await save(next);
    if (result.ok) return { value: result.value ?? next, error: null };
    return { value: result.value ?? previous, error: result.error };
  } catch {
    return { value: previous, error: TOGGLE_NETWORK_ERROR };
  }
}
