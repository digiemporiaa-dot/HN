"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  ClipboardList,
  FileText,
  FolderTree,
  Image as ImageIcon,
  Inbox,
  Layers,
  Loader2,
  MapPin,
  Newspaper,
  Package,
  PictureInPicture2,
  Plus,
  Search,
  Stethoscope,
  Tags,
  UserCog,
  Blocks,
  Crosshair,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { adminSearch } from "@/server/admin-search";
import {
  SEARCH_GROUP_LABEL,
  SEARCH_MAX_QUERY,
  SEARCH_MIN_QUERY,
  type SearchHit,
  type SearchType,
} from "@/lib/admin/search";
import { useMediaQuery } from "@/components/ui";
import { useGuardedNavigate } from "./navigation-guard";
import type { VisibleNav } from "./navigation";

const DEBOUNCE_MS = 200;

const TYPE_ICON: Record<SearchType, ReactNode> = {
  Lead: <Inbox aria-hidden="true" />,
  RFQ: <ClipboardList aria-hidden="true" />,
  Product: <Package aria-hidden="true" />,
  Category: <FolderTree aria-hidden="true" />,
  Brand: <Tags aria-hidden="true" />,
  Specialty: <Stethoscope aria-hidden="true" />,
  Solution: <Blocks aria-hidden="true" />,
  Application: <Crosshair aria-hidden="true" />,
  Page: <FileText aria-hidden="true" />,
  Post: <Newspaper aria-hidden="true" />,
  City: <MapPin aria-hidden="true" />,
  Form: <Layers aria-hidden="true" />,
  Popup: <PictureInPicture2 aria-hidden="true" />,
  Media: <ImageIcon aria-hidden="true" />,
  Staff: <UserCog aria-hidden="true" />,
};

type Command = {
  key: string;
  group: string;
  label: string;
  detail?: string | null;
  href: string;
  icon: ReactNode;
};

type Status = "idle" | "loading" | "done" | "error";

/**
 * Search and quick navigation, opened with Ctrl K or ⌘K.
 *
 * Destinations and create actions come from the permission-filtered menu the
 * server already sent; records come from `adminSearch`, which checks each
 * category's permission itself. Typing is debounced, and an answer that
 * arrives after a newer request was sent is thrown away.
 */
export function AdminSearch({
  groups,
  createOptions,
}: {
  groups: VisibleNav;
  createOptions: Array<{ label: string; href: string }>;
}) {
  const compact = useMediaQuery("(max-width: 639px)");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [shortcut, setShortcut] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sheetTrigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent;
    setShortcut(/mac|iphone|ipad|ipod/i.test(platform) ? "⌘K" : "Ctrl K");
  }, []);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (window.matchMedia("(max-width: 639px)").matches) setSheetOpen(true);
        else {
          inputRef.current?.focus();
          inputRef.current?.select();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!compact && sheetOpen) setSheetOpen(false);
  }, [compact, sheetOpen]);

  return (
    <>
      <button
        ref={sheetTrigger}
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-haspopup="dialog"
        aria-label="Search"
        className="admin-focus-ring text-ink-muted hover:text-ink hover:bg-surface-muted flex size-9 items-center justify-center rounded-xl sm:hidden"
      >
        <Search aria-hidden="true" className="size-[1.1rem]" />
      </button>
      <div className="hidden sm:block">
        <SearchCombobox
          groups={groups}
          createOptions={createOptions}
          inputRef={inputRef}
          shortcut={shortcut}
          variant="inline"
        />
      </div>
      {sheetOpen ? (
        <SearchSheet
          onClose={() => {
            setSheetOpen(false);
            sheetTrigger.current?.focus();
          }}
        >
          <SearchCombobox
            groups={groups}
            createOptions={createOptions}
            shortcut={null}
            variant="sheet"
            onCancel={() => {
              setSheetOpen(false);
              sheetTrigger.current?.focus();
            }}
          />
        </SearchSheet>
      ) : null}
    </>
  );
}

function SearchSheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div className="admin-scrim admin-fade-in absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="glass-menu admin-slide-up relative m-2 flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col overflow-hidden rounded-[var(--admin-radius-dialog)]">
        {children}
      </div>
    </div>,
    document.body,
  );
}

