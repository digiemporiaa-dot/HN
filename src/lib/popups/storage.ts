import type { DismissalRecord } from "./rules";

/**
 * Where the browser remembers which popups a visitor has closed.
 *
 * localStorage when it works; when it does not (private mode, storage
 * disabled, quota full) an in-memory copy for the life of the page, so a
 * closed popup still stays closed until the visitor leaves — never reopened
 * on the next route change because a write failed.
 */

export const DISMISSALS_KEY = "hn:popups:dismissed";
export const SESSION_KEY = "hn:popups:session";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function safe(get: () => StorageLike | null | undefined): StorageLike | null {
  try {
    return get() ?? null;
  } catch {
    return null;
  }
}

export function createPopupMemory(
  local: StorageLike | null = safe(() => window.localStorage),
  session: StorageLike | null = safe(() => window.sessionStorage),
) {
  let memory: Record<string, DismissalRecord> = {};
  let sessionId: string | null = null;

  const read = (): Record<string, DismissalRecord> => {
    try {
      const raw = local?.getItem(DISMISSALS_KEY);
      if (!raw) return memory;
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object") return memory;
      const result: Record<string, DismissalRecord> = { ...memory };
      for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
        const record = value as Partial<DismissalRecord> | null;
        if (record && typeof record.at === "number" && typeof record.session === "string") {
          result[id] = { at: record.at, session: record.session };
        }
      }
      return result;
    } catch {
      return memory;
    }
  };

  return {
    /** A random id for this browser session (tab lifetime, survives reloads). */
    session(): string {
      if (sessionId) return sessionId;
      try {
        const existing = session?.getItem(SESSION_KEY);
        if (existing) return (sessionId = existing);
      } catch {
        // fall through to a fresh id
      }
      sessionId = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
      try {
        session?.setItem(SESSION_KEY, sessionId);
      } catch {
        // memory only
      }
      return sessionId;
    },
    dismissals: read,
    dismiss(id: string, at: number): void {
      const record = { at, session: this.session() };
      memory = { ...memory, [id]: record };
      try {
        const all = read();
        all[id] = record;
        // Bounded: only the most recent fifty are kept.
        const trimmed = Object.fromEntries(
          Object.entries(all)
            .sort((a, b) => b[1].at - a[1].at)
            .slice(0, 50),
        );
        local?.setItem(DISMISSALS_KEY, JSON.stringify(trimmed));
      } catch {
        // memory only
      }
    },
  };
}

export type PopupMemory = ReturnType<typeof createPopupMemory>;
