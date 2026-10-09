"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { iconForHref, isNavItemActive, type VisibleNav } from "./navigation";

/**
 * The floating navigation rail.
 *
 * lg and up: a glass rail 256px wide (76px collapsed, icons with tooltips),
 * inset 12px from the window edges. Below lg: a drawer that opens from the
 * left over a scrim, traps focus, closes on Escape, on the scrim and on
 * choosing a link, and gives focus back to the button that opened it.
 *
 * The items arrive already filtered by the server from the staff member's
 * effective permissions; hiding an item here is never the access control.
 */
export function AdminSidebar({
  groups,
  companyName,
  open,
  onClose,
  collapsed,
  onToggleCollapsed,
}: {
  groups: VisibleNav;
  companyName: string;
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const pathname = usePathname() ?? "/admin";
  const asideRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = asideRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    asideRef.current?.querySelector<HTMLElement>("a[href], button:not([disabled])")?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      trigger?.focus?.();
    };
  }, [open]);

  // A wider window turns the drawer into the rail.
  useEffect(() => {
    if (!open) return;
    const query = window.matchMedia("(min-width: 1024px)");
    const onChange = () => query.matches && onCloseRef.current();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [open]);

  const initial = companyName.trim().charAt(0).toUpperCase() || "H";

  return (
    <>
      {open ? (
        <div className="admin-scrim admin-fade-in fixed inset-0 z-[50] lg:hidden" onClick={onClose} aria-hidden="true" />
      ) : null}
      <aside
        ref={asideRef}
        id="admin-sidebar"
        aria-label="Admin navigation"
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        className={cn(
          "glass-rail text-ink fixed inset-y-0 left-0 flex flex-col",
          "rounded-r-[var(--admin-radius-shell)] lg:inset-y-3 lg:left-3 lg:rounded-[var(--admin-radius-shell)]",
          "transition-[transform,width] duration-200 ease-out lg:translate-x-0",
          collapsed ? "w-72 lg:w-[4.75rem]" : "w-72 lg:w-64",
          open ? "translate-x-0" : "-translate-x-[105%]",
          "z-[60] lg:z-[20]",
        )}
      >
        <div className={cn("flex items-center gap-2 px-4 pt-4 pb-3", collapsed && "lg:flex-col lg:px-0")}>
          <Link
            href="/admin"
            onClick={onClose}
            className="nav-item flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1"
            aria-label={`${companyName} admin home`}
          >
            <span className="bg-ink text-canvas flex size-8 shrink-0 items-center justify-center rounded-[10px] text-[0.875rem] font-semibold">
              {initial}
            </span>
            <span className={cn("flex min-w-0 flex-col leading-tight", collapsed && "lg:hidden")}>
              <span className="text-ink truncate text-[0.875rem] font-semibold">{companyName}</span>
              <span className="text-ink-muted text-[0.6875rem]">Admin</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            aria-expanded={!collapsed}
            aria-controls="admin-sidebar-nav"
            className="nav-item text-ink-muted hover:text-ink hidden size-8 shrink-0 items-center justify-center rounded-[10px] lg:flex"
          >
            {collapsed ? <PanelLeftOpen aria-hidden="true" className="size-4" /> : <PanelLeftClose aria-hidden="true" className="size-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="nav-item text-ink-muted hover:text-ink flex size-9 shrink-0 items-center justify-center rounded-[10px] lg:hidden"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <nav
          id="admin-sidebar-nav"
          aria-label="Admin sections"
          className={cn("admin-scroll flex-1 overflow-x-hidden overflow-y-auto pt-1 pb-4", collapsed ? "px-3 lg:px-2.5" : "px-3")}
        >
          {groups.map((group, index) => (
            <div key={group.label} className={cn(index > 0 && "mt-4")}>
              <p
                className={cn(
                  "text-ink-muted px-3 pb-1.5 text-[0.6875rem] font-semibold tracking-wider uppercase",
                  collapsed && "lg:hidden",
                )}
              >
                {group.label}
              </p>
              {collapsed && index > 0 ? <div aria-hidden="true" className="bg-line mx-3 mb-2 hidden h-px lg:block" /> : null}
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <NavRow
                    key={item.href}
                    item={item}
                    active={isNavItemActive(item.href, pathname)}
                    collapsed={collapsed}
                    onNavigate={onClose}
                  />
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

function NavRow({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: VisibleNav[number]["items"][number];
  active: boolean;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const Icon = iconForHref(item.href);
  const anchor = useRef<HTMLLIElement>(null);
  const [tip, setTip] = useState<{ top: number; left: number } | null>(null);

  const showTip = () => {
    if (!collapsed || !window.matchMedia("(min-width: 1024px)").matches) return;
    const row = anchor.current?.getBoundingClientRect();
    const rail = anchor.current?.closest("aside")?.getBoundingClientRect();
    if (row && rail) setTip({ top: row.top + row.height / 2, left: rail.right + 8 });
  };
  const hideTip = () => setTip(null);

  useEffect(() => {
    if (!tip) return;
    window.addEventListener("scroll", hideTip, true);
    return () => window.removeEventListener("scroll", hideTip, true);
  }, [tip]);

  const label = <span className={cn("min-w-0 flex-1 truncate", collapsed && "lg:sr-only")}>{item.label}</span>;
  const icon = Icon ? <Icon aria-hidden="true" className="size-[1.05rem] shrink-0" /> : null;
  const rowClass = cn(
    "nav-item relative flex h-9 items-center gap-2.5 rounded-xl px-3 text-[0.875rem]",
    collapsed && "lg:justify-center lg:px-0",
  );

  let content: ReactNode;
  if (!item.available) {
    content = (
      <span aria-disabled="true" title="Not available yet" className={cn(rowClass, "text-ink-subtle cursor-default")}>
        {icon}
        {label}
        <Lock aria-hidden="true" className={cn("size-3 shrink-0", collapsed && "lg:hidden")} />
      </span>
    );
  } else {
    content = (
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        data-active={active ? "true" : undefined}
        className={cn(rowClass, active ? "font-medium" : "text-ink-muted hover:text-ink")}
        onMouseEnter={showTip}
        onMouseLeave={hideTip}
        onFocus={showTip}
        onBlur={hideTip}
      >
        {active ? (
          <span aria-hidden="true" className="bg-primary absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-full" />
        ) : null}
        <span className={active ? "text-primary" : undefined}>{icon}</span>
        {label}
      </Link>
    );
  }

  return (
    <li ref={anchor}>
      {content}
      {tip
        ? createPortal(
            <p
              role="tooltip"
              style={{ top: tip.top, left: tip.left }}
              className="glass-menu admin-fade-in text-ink pointer-events-none fixed z-[90] -translate-y-1/2 px-2.5 py-1.5 text-[0.8125rem] font-medium whitespace-nowrap"
            >
              {item.label}
            </p>,
            document.body,
          )
        : null}
    </li>
  );
}
