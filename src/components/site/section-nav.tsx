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
      className="border-line sticky top-[var(--header-h)] z-30 border-b bg-white/85 backdrop-blur-md"
    >
      <ul className="scrollbar-none mx-auto flex max-w-wide gap-7 overflow-x-auto px-[var(--gutter)]">
        {items.map((item) => (
          <li key={item.id} className="shrink-0">
            <a
              href={`#${item.id}`}
              aria-current={active === item.id ? "location" : undefined}
              className={cn(
                "relative flex h-12 items-center text-[0.8125rem] whitespace-nowrap transition-colors",
                "after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:bg-ink after:transition-transform after:duration-[var(--duration-base)]",
                active === item.id
                  ? "text-ink font-medium after:scale-x-100"
                  : "text-ink-muted hover:text-ink after:scale-x-0",
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
