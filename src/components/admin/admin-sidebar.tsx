"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Lock, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

import { useMediaQuery } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { activeNavEntry, iconForHref, moduleIcon, type VisibleNav } from "./navigation";
import { SidebarFlyout } from "./sidebar-flyout";

const OPEN_KEY = "hn:admin:nav-open";
/** Hover intent: a short pause before opening, a longer grace before closing. */
const OPEN_DELAY = 70;
const CLOSE_DELAY = 180;

type Group = VisibleNav[number];

/**
 * The floating navigation rail.
 *
 * Every module of the permission registry is one row. A module with several
 * entries is a dropdown of them; one with a single entry is a plain link.
 *
 * Expanded (lg and up, 256px; and always in the mobile drawer): icons and
 * labels, with each module's entries in an inline list under a chevron. Any
 * number of modules can be open; the one holding the current page opens by
 * itself when you arrive in it. Which modules are open is remembered
 * separately from whether the rail is collapsed.
 *
 * Collapsed (lg and up, 76px): icons only. Hovering a module opens its
 * entries in a floating menu beside the rail; so do focus plus Enter, Space
 * or the arrow keys, and a tap on touch screens. Escape, leaving both icon
 * and menu, or navigating closes it.
 *
 * Below lg the rail is a drawer that opens from the left over a scrim, traps
 * focus, closes on Escape, on the scrim and on choosing a link, and gives
 * focus back to the button that opened it.
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
  const desktop = useMediaQuery("(min-width: 1024px)");
  // The icon rail exists only on wide screens; the drawer is always expanded.
  const rail = collapsed && desktop;
  const active = activeNavEntry(pathname, groups);
  const activeKey = active?.groupKey ?? null;
  const activeHref = active?.item.href ?? null;

  const openModules = useOpenModules(activeKey);

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
            title={collapsed ? "Expand navigation" : "Collapse navigation"}
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

        {rail ? (
          <RailNav groups={groups} activeKey={activeKey} activeHref={activeHref} pathname={pathname} />
        ) : (
          <nav id="admin-sidebar-nav" aria-label="Admin sections" className="admin-scroll flex-1 overflow-x-hidden overflow-y-auto px-3 pt-1 pb-4">
            <ul className="flex flex-col gap-0.5">
              {groups.map((group) =>
                group.nested ? (
                  <ExpandedModule
                    key={group.key}
                    group={group}
                    open={openModules.isOpen(group.key)}
                    onToggle={() => openModules.toggle(group.key)}
                    activeKey={activeKey}
                    activeHref={activeHref}
                    onNavigate={onClose}
                  />
                ) : (
                  group.items.map((item) => (
                    <li key={item.href}>
                      <DirectLink item={item} active={item.href === activeHref} onNavigate={onClose} icon={moduleIcon(group.key) ?? iconForHref(item.href)} />
                    </li>
                  ))
                ),
              )}
            </ul>
          </nav>
        )}
      </aside>
    </>
  );
}

/**
 * Which modules are open in the expanded rail. Starts with the module of the
 * current page (so the server and first browser render agree), then adds what
 * was open last time. Arriving in another module opens it without closing
 * the others.
 */
function useOpenModules(activeKey: string | null) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(activeKey ? [activeKey] : []));

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(OPEN_KEY) ?? "[]");
      if (Array.isArray(stored)) {
        setOpen((current) => new Set([...current, ...stored.filter((key): key is string => typeof key === "string").slice(0, 20)]));
      }
    } catch {
      // Nothing remembered.
    }
  }, []);

  useEffect(() => {
    if (!activeKey) return;
    setOpen((current) => (current.has(activeKey) ? current : new Set([...current, activeKey])));
  }, [activeKey]);

  const persist = (next: Set<string>) => {
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify([...next]));
    } catch {
      // Not remembered.
    }
  };

  return {
    isOpen: (key: string) => open.has(key),
    toggle: (key: string) =>
      setOpen((current) => {
        const next = new Set(current);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        persist(next);
        return next;
      }),
  };
}

function rowClass(extra?: string) {
  return cn("nav-item relative flex h-9 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[0.875rem]", extra);
}

function ActiveMarker() {
  return <span aria-hidden="true" className="bg-primary absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-full" />;
}

/** A module with no submenu, or an entry inside one: a link straight to the page. */
function DirectLink({
  item,
  active,
  onNavigate,
  icon: Icon,
  nested = false,
}: {
  item: Group["items"][number];
  active: boolean;
  onNavigate: () => void;
  icon?: ReturnType<typeof iconForHref>;
  nested?: boolean;
}) {
  const icon = Icon ? <Icon aria-hidden="true" className={cn(nested ? "size-4" : "size-[1.05rem]", "shrink-0", active && "text-primary")} /> : null;
  const classes = rowClass(nested ? "h-8 rounded-lg pl-2.5 text-[0.8125rem]" : undefined);
  if (!item.available) {
    return (
      <span aria-disabled="true" title="Not available yet" className={cn(classes, "text-ink-subtle cursor-default")}>
        {icon}
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <Lock aria-hidden="true" className="size-3 shrink-0" />
      </span>
    );
  }
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      data-active={active ? "true" : undefined}
      className={cn(classes, active ? "font-medium" : "text-ink-muted hover:text-ink")}
    >
      {active ? <ActiveMarker /> : null}
      {icon}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </Link>
  );
}

