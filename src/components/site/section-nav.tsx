"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * In-page navigation for a long page: sticks under the header and marks the
 * section currently being read. Plain anchor links, so it works (and is
 * crawlable) without JavaScript; the observer only adds the active state.
 */
export function SectionNav({
  items,
  label = "On this page",
}: {
  items: Array<{ id: string; label: string }>;
  label?: string;
}) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const targets = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  return (
    <nav
      aria-label={label}
      className="border-line sticky top-[var(--header-h)] z-30 border-b bg-white/90 backdrop-blur-md"
    >
      <ul className="scrollbar-none mx-auto flex max-w-wide gap-1 overflow-x-auto px-[var(--gutter)]">
        {items.map((item) => (
          <li key={item.id} className="shrink-0">
            <a
              href={`#${item.id}`}
              aria-current={active === item.id ? "location" : undefined}
              className={cn(
                "text-body-sm relative flex h-14 items-center px-3 font-medium whitespace-nowrap transition-colors",
                "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors",
                active === item.id
                  ? "text-ink after:bg-primary"
                  : "text-ink-muted hover:text-ink after:bg-transparent",
              )}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
