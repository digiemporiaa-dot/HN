"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Columns3, Search, X } from "lucide-react";

import { Button, Checkbox, Input, Select } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

/* -------------------------------------------------------------------------
 * Search
 * ---------------------------------------------------------------------- */

export function TableSearch({
  placeholder = "Search",
  paramName = "q",
}: {
  placeholder?: string;
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initial = searchParams.get(paramName) ?? "";
  const [value, setValue] = useState(initial);

  // Keep in step when the URL changes from elsewhere (back button, filter reset).
  useEffect(() => setValue(initial), [initial]);

  useEffect(() => {
    if (value === initial) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(paramName, value);
      else params.delete(paramName);
      // A new search invalidates the current page offset.
      params.delete("page");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 300);

    return () => clearTimeout(timer);
  }, [value, initial, paramName, pathname, router, searchParams]);

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search
        aria-hidden="true"
        className="text-ink-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-9"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Column visibility — kept in the URL so the view is shareable and the server
 * decides what to render rather than the browser hiding cells after the fact.
 * ---------------------------------------------------------------------- */

export function ColumnVisibilityMenu({
  columns,
}: {
  columns: Array<{ key: string; header: string; locked: boolean }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const hidden = useMemo(
    () => new Set((searchParams.get("hide") ?? "").split(",").filter(Boolean)),
    [searchParams],
  );

  const toggle = (key: string, visible: boolean) => {
    const next = new Set(hidden);
    if (visible) next.delete(key);
    else next.add(key);

    const params = new URLSearchParams(searchParams.toString());
    if (next.size > 0) params.set("hide", [...next].join(","));
    else params.delete("hide");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Columns3 aria-hidden="true" className="size-4" />
        Columns
      </Button>

      {open ? (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="border-line bg-surface absolute right-0 z-20 mt-2 w-56 rounded-lg border p-2 shadow-lg">
            {columns.map((column) => (
              <label
                key={column.key}
                className={cn(
                  "text-body-sm text-ink hover:bg-surface-muted flex items-center gap-2.5 rounded-md px-2 py-1.5",
                  column.locked && "opacity-50",
                )}
              >
                <Checkbox
                  checked={!hidden.has(column.key)}
                  disabled={column.locked}
                  onChange={(event) => toggle(column.key, event.target.checked)}
                />
                {column.header}
              </label>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Row selection
 * ---------------------------------------------------------------------- */

type SelectionContextValue = {
  selected: Set<string>;
  toggle: (id: string, on: boolean) => void;
  toggleAll: (on: boolean) => void;
  allIds: string[];
  clear: () => void;
};

const SelectionContext = createContext<SelectionContextValue | null>(null);

function useSelection(component: string) {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error(`<${component}> must be used inside <SelectionProvider>`);
  }
  return context;
}

export function SelectionProvider({
  allIds,
  children,
}: {
  allIds: string[];
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Selecting rows then paging would otherwise act on records no longer shown.
  const key = allIds.join(",");
  useEffect(() => setSelected(new Set()), [key]);

  const value = useMemo<SelectionContextValue>(
    () => ({
      selected,
      allIds,
      toggle: (id, on) =>
        setSelected((current) => {
          const next = new Set(current);
          if (on) next.add(id);
          else next.delete(id);
          return next;
        }),
      toggleAll: (on) => setSelected(on ? new Set(allIds) : new Set()),
      clear: () => setSelected(new Set()),
    }),
    [selected, allIds],
  );

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function SelectAllCheckbox() {
  const { selected, allIds, toggleAll } = useSelection("SelectAllCheckbox");
  const allSelected = allIds.length > 0 && selected.size === allIds.length;

  return (
    <Checkbox
      checked={allSelected}
      aria-label={allSelected ? "Clear selection" : "Select all rows"}
      onChange={(event) => toggleAll(event.target.checked)}
    />
  );
}

export function RowCheckbox({ id, label }: { id: string; label: string }) {
  const { selected, toggle } = useSelection("RowCheckbox");

  return (
    <Checkbox
      checked={selected.has(id)}
      aria-label={`Select ${label}`}
      onChange={(event) => toggle(id, event.target.checked)}
    />
  );
}

export type BulkActionOption = {
  value: string;
  label: string;
};

/**
 * Reserves room for the floating bulk bar, but only while rows are selected,
 * so the bar never covers the last record and there is no dead space when
 * nothing is selected.
 */
export function SelectionSpacer() {
  const { selected } = useSelection("SelectionSpacer");
  if (selected.size === 0) return null;
  return <div aria-hidden="true" className="h-16" />;
}

/**
 * Appears only when rows are selected. The server action is passed in as a
 * prop — server actions are serialisable across this boundary — so each module
 * supplies its own behaviour without this component knowing anything about it.
 */
export function BulkActionBar({
  action,
  options,
  entityLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  options: BulkActionOption[];
  entityLabel: string;
}) {
  const { selected, clear } = useSelection("BulkActionBar");
  if (selected.size === 0) return null;

  return (
    <div className="border-line bg-surface sticky bottom-4 z-20 mx-auto flex w-fit max-w-full flex-wrap items-center gap-3 rounded-lg border p-3 shadow-lg">
      <span className="text-body-sm text-ink px-1 font-medium">
        {selected.size} {selected.size === 1 ? entityLabel : `${entityLabel}s`}{" "}
        selected
      </span>

      <form action={action} className="flex flex-wrap items-center gap-2">
        {[...selected].map((id) => (
          <input key={id} type="hidden" name="ids" value={id} />
        ))}

        <Select name="bulkAction" defaultValue="" required aria-label="Bulk action">
          <option value="" disabled>
            Choose an action
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Button type="submit" size="sm">
          Apply
        </Button>
      </form>

      <Button type="button" variant="ghost" size="sm" onClick={clear}>
        <X aria-hidden="true" className="size-4" />
        Clear
      </Button>
    </div>
  );
}
