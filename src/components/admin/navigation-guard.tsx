"use client";

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { ConfirmDialog } from "@/components/ui";
import {
  hasUnsavedChanges,
  resetFormEdits,
  subscribeUnsaved,
  trackFormEdits,
} from "@/lib/admin/unsaved-changes";

const GuardContext = createContext<(href: string) => void>(() => undefined);

/** Navigate, asking first if the screen has unsaved edits. */
export const useGuardedNavigate = () => useContext(GuardContext);

export function useHasUnsavedChanges(): boolean {
  return useSyncExternalStore(subscribeUnsaved, hasUnsavedChanges, () => false);
}

/**
 * Watches <main> for edits and stands between them and leaving:
 * in-app links (sidebar, breadcrumbs, any anchor) and the command palette
 * ask before discarding; closing or reloading the tab gets the browser's own
 * warning. Filter and search forms never count as edits.
 */
export function NavigationGuard({
  mainId,
  children,
}: {
  mainId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    const main = document.getElementById(mainId);
    if (!main) return;
    return trackFormEdits(main);
  }, [mainId]);

  // A new screen starts clean.
  useEffect(() => {
    resetFormEdits();
  }, [pathname]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!hasUnsavedChanges()) return;
      event.preventDefault();
      event.stopPropagation();
      setPending(url.pathname + url.search + url.hash);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      if (hasUnsavedChanges()) setPending(href);
      else router.push(href);
    },
    [router],
  );

  return (
    <GuardContext.Provider value={navigate}>
      {children}
      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        title="Leave without saving?"
        message="This screen has changes that have not been saved. Leaving now discards them."
        confirmLabel="Leave page"
        onConfirm={() => {
          const href = pending;
          setPending(null);
          resetFormEdits();
          if (href) router.push(href);
        }}
      />
    </GuardContext.Provider>
  );
}
