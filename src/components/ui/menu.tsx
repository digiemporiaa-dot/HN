"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const ITEM_SELECTOR = '[role="menuitem"]:not([aria-disabled="true"]),[role="menuitemradio"]';

/**
 * A button that opens a list of actions. Arrow keys move through the items,
 * Escape closes and returns focus to the button, a click outside closes, and
 * choosing an item closes.
 */
export function Menu({
  trigger,
  label,
  align = "right",
  className,
  triggerClassName,
  panelClassName,
  children,
}: {
  trigger: ReactNode;
  /** Accessible name of the button. */
  label: string;
  align?: "left" | "right";
  className?: string;
  triggerClassName?: string;
  panelClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    panelRef.current?.querySelector<HTMLElement>(ITEM_SELECTOR)?.focus();
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && open) {
      event.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }
    if (event.key === "Tab" && open) {
      setOpen(false);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    if (!open) {
      setOpen(true);
      return;
    }
    const items = [...(panelRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? [])];
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : event.key === "ArrowDown"
            ? (index + 1) % items.length
            : (index - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  return (
    <div ref={rootRef} className={cn("relative", className)} onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        className={cn("admin-focus-ring flex items-center", triggerClassName)}
      >
        {trigger}
      </button>
      {open ? (
        <div
          ref={panelRef}
          id={id}
          role="menu"
          aria-label={label}
          onClick={(event) => {
            const item = (event.target as HTMLElement).closest('[role="menuitem"],[role="menuitemradio"]');
            if (!item) return;
            // A submit item posts its form first; closing at once would take
            // the form out of the document and the browser would cancel it.
            if (item.matches('button[type="submit"]')) window.setTimeout(() => setOpen(false), 0);
            else setOpen(false);
          }}
          className={cn(
            "glass-menu admin-pop-in absolute top-full z-[40] mt-2 w-60 max-w-[calc(100vw-1.5rem)] overflow-hidden p-1.5",
            align === "right" ? "right-0" : "left-0",
            panelClassName,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function MenuItem({
  href,
  onClick,
  icon,
  tone,
  checked,
  external,
  disabled,
  submit,
  children,
}: {
  href?: string;
  /** A submit button, for an item that posts its surrounding form. */
  submit?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  tone?: "danger";
  /** Makes it a radio item (theme choices). */
  checked?: boolean;
  external?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  const className = cn(
    "flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-[0.875rem] transition-colors outline-none",
    "focus-visible:bg-surface-muted hover:bg-surface-muted",
    tone === "danger" ? "text-danger-600" : "text-ink",
    disabled && "pointer-events-none opacity-50",
  );
  const role = checked === undefined ? "menuitem" : "menuitemradio";
  const content = (
    <>
      {icon ? <span className="text-ink-muted flex size-4 shrink-0 items-center [&>svg]:size-4">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {checked ? <Check aria-hidden="true" className="text-primary size-4 shrink-0" /> : null}
    </>
  );

  if (href) {
    return external ? (
      <a href={href} target="_blank" rel="noopener noreferrer" role={role} tabIndex={-1} className={className}>
        {content}
      </a>
    ) : (
      <Link href={href} role={role} tabIndex={-1} aria-checked={checked} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type={submit ? "submit" : "button"}
      role={role}
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      tabIndex={-1}
      onClick={onClick}
      className={className}
    >
      {content}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <p role="presentation" className="text-ink-muted px-3 pt-2 pb-1 text-[0.6875rem] font-semibold tracking-wider uppercase">
      {children}
    </p>
  );
}

export function MenuSeparator() {
  return <div role="separator" className="bg-line my-1 h-px" />;
}
