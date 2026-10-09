"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { MenuItem } from "@/components/ui";
import {
  ADMIN_THEME_ATTRIBUTE,
  ADMIN_THEME_KEY,
  DARK_QUERY,
  isThemePreference,
  resolveTheme,
  type AdminAppliedTheme,
  type AdminThemePreference,
} from "@/lib/admin/theme";

type ThemeContextValue = {
  /** Null until mounted, so server and client markup agree. */
  preference: AdminThemePreference | null;
  applied: AdminAppliedTheme | null;
  setPreference: (next: AdminThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  preference: null,
  applied: null,
  setPreference: () => undefined,
});

export const useAdminTheme = () => useContext(ThemeContext);

function readPreference(): AdminThemePreference {
  try {
    const stored = localStorage.getItem(ADMIN_THEME_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

/** Applies a preference; a cross-fade when asked and motion is welcome. */
function apply(preference: AdminThemePreference, animate = false): AdminAppliedTheme {
  const next = resolveTheme(preference, window.matchMedia(DARK_QUERY).matches);
  const root = document.documentElement;
  if (root.getAttribute(ADMIN_THEME_ATTRIBUTE) === next) return next;
  const swap = () => root.setAttribute(ADMIN_THEME_ATTRIBUTE, next);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = (document as Document & { startViewTransition?: (callback: () => void) => unknown })
    .startViewTransition;
  if (animate && !reduced && typeof start === "function") start.call(document, swap);
  else swap();
  return next;
}

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<AdminThemePreference | null>(null);
  const [applied, setApplied] = useState<AdminAppliedTheme | null>(null);

  useEffect(() => {
    // Covers arriving by client-side navigation, where the inline script
    // in the layout has not run.
    const initial = readPreference();
    setPreferenceState(initial);
    setApplied(apply(initial));
  }, []);

  // Following the system while "system" is chosen.
  useEffect(() => {
    if (preference !== "system") return;
    const query = window.matchMedia(DARK_QUERY);
    const onChange = () => setApplied(apply("system", true));
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [preference]);

  // Another tab changed it.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== ADMIN_THEME_KEY) return;
      const next = isThemePreference(event.newValue) ? event.newValue : "system";
      setPreferenceState(next);
      setApplied(apply(next));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setPreference = useCallback((next: AdminThemePreference) => {
    try {
      localStorage.setItem(ADMIN_THEME_KEY, next);
    } catch {
      // Not remembered, still applied.
    }
    setPreferenceState(next);
    setApplied(apply(next, true));
  }, []);

  return <ThemeContext.Provider value={{ preference, applied, setPreference }}>{children}</ThemeContext.Provider>;
}

/**
 * Sun/Moon switch for the top bar. Always sets an explicit choice; "System"
 * lives in the account menu. Its position is pure CSS keyed on the html
 * attribute, so it is right from the first paint.
 */
export function ThemeSwitch({ className }: { className?: string }) {
  const { preference, applied, setPreference } = useAdminTheme();
  const dark = applied === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark appearance"
      title={`Switch to ${dark ? "light" : "dark"} appearance${preference === "system" ? " (currently following the system)" : ""}`}
      onClick={() => {
        const current = document.documentElement.getAttribute(ADMIN_THEME_ATTRIBUTE) === "dark";
        setPreference(current ? "light" : "dark");
      }}
      className={cn("theme-switch admin-focus-ring relative inline-flex h-8 w-[3.75rem] shrink-0 items-center rounded-full", className)}
    >
      <Sun aria-hidden="true" className="absolute left-[0.45rem] size-3.5 opacity-60" />
      <Moon aria-hidden="true" className="absolute right-[0.45rem] size-3.5 opacity-60" />
      <span className="theme-switch-thumb absolute left-[3px] flex size-[1.625rem] items-center justify-center rounded-full">
        <Sun aria-hidden="true" className="theme-switch-sun size-3.5" />
        <Moon aria-hidden="true" className="theme-switch-moon size-3.5" />
      </span>
    </button>
  );
}

export function ThemeMenuItems() {
  const { preference, setPreference } = useAdminTheme();
  const options: Array<[AdminThemePreference, string, ReactNode]> = [
    ["light", "Light", <Sun key="sun" />],
    ["dark", "Dark", <Moon key="moon" />],
    ["system", "System", <Monitor key="monitor" />],
  ];
  return (
    <>
      {options.map(([value, label, icon]) => (
        <MenuItem key={value} icon={icon} checked={preference === value} onClick={() => setPreference(value)}>
          {label}
        </MenuItem>
      ))}
    </>
  );
}
