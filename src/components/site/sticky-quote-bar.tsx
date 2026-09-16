"use client";

import { useEffect, useState, type ReactNode } from "react";

import { Container } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

/**
 * A quotation bar that follows the reader down a long product page.
 *
 * It appears only once the real call to action has scrolled out of sight, so
 * on a short page it never appears at all. That is the point: a bar pinned to
 * the screen while the button it duplicates is still visible is two of the
 * same control competing for one decision.
 *
 * The trigger is an IntersectionObserver on the panel itself rather than a
 * scroll position, because "how far down is the panel" is a question the
 * browser can answer exactly and a magic number cannot.
 */
export function StickyQuoteBar({
  watchId,
  children,
}: {
  /** The id of the element whose leaving the screen brings the bar in. */
  watchId: string;
  children: ReactNode;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const target = document.getElementById(watchId);
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Only below the panel, never above it. Scrolling up past the hero to
        // the breadcrumb should not summon a bar the reader already passed.
        setShown(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { rootMargin: "0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [watchId]);

  return (
    <div
      // Kept in the DOM and moved out of the way, so the transition has
      // something to animate and assistive technology is not handed a control
      // that appears and disappears under it.
      aria-hidden={!shown}
      inert={!shown}
      className={cn(
        "border-line bg-surface/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur",
        "transition-transform duration-[var(--duration-base)] ease-[var(--ease-out-quart)]",
        shown ? "translate-y-0" : "translate-y-full",
      )}
    >
      <Container className="flex items-center justify-between gap-4 py-3">
        {children}
      </Container>
    </div>
  );
}
