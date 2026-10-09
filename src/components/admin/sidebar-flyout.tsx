"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

import { cn } from "@/lib/utils/cn";
import { iconForHref } from "./navigation";

/** Space kept between a flyout and the window edge. */
export const FLYOUT_EDGE = 8;
/** The invisible strip between the rail and the menu that still counts as "inside". */
export const FLYOUT_BRIDGE = 10;

/**
 * Where a flyout goes: beside the rail, its heading level with the icon that
 * opened it, moved up as far as needed to stay on screen, and never taller
 * than the window (it scrolls inside instead).
 */
export function placeFlyout(input: {
  triggerTop: number;
  railRight: number;
  menuHeight: number;
  viewportHeight: number;
}): { top: number; left: number; maxHeight: number } {
  const maxHeight = Math.max(120, input.viewportHeight - FLYOUT_EDGE * 2);
  const height = Math.min(input.menuHeight, maxHeight);
  let top = input.triggerTop - 6;
  if (top + height > input.viewportHeight - FLYOUT_EDGE) top = input.viewportHeight - FLYOUT_EDGE - height;
  if (top < FLYOUT_EDGE) top = FLYOUT_EDGE;
  return { top, left: input.railRight, maxHeight };
}

export type FlyoutItem = { label: string; href: string; available: boolean };

/**
 * The floating submenu of a module in the collapsed rail.
 *
 * Portalled to <body> so no scrolling or clipped ancestor can cut it off,
 * and fixed, so it sits over the page without moving anything. The wrapper
 * starts flush against the rail and is padded by FLYOUT_BRIDGE: that strip is
 * part of the menu as far as the pointer is concerned, so travelling from
 * the icon into the menu never crosses a gap that would close it.
 */
export function SidebarFlyout({
  id,
  label,
  items,
  activeHref,
  anchor,
  onPointerEnter,
  onPointerLeave,
  onNavigate,
  onKeyDown,
  menuRef,
  focusFirst = false,
}: {
  id: string;
  label: string;
  items: FlyoutItem[];
  activeHref: string | null;
  /** The trigger, for placing the menu. */
  anchor: HTMLElement;
  onPointerEnter: (event: PointerEvent) => void;
  onPointerLeave: (event: PointerEvent) => void;
  onNavigate: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  /** Move focus to the first entry once placed (opened with the arrow keys). */
  focusFirst?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; maxHeight: number } | null>(null);

  // Measured before paint, so the menu never flashes in the wrong place.
  useLayoutEffect(() => {
    const place = () => {
      const trigger = anchor.getBoundingClientRect();
      const rail = anchor.closest("aside")?.getBoundingClientRect();
      setPosition(
        placeFlyout({
          triggerTop: trigger.top,
          railRight: rail?.right ?? trigger.right,
          // Border included: the whole box has to fit, not just its contents.
          menuHeight: boxRef.current?.offsetHeight ?? 0,
          viewportHeight: window.innerHeight,
        }),
      );
    };
    place();
    // Fonts and the entrance animation can change the height after the
    // first measurement; keep the menu inside the window regardless.
    const observer = new ResizeObserver(place);
    if (boxRef.current) observer.observe(boxRef.current);
    window.addEventListener("resize", place);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
    };
  }, [anchor, items.length]);

  // Only once it is placed and visible: a hidden element cannot take focus.
  const placed = position !== null;
  useEffect(() => {
    if (placed && focusFirst) boxRef.current?.querySelector<HTMLElement>("a[href]")?.focus();
  }, [placed, focusFirst]);

  return createPortal(
    <div
      ref={menuRef}
      id={id}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onKeyDown={onKeyDown}
      data-sidebar-flyout=""
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        paddingLeft: FLYOUT_BRIDGE,
        visibility: position ? "visible" : "hidden",
      }}
      className="fixed z-[85]"
    >
      <div
        ref={boxRef}
        role="group"
        aria-label={label}
        // The menu tint at full strength: a list of links over a busy page
        // has to read cleanly, so nothing behind it shows through.
        style={{ maxHeight: position?.maxHeight, backgroundColor: "rgb(var(--admin-glass-tint))" }}
        className="glass-menu admin-fade-in flex w-60 flex-col overflow-hidden"
      >
        <p className="text-ink-muted border-line border-b px-3.5 pt-3 pb-2 text-[0.6875rem] font-semibold tracking-wider uppercase">
          {label}
        </p>
        <ul className="admin-scroll flex min-h-0 flex-col gap-0.5 overflow-y-auto p-1.5">
          {items.map((item) => {
            const Icon = iconForHref(item.href);
            const active = item.href === activeHref;
            const body = (
              <>
                {Icon ? <Icon aria-hidden="true" className={cn("size-4 shrink-0", active && "text-primary")} /> : null}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </>
            );
            return (
              <li key={item.href}>
                {item.available ? (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    data-active={active ? "true" : undefined}
                    className={cn(
                      "nav-item flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[0.875rem]",
                      active ? "font-medium" : "text-ink-muted hover:text-ink",
                    )}
                  >
                    {body}
                  </Link>
                ) : (
                  <span aria-disabled="true" className="text-ink-subtle flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[0.875rem]">
                    {body}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