/** A module in the expanded rail: a disclosure button over its entries. */
function ExpandedModule({
  group,
  open,
  onToggle,
  activeKey,
  activeHref,
  onNavigate,
}: {
  group: Group;
  open: boolean;
  onToggle: () => void;
  activeKey: string | null;
  activeHref: string | null;
  onNavigate: () => void;
}) {
  const listId = useId();
  const Icon = moduleIcon(group.key);
  const holdsActive = group.key === activeKey;

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={listId}
        // A closed module that holds the current page still shows it.
        data-active={holdsActive && !open ? "true" : undefined}
        className={rowClass(holdsActive ? "text-ink font-medium" : "text-ink-muted hover:text-ink")}
      >
        {holdsActive && !open ? <ActiveMarker /> : null}
        {Icon ? <Icon aria-hidden="true" className={cn("size-[1.05rem] shrink-0", holdsActive && "text-primary")} /> : null}
        <span className="min-w-0 flex-1 truncate">{group.label}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn("text-ink-subtle size-4 shrink-0 transition-transform duration-200 ease-out", open ? "rotate-0" : "-rotate-90")}
        />
      </button>
      {/* Height animates through grid rows; a closed list is inert, so it is
          out of the tab order and hidden from assistive technology. */}
      <div className={cn("grid transition-[grid-template-rows] duration-200 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <ul id={listId} inert={!open} aria-label={group.label} className="border-line ml-[1.35rem] flex min-h-0 flex-col gap-0.5 overflow-hidden border-l pl-2">
          {group.items.map((item, index) => (
            <li key={item.href} className={cn(index === 0 && "pt-0.5", index === group.items.length - 1 && "pb-1")}>
              <DirectLink item={item} active={item.href === activeHref} onNavigate={onNavigate} icon={iconForHref(item.href)} nested />
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

type Flyout = { key: string; via: "hover" | "click" | "keyboard"; focusFirst?: boolean };

/**
 * The collapsed rail: one icon per module. Modules with entries open a
 * floating menu; the rest are links with a name tooltip.
 */
function RailNav({
  groups,
  activeKey,
  activeHref,
  pathname,
}: {
  groups: VisibleNav;
  activeKey: string | null;
  activeHref: string | null;
  pathname: string;
}) {
  const [flyout, setFlyout] = useState<Flyout | null>(null);
  const triggers = useRef(new Map<string, HTMLButtonElement>());
  const menuRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);
  const baseId = useId();

  const clearTimers = useCallback(() => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
  }, []);
  const close = useCallback(() => {
    clearTimers();
    setFlyout(null);
  }, [clearTimers]);
  const scheduleClose = useCallback(() => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setFlyout((current) => (current?.via === "hover" ? null : current)), CLOSE_DELAY);
  }, []);

  // Navigating closes it.
  useEffect(() => close(), [pathname, close]);
  useEffect(() => clearTimers, [clearTimers]);

  // Escape anywhere, a click outside, or the rail scrolling under it.
  useEffect(() => {
    if (!flyout) return;
    const trigger = triggers.current.get(flyout.key);
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const inside = menuRef.current?.contains(document.activeElement);
      close();
      if (inside) trigger?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || trigger?.contains(target)) return;
      close();
    };
    const onScroll = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [flyout, close]);

  const linksIn = () => [...(menuRef.current?.querySelectorAll<HTMLElement>("a[href]") ?? [])];

  const onTriggerKeyDown = (group: Group) => (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      clearTimers();
      setFlyout({ key: group.key, via: "keyboard", focusFirst: true });
    } else if (event.key === "Tab" && !event.shiftKey && flyout?.key === group.key) {
      // The menu lives at the end of the page; Tab goes into it, not past it.
      const first = linksIn()[0];
      if (first) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!flyout) return;
    const links = linksIn();
    const index = links.indexOf(document.activeElement as HTMLElement);
    const trigger = triggers.current.get(flyout.key);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      links[(index + step + links.length) % links.length]?.focus();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      close();
      trigger?.focus();
    } else if (event.key === "Tab") {
      // Leaving the menu by keyboard returns to the rail, in order.
      if (event.shiftKey && index <= 0) {
        event.preventDefault();
        trigger?.focus();
      } else if (!event.shiftKey && index === links.length - 1) {
        event.preventDefault();
        close();
        const focusables = [...(trigger?.closest("nav")?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? [])];
        const next = trigger ? focusables[focusables.indexOf(trigger) + 1] : undefined;
        (next ?? trigger)?.focus();
      }
    }
  };

  const openGroup = flyout ? groups.find((group) => group.key === flyout.key) : undefined;
  const anchor = flyout ? triggers.current.get(flyout.key) : undefined;

  return (
    <nav id="admin-sidebar-nav" aria-label="Admin sections" className="admin-scroll flex-1 overflow-x-hidden overflow-y-auto px-2.5 pt-1 pb-4">
      <ul className="flex flex-col items-center gap-1">
        {groups.map((group) => {
          const Icon = moduleIcon(group.key);
          const holdsActive = group.key === activeKey;
          const iconClass = cn("size-[1.15rem] shrink-0", holdsActive && "text-primary");
          const square = cn(
            "nav-item relative flex size-11 items-center justify-center rounded-xl",
            holdsActive ? "text-ink" : "text-ink-muted hover:text-ink",
          );

          if (!group.nested) {
            const item = group.items[0];
            return (
              <li key={group.key}>
                <RailLink href={item.href} label={item.label} active={item.href === activeHref} className={square}>
                  {holdsActive ? <ActiveMarker /> : null}
                  {Icon ? <Icon aria-hidden="true" className={iconClass} /> : null}
                </RailLink>
              </li>
            );
          }

          const isOpen = flyout?.key === group.key;
          const menuId = `${baseId}-${group.key}`;
          return (
            <li key={group.key}>
              <button
                ref={(node) => {
                  if (node) triggers.current.set(group.key, node);
                  else triggers.current.delete(group.key);
                }}
                type="button"
                aria-label={group.label}
                aria-expanded={isOpen}
                aria-controls={isOpen ? menuId : undefined}
                aria-haspopup="true"
                data-active={holdsActive || isOpen ? "true" : undefined}
                className={square}
                onPointerEnter={(event: ReactPointerEvent) => {
                  // Hover is a mouse thing; a tap opens through onClick instead.
                  if (event.pointerType !== "mouse") return;
                  window.clearTimeout(closeTimer.current);
                  window.clearTimeout(openTimer.current);
                  // Moving between icons switches menus straight away.
                  const delay = flyout ? 0 : OPEN_DELAY;
                  openTimer.current = window.setTimeout(
                    () => setFlyout((current) => (current?.key === group.key && current.via !== "hover" ? current : { key: group.key, via: "hover" })),
                    delay,
                  );
                }}
                onPointerLeave={(event: ReactPointerEvent) => {
                  if (event.pointerType !== "mouse") return;
                  scheduleClose();
                }}
                onClick={() => {
                  clearTimers();
                  setFlyout((current) => {
                    // A click on a menu the pointer already opened keeps it
                    // open (pinned) rather than snapping it shut.
                    if (current?.key === group.key) return current.via === "hover" ? { key: group.key, via: "click" } : null;
                    return { key: group.key, via: "click" };
                  });
                }}
                onKeyDown={onTriggerKeyDown(group)}
              >
                {holdsActive ? <ActiveMarker /> : null}
                {Icon ? <Icon aria-hidden="true" className={iconClass} /> : null}
              </button>
            </li>
          );
        })}
      </ul>

      {openGroup && anchor ? (
        <SidebarFlyout
          id={`${baseId}-${openGroup.key}`}
          label={openGroup.label}
          items={openGroup.items}
          activeHref={activeHref}
          anchor={anchor}
          menuRef={menuRef}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") window.clearTimeout(closeTimer.current);
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") scheduleClose();
          }}
          onNavigate={close}
          onKeyDown={onMenuKeyDown}
          // Keyboard opening moves focus in only when asked to (arrow keys).
          focusFirst={flyout?.focusFirst === true}
        />
      ) : null}
    </nav>
  );
}

/** A module without a submenu in the collapsed rail: a link, named by a tooltip. */
function RailLink({
  href,
  label,
  active,
  className,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  className: string;
  children: ReactNode;
}) {
  const anchor = useRef<HTMLAnchorElement>(null);
  const [tip, setTip] = useState<{ top: number; left: number } | null>(null);

  const showTip = () => {
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

  return (
    <>
      <Link
        ref={anchor}
        href={href}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        data-active={active ? "true" : undefined}
        className={className}
        onMouseEnter={showTip}
        onMouseLeave={hideTip}
        onFocus={showTip}
        onBlur={hideTip}
        onClick={hideTip}
      >
        {children}
      </Link>
      {tip
        ? createPortal(
            <p
              role="tooltip"
              style={{ top: tip.top, left: tip.left }}
              className="glass-menu admin-fade-in text-ink pointer-events-none fixed z-[90] -translate-y-1/2 px-2.5 py-1.5 text-[0.8125rem] font-medium whitespace-nowrap"
            >
              {label}
            </p>,
            document.body,
          )
        : null}
    </>
  );
}
