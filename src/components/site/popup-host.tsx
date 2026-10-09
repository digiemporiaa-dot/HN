"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";
import { BuiltForm } from "./built-form";
import { PopupCard } from "./popup-card";
import { submitFormAction } from "@/server/forms/submit";
import { choosePopup, isAlwaysExcluded } from "@/lib/popups/rules";
import { createPopupMemory, type PopupMemory } from "@/lib/popups/storage";
import type { PublicPopup } from "@/server/popups/service";

/** Something else is already asking for the visitor's attention. */
function busy(): boolean {
  if (document.querySelector("dialog[open], [aria-modal='true']")) return true;
  // Someone typing into a form is not interrupted.
  const active = document.activeElement;
  return Boolean(active && active.closest("form") && active.matches("input, textarea, select"));
}

function scrolledPercent(): number {
  const doc = document.documentElement;
  const scrollable = doc.scrollHeight - window.innerHeight;
  if (scrollable <= 0) return 100;
  return (window.scrollY / scrollable) * 100;
}

/**
 * Opens at most one popup per visit to the site (one page load, however many
 * pages are browsed after it), chosen by the rules in src/lib/popups/rules.ts.
 * The list comes from /api/public/popups, which only ever returns public
 * fields. Nothing is fetched on pages no popup may cover.
 */
export function PopupHost() {
  const pathname = usePathname() ?? "/";
  const [popups, setPopups] = useState<PublicPopup[] | null>(null);
  const [open, setOpen] = useState<PublicPopup | null>(null);
  const shown = useRef(false);
  const memory = useRef<PopupMemory | null>(null);
  const loading = useRef(false);

  const excluded = isAlwaysExcluded(pathname);

  useEffect(() => {
    if (excluded || popups || loading.current) return;
    // Never inside the admin's preview frames.
    if (window.self !== window.top) return;
    loading.current = true;
    fetch("/api/public/popups", { credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : { popups: [] }))
      .then((data: { popups?: PublicPopup[] }) => setPopups(Array.isArray(data.popups) ? data.popups : []))
      .catch(() => setPopups([]));
  }, [excluded, popups]);

  useEffect(() => {
    if (excluded || !popups || popups.length === 0 || shown.current) return;
    memory.current ??= createPopupMemory();
    const store = memory.current;
    const isMobile = window.matchMedia("(max-width: 767px), (hover: none) and (pointer: coarse)").matches;

    const candidate = choosePopup(popups, {
      path: pathname,
      isMobile,
      now: Date.now(),
      session: store.session(),
      dismissals: store.dismissals(),
    });
    if (!candidate) return;

    let cancelled = false;
    const cleanups: Array<() => void> = [];
    const show = () => {
      if (cancelled || shown.current) return;
      if (busy()) {
        // Wait for the other dialog to close, then try once more.
        const retry = window.setTimeout(show, 2500);
        cleanups.push(() => window.clearTimeout(retry));
        return;
      }
      shown.current = true;
      setOpen(candidate);
    };

    switch (candidate.trigger) {
      case "IMMEDIATE": {
        const timer = window.setTimeout(show, 800);
        cleanups.push(() => window.clearTimeout(timer));
        break;
      }
      case "DELAY": {
        const timer = window.setTimeout(show, Math.max(0, candidate.delaySeconds) * 1000);
        cleanups.push(() => window.clearTimeout(timer));
        break;
      }
      case "SCROLL": {
        const onScroll = () => {
          if (scrolledPercent() >= candidate.scrollPercent) {
            window.removeEventListener("scroll", onScroll);
            show();
          }
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        cleanups.push(() => window.removeEventListener("scroll", onScroll));
        break;
      }
      case "EXIT_INTENT": {
        const onLeave = (event: MouseEvent) => {
          if (!event.relatedTarget && event.clientY <= 0) show();
        };
        // A moment's grace, so a pointer resting at the top on arrival does
        // not count as leaving.
        const arm = window.setTimeout(() => document.addEventListener("mouseout", onLeave), 3000);
        cleanups.push(() => {
          window.clearTimeout(arm);
          document.removeEventListener("mouseout", onLeave);
        });
        break;
      }
    }

    return () => {
      cancelled = true;
      for (const cleanup of cleanups) cleanup();
    };
  }, [excluded, popups, pathname]);

  const handled = useCallback((popup: PublicPopup) => {
    memory.current ??= createPopupMemory();
    memory.current.dismiss(popup.id, Date.now());
  }, []);

  const close = useCallback(() => {
    setOpen((current) => {
      if (current) handled(current);
      return null;
    });
  }, [handled]);

  // Leaving the page it opened on closes it (and counts as closing it).
  const openedOn = useRef(pathname);
  useEffect(() => {
    if (open) openedOn.current = pathname;
    // Only when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    if (open && pathname !== openedOn.current) close();
  }, [pathname, open, close]);

  if (!open) return null;
  return <PopupDialog popup={open} onClose={close} onHandled={() => handled(open)} />;
}

function PopupDialog({
  popup,
  onClose,
  onHandled,
}: {
  popup: PublicPopup;
  onClose: () => void;
  onHandled: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });

    const onCancel = (event: Event) => {
      event.preventDefault();
      onCloseRef.current();
    };
    dialog.addEventListener("cancel", onCancel);
    return () => {
      dialog.removeEventListener("cancel", onCancel);
      if (dialog.open) dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={popup.description ? descriptionId : undefined}
      aria-modal="true"
      onClick={(event) => {
        if (event.target === ref.current) onCloseRef.current();
      }}
      className={cn(
        "popup-dialog surface-reset m-auto max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-[1.25rem] bg-transparent p-0",
        "shadow-[0_32px_80px_-24px_rgb(11_13_15/0.45)] backdrop:bg-[rgb(7_19_22/0.55)] backdrop:backdrop-blur-[3px]",
        // Text alone reads better narrow; an image earns the wide split.
        popup.image ? "w-[min(47rem,calc(100vw-1.5rem))]" : "w-[min(34rem,calc(100vw-1.5rem))]",
      )}
    >
      <PopupCard
        content={popup}
        titleId={titleId}
        descriptionId={descriptionId}
        onClose={() => onCloseRef.current()}
        onCta={() => onCloseRef.current()}
        closeRef={closeRef}
        form={
          popup.form ? (
            <BuiltForm form={popup.form} action={submitFormAction} popupId={popup.id} onDone={onHandled} compact />
          ) : undefined
        }
      />
    </dialog>
  );
}