function SearchCombobox({
  groups,
  createOptions,
  inputRef: externalRef,
  shortcut,
  variant,
  onCancel,
}: {
  groups: VisibleNav;
  createOptions: Array<{ label: string; href: string }>;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  shortcut: string | null;
  variant: "inline" | "sheet";
  onCancel?: () => void;
}) {
  const navigate = useGuardedNavigate();
  const sheet = variant === "sheet";
  const ownRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef ?? ownRef;
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(sheet);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [attempt, setAttempt] = useState(0);
  const [highlight, setHighlight] = useState(0);
  const latest = useRef(0);
  const term = query.trim();

  useEffect(() => {
    if (sheet) inputRef.current?.focus();
  }, [sheet, inputRef]);

  useEffect(() => {
    const id = ++latest.current;
    if (term.length < SEARCH_MIN_QUERY) {
      setHits([]);
      setStatus("idle");
      return;
    }
    setStatus("loading");
    const timer = window.setTimeout(() => {
      adminSearch(term)
        .then((result) => {
          if (id !== latest.current) return;
          setHits(result);
          setStatus("done");
        })
        .catch(() => {
          if (id !== latest.current) return;
          setHits([]);
          setStatus("error");
        });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [term, attempt]);

  const commands = useMemo<Command[]>(() => {
    const needle = term.toLowerCase();
    const destinations: Command[] = groups.flatMap((group) =>
      group.items
        .filter((item) => item.available)
        .filter((item) => !needle || item.label.toLowerCase().includes(needle) || group.label.toLowerCase().includes(needle))
        .map((item) => ({
          key: `go:${item.href}`,
          group: "Go to",
          label: item.label,
          detail: group.label,
          href: item.href,
          icon: <ArrowRight aria-hidden="true" />,
        })),
    );
    const actions: Command[] = createOptions
      .filter((option) => !needle || option.label.toLowerCase().includes(needle))
      .map((option) => ({
        key: `new:${option.href}`,
        group: "Create",
        label: option.label,
        href: option.href,
        icon: <Plus aria-hidden="true" />,
      }));
    const records: Command[] = hits.map((hit) => ({
      key: `${hit.type}:${hit.id}`,
      group: SEARCH_GROUP_LABEL[hit.type],
      label: hit.title,
      detail: hit.subtitle,
      href: hit.href,
      icon: TYPE_ICON[hit.type],
    }));
    if (!needle) return [...destinations.slice(0, 6), ...actions.slice(0, 4)];
    return [...records, ...destinations.slice(0, 8), ...actions];
  }, [term, groups, createOptions, hits]);

  useEffect(() => {
    setHighlight((current) => Math.min(current, Math.max(0, commands.length - 1)));
  }, [commands.length]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${highlight}"]`)?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  useEffect(() => {
    if (sheet || !open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, sheet]);

  const run = useCallback(
    (command: Command | undefined) => {
      if (!command) return;
      setOpen(sheet);
      setQuery("");
      inputRef.current?.blur();
      onCancel?.();
      navigate(command.href);
    },
    [inputRef, navigate, onCancel, sheet],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      setHighlight((current) => (commands.length ? (current + 1) % commands.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) => (commands.length ? (current - 1 + commands.length) % commands.length : 0));
    } else if (event.key === "Enter") {
      if (open && commands[highlight]) {
        event.preventDefault();
        run(commands[highlight]);
      }
    } else if (event.key === "Escape") {
      if (sheet) return onCancel?.();
      if (open) setOpen(false);
      else if (query) setQuery("");
      else inputRef.current?.blur();
    } else if (event.key === "Tab") {
      if (!sheet) setOpen(false);
    }
  };

  let index = -1;
  const grouped = commands.reduce<Array<{ group: string; items: Array<Command & { index: number }> }>>((all, command) => {
    index += 1;
    const last = all[all.length - 1];
    if (last && last.group === command.group) last.items.push({ ...command, index });
    else all.push({ group: command.group, items: [{ ...command, index }] });
    return all;
  }, []);

  const panel = (
    <div
      className={cn(
        sheet
          ? "flex min-h-0 flex-1 flex-col"
          : "glass-menu admin-pop-in absolute top-full right-0 z-[40] mt-2 flex max-h-[70dvh] w-full min-w-[min(30rem,calc(100vw-2rem))] flex-col overflow-hidden",
      )}
    >
      <div ref={listRef} id={listId} role="listbox" aria-label="Search results" aria-busy={status === "loading"} className="admin-scroll max-h-[min(70dvh,32rem)] overflow-y-auto p-1.5">
        {status === "loading" && hits.length === 0 && term.length >= SEARCH_MIN_QUERY ? (
          <p role="status" className="text-caption text-ink-muted px-3 py-2">
            Searching records…
          </p>
        ) : null}
        {status === "error" ? (
          <div role="alert" className="border-danger-100 bg-danger-50 text-danger-700 m-1.5 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-[0.8125rem]">
            Record search is unavailable right now.
            <button type="button" onClick={() => setAttempt((value) => value + 1)} className="font-semibold underline underline-offset-2">
              Retry
            </button>
          </div>
        ) : null}
        {grouped.map((section) => (
          <div key={section.group} role="presentation" className="pb-1">
            <p role="presentation" className="text-ink-muted px-3 pt-2 pb-1 text-[0.6875rem] font-semibold tracking-wider uppercase">
              {section.group}
            </p>
            {section.items.map((command) => (
              <div
                key={command.key}
                id={`${listId}-${command.index}`}
                role="option"
                aria-selected={command.index === highlight}
                data-index={command.index}
                onMouseMove={() => setHighlight(command.index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => run(command)}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-[0.6rem] px-3 py-1.5",
                  command.index === highlight && "search-option-active",
                  status === "loading" && section.group !== "Go to" && section.group !== "Create" && "opacity-60",
                )}
              >
                <span className="text-ink-muted flex size-4 shrink-0 items-center [&>svg]:size-4">{command.icon}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-ink truncate text-[0.875rem]">{command.label}</span>
                  {command.detail ? <span className="text-ink-muted truncate text-[0.75rem]">{command.detail}</span> : null}
                </span>
              </div>
            ))}
          </div>
        ))}
        {status === "done" && commands.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-ink text-[0.875rem] font-medium">No results for “{term}”</p>
            <p className="text-caption text-ink-muted">Try a name, email, reference, page title or slug.</p>
          </div>
        ) : null}
      </div>
      <div className="border-line text-ink-muted hidden items-center gap-3 border-t px-3 py-2 text-[0.6875rem] sm:flex">
        <span>
          <kbd className="search-kbd">↑</kbd> <kbd className="search-kbd">↓</kbd> to move
        </span>
        <span>
          <kbd className="search-kbd">↵</kbd> to open
        </span>
        <span>
          <kbd className="search-kbd">esc</kbd> to close
        </span>
      </div>
    </div>
  );

  return (
    <div ref={rootRef} role="search" className={cn("relative", sheet ? "flex min-h-0 flex-1 flex-col" : "w-full")}>
      <div className={cn("flex items-center gap-2", sheet && "border-line border-b p-2")}>
        <label className={cn("search-field flex min-w-0 flex-1 items-center gap-2 rounded-[var(--admin-radius-control)] px-3", sheet ? "h-11" : "h-9")}>
          {status === "loading" ? (
            <Loader2 aria-hidden="true" className="text-ink-muted size-4 shrink-0 animate-spin" />
          ) : (
            <Search aria-hidden="true" className="text-ink-muted size-4 shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-activedescendant={open && commands[highlight] ? `${listId}-${highlight}` : undefined}
            aria-autocomplete="list"
            aria-label="Search admin"
            autoComplete="off"
            spellCheck={false}
            maxLength={SEARCH_MAX_QUERY}
            placeholder={sheet ? "Search leads, products, pages…" : "Search"}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setHighlight(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="text-ink placeholder:text-ink-muted min-w-0 flex-1 bg-transparent text-[0.875rem] outline-none"
          />
          {shortcut && !query ? <kbd className="search-kbd hidden md:block">{shortcut}</kbd> : null}
        </label>
        {sheet ? (
          <button type="button" onClick={onCancel} className="text-primary px-2 text-[0.875rem] font-medium">
            Cancel
          </button>
        ) : null}
      </div>
      {open ? panel : null}
    </div>
  );
}
