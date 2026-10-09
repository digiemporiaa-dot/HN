"use client";

import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import { announceEdit } from "@/lib/admin/unsaved-changes";

export type SegmentOption<T extends string> = {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
};

/**
 * A row of mutually exclusive choices with a sliding indicator.
 *
 * semantics "radio" (default) is a radiogroup for a value in a form; "tabs"
 * is a tablist driving panels (`panelId`). Roving tab index: Tab enters on
 * the selected option, arrows move and select, Home and End jump.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  semantics = "radio",
  variant = "pill",
  size = "md",
  fullWidth,
  name,
  idPrefix,
  panelId,
  className,
}: {
  value: T;
  onChange: (next: T) => void;
  options: SegmentOption<T>[];
  /** Accessible name of the group. */
  label: string;
  semantics?: "radio" | "tabs";
  variant?: "pill" | "underline";
  size?: "sm" | "md";
  fullWidth?: boolean;
  /** Posts the value as a hidden input (radio semantics). */
  name?: string;
  idPrefix?: string;
  panelId?: (value: T) => string;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<T, HTMLButtonElement>());
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);
  const tabs = semantics === "tabs";
  const pill = variant === "pill";

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const button = buttons.current.get(value);
      if (!button) return setThumb(null);
      setThumb({ left: button.offsetLeft, width: button.offsetWidth });
      // Keep the chosen option visible when the row scrolls sideways.
      const scroller = track.parentElement;
      if (scroller && scroller.scrollWidth > scroller.clientWidth) {
        const start = button.offsetLeft - 16;
        const end = button.offsetLeft + button.offsetWidth + 16;
        if (start < scroller.scrollLeft) scroller.scrollLeft = start;
        else if (end > scroller.scrollLeft + scroller.clientWidth) scroller.scrollLeft = end - scroller.clientWidth;
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    buttons.current.forEach((button) => observer.observe(button));
    return () => observer.disconnect();
  }, [value, options.length]);

  const enabled = options.filter((option) => !option.disabled);

  const select = (next: T, focus: boolean) => {
    if (next !== value) {
      announceEdit(trackRef.current);
      onChange(next);
    }
    if (focus) buttons.current.get(next)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = enabled.findIndex((option) => option.value === value);
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % enabled.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + enabled.length) % enabled.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = enabled.length - 1;
    if (next === null || !enabled[next]) return;
    event.preventDefault();
    select(enabled[next].value, true);
  };

  return (
    <div className={cn("scroll-x relative max-w-full", fullWidth ? "flex w-full" : "inline-flex", className)}>
      <div
        className={cn(
          pill ? "ui-segmented rounded-[0.8rem] p-[3px]" : "ui-tabstrip border-line border-b",
          fullWidth ? "flex w-full" : "inline-flex",
        )}
      >
        <div
          ref={trackRef}
          role={tabs ? "tablist" : "radiogroup"}
          aria-label={label}
          aria-orientation="horizontal"
          className={cn("relative flex min-w-max items-stretch", fullWidth && "w-full", pill ? "gap-0.5" : "gap-1")}
        >
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute transition-[transform,width] duration-200 ease-out motion-reduce:transition-none",
              pill ? "ui-segmented-thumb inset-y-0 rounded-[0.65rem]" : "ui-tabstrip-thumb bg-primary -bottom-px h-0.5 rounded-full",
              thumb ? "opacity-100" : "opacity-0",
            )}
            style={thumb ? { width: thumb.width, transform: `translateX(${thumb.left}px)` } : undefined}
          />
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                ref={(node) => {
                  if (node) buttons.current.set(option.value, node);
                  else buttons.current.delete(option.value);
                }}
                type="button"
                id={idPrefix ? `${idPrefix}${option.value}` : undefined}
                role={tabs ? "tab" : "radio"}
                aria-selected={tabs ? selected : undefined}
                aria-checked={tabs ? undefined : selected}
                aria-controls={tabs && panelId ? panelId(option.value) : undefined}
                aria-label={option.ariaLabel}
                tabIndex={selected ? 0 : -1}
                disabled={option.disabled}
                data-selected={selected ? "" : undefined}
                onClick={() => select(option.value, false)}
                onKeyDown={onKeyDown}
                className={cn(
                  "relative z-[1] inline-flex items-center justify-center gap-1.5 font-medium whitespace-nowrap transition-colors",
                  "focus-visible:ring-ring/70 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  fullWidth && "flex-1",
                  pill
                    ? cn("rounded-[0.65rem]", size === "sm" ? "min-h-7 px-2.5 text-[0.75rem]" : "min-h-8 px-3 text-[0.8125rem]")
                    : "rounded-t-lg px-3 py-2.5 text-[0.875rem]",
                  // Before the thumb is measured, the chosen option paints it.
                  selected && !thumb && pill && "ui-segmented-thumb",
                  selected ? "text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {option.icon}
                {option.label}
                {option.badge !== undefined ? (
                  <span className="ui-segmented-badge rounded-full px-1.5 text-[0.6875rem] font-semibold tabular-nums">
                    {option.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
      {name ? <input type="hidden" name={name} value={value} /> : null}
    </div>
  );
}
