"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils/cn";

/** A media query, false on the server and on the first client render. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const GAP = 6;
const EDGE = 8;

type Position = { top: number; left: number; maxHeight: number; placement: "below" | "above" };

/** Below the anchor unless there is more room above; kept inside the viewport. */
export function placePopover(
  rect: { top: number; bottom: number; left: number; right: number },
  panel: { width: number; height: number },
  viewport: { width: number; height: number },
  align: "start" | "end",
): Position {
  const spaceBelow = viewport.height - rect.bottom - GAP - EDGE;
  const spaceAbove = rect.top - GAP - EDGE;
  const placement = panel.height <= spaceBelow || spaceBelow >= spaceAbove ? "below" : "above";
  const maxHeight = Math.max(160, placement === "below" ? spaceBelow : spaceAbove);
  const shown = Math.min(panel.height, maxHeight);
  const top = placement === "below" ? rect.bottom + GAP : rect.top - GAP - shown;
  let left = align === "end" ? rect.right - panel.width : rect.left;
  left = Math.min(left, viewport.width - panel.width - EDGE);
  left = Math.max(EDGE, left);
  return { top, left, maxHeight, placement };
}

/**
 * A panel anchored to a control: a date picker, a filter. On a phone it is a
 * bottom sheet. Escape closes only the popover (not a dialog underneath) and
 * returns focus; a click or focus outside closes it.
 *
 * Portalled into the nearest dialog when there is one, so it stays inside
 * that dialog's focus trap and top layer, otherwise into <body>, which
 * carries the admin scope class.
 */
export function Popover({
  open,
  onClose,
  anchorRef,
  returnFocusRef,
  label,
  align = "start",
  className,
  sheetTitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  label: string;
  align?: "start" | "end";
  className?: string;
  sheetTitle?: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const compact = useMediaQuery("(max-width: 639px)");
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  const [host, setHost] = useState<Element | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    setHost(anchorRef.current?.closest("dialog,[role='dialog']") ?? document.body);
  }, [open, anchorRef]);

  useLayoutEffect(() => {
    if (!open || compact || !host) return;
    let frame = 0;
    const measure = () => {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;
      setPosition(
        placePopover(
          anchor.getBoundingClientRect(),
          { width: panel.offsetWidth, height: panel.scrollHeight },
          { width: document.documentElement.clientWidth, height: window.innerHeight },
          align,
        ),
      );
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    if (panelRef.current) observer.observe(panelRef.current);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, [open, compact, host, anchorRef, align]);

  useEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const inside = (node: EventTarget | null) =>
      node instanceof Node && (panelRef.current?.contains(node) || anchorRef.current?.contains(node));
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      event.preventDefault();
      onCloseRef.current();
      (returnFocusRef?.current ?? anchorRef.current)?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!inside(event.target)) onCloseRef.current();
    };
    const onFocus = (event: FocusEvent) => {
      if (event.target === document.body) return;
      if (!inside(event.target)) onCloseRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("focusin", onFocus);
    let previousOverflow = "";
    if (compact) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("focusin", onFocus);
      if (compact) document.body.style.overflow = previousOverflow;
    };
  }, [open, compact, anchorRef, returnFocusRef]);

  if (!open || !host) return null;

  if (compact) {
    return createPortal(
      <div className="fixed inset-0 z-[70] flex items-end">
        <div className="admin-scrim absolute inset-0 bg-black/30" aria-hidden="true" />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="ui-popover ui-popover-sheet bg-surface border-line relative max-h-[88dvh] w-full overflow-y-auto rounded-t-[var(--admin-radius-dialog,1.25rem)] border-t px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <div aria-hidden="true" className="bg-line-strong mx-auto mb-2 h-1 w-9 rounded-full" />
          {sheetTitle ? <p className="text-body-sm text-ink mb-2 text-center font-semibold">{sheetTitle}</p> : null}
          {children}
        </div>
      </div>,
      host,
    );
  }

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={label}
      data-placement={position?.placement}
      style={{
        position: "fixed",
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        maxHeight: position?.maxHeight,
        opacity: position ? 1 : 0,
        pointerEvents: position ? undefined : "none",
      }}
      className={cn(
        "ui-popover glass-menu border-line bg-surface z-[40] overflow-y-auto rounded-2xl border p-3 shadow-xl",
        position && "admin-pop-in",
        className,
      )}
    >
      {children}
    </div>,
    host,
  );
}
