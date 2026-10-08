"use client";

import { useEffect, useRef, useState } from "react";

const PATTERN = /^(\D*)(\d[\d,]*(?:\.\d+)?)(.*)$/s;

/**
 * A figure that counts up once, the first time it scrolls into view.
 *
 * The server renders the real value, so the number is right with JavaScript
 * off and for anything reading the page. On the client a figure that has not
 * been seen yet is reset to zero while still off screen — never in view — and
 * counted up on arrival. Text that is not a number ("Pan-India") is left alone,
 * and so is everything for visitors who ask for reduced motion.
 */
export function AnimatedNumber({ value, duration = 1400 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const element = ref.current;
    const match = PATTERN.exec(value.trim());
    if (!match || !element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const [, prefix, raw, suffix] = match;
    const target = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(target) || target === 0) return;
    const decimals = raw.includes(".") ? raw.split(".")[1].length : 0;
    const grouped = raw.includes(",");
    const format = (n: number) => {
      const fixed = n.toFixed(decimals);
      return `${prefix}${grouped ? Number(fixed).toLocaleString("en-IN") : fixed}${suffix}`;
    };

    const rect = element.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return; // already seen
    setDisplay(format(0));

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 4);
          setDisplay(format(target * eased));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {display}
    </span>
  );
}
