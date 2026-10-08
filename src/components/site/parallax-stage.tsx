"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Writes the pointer's offset from the centre of the stage into --px / --py
 * (−10…10), which `.parallax-layer` children turn into small translations at
 * their own --depth. Only on a fine pointer, only for people who have not
 * asked for reduced motion; everywhere else the variables stay at zero and
 * the layers sit exactly where the layout put them.
 */
export function ParallaxStage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = ref.current;
    if (!stage) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || still.matches) return;

    let frame = 0;
    let x = 0;
    let y = 0;
    const apply = () => {
      frame = 0;
      stage.style.setProperty("--px", x.toFixed(2));
      stage.style.setProperty("--py", y.toFixed(2));
    };
    const onMove = (event: PointerEvent) => {
      const box = stage.getBoundingClientRect();
      x = ((event.clientX - box.left) / box.width - 0.5) * 20;
      y = ((event.clientY - box.top) / box.height - 0.5) * 20;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      x = 0;
      y = 0;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    return () => {
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {children}
    </div>
  );
}
