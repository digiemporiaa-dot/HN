"use client";

import {
  createContext,
  useContext,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils/cn";

type TabsContextValue = {
  active: string;
  setActive: (value: string) => void;
  baseId: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(component: string) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error(`<${component}> must be used inside <Tabs>`);
  }
  return context;
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  className,
  children,
}: {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: ReactNode;
}) {
  const [internal, setInternal] = useState(defaultValue);
  const baseId = useId();
  const active = value ?? internal;

  const setActive = (next: string) => {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  };

  return (
    <TabsContext.Provider value={{ active, setActive, baseId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabList({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  /** Arrow-key navigation between tabs, per the WAI-ARIA tabs pattern. */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key)) return;

    const tabs = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [],
    );
    if (tabs.length === 0) return;

    const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);
    if (currentIndex === -1) return;

    event.preventDefault();
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === "ArrowLeft")
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;

    tabs[nextIndex].focus();
    tabs[nextIndex].click();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn(
        "border-line flex gap-1 overflow-x-auto border-b",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Tab({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: ReactNode;
}) {
  const { active, setActive, baseId } = useTabs("Tab");
  const selected = active === value;

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={selected}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={selected ? 0 : -1}
      onClick={() => setActive(value)}
      className={cn(
        "text-body-sm -mb-px shrink-0 border-b-2 px-4 py-3 font-medium transition-colors",
        selected
          ? "border-primary text-ink"
          : "text-ink-muted hover:text-ink border-transparent",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabPanel({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: ReactNode;
}) {
  const { active, baseId } = useTabs("TabPanel");
  if (active !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={cn("pt-6", className)}
    >
      {children}
    </div>
  );
}
