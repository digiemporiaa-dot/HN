"use client";

import { useState } from "react";

import { cn } from "@/lib/utils/cn";
import { categoryVisual } from "@/lib/visuals";
import type { PublicImage } from "@/server/products/public";
import { SmartImage } from "./media";

/**
 * The product's pictures.
 *
 * object-contain rather than cover: a ventilator photographed against white
 * must not be cropped to fill a frame, because the shape of the machine is
 * part of what the buyer is looking at. A product without pictures shows a
 * matching house render rather than an empty box.
 */
export function ProductGallery({
  images,
  name,
}: {
  images: PublicImage[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  // Hover zoom: the picture enlarges around the pointer, so a buyer can look
  // at a control panel without opening anything. Fine pointers only.
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const list = images.length > 0 ? images : [categoryVisual(name)];
  const current = list[Math.min(active, list.length - 1)];

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse lg:gap-4">
      <div
        className="stage-surface relative aspect-[4/3] flex-1 cursor-zoom-in overflow-hidden rounded-2xl"
        onPointerMove={(event) => {
          if (event.pointerType !== "mouse") return;
          const box = event.currentTarget.getBoundingClientRect();
          setZoom({
            x: ((event.clientX - box.left) / box.width) * 100,
            y: ((event.clientY - box.top) / box.height) * 100,
          });
        }}
        onPointerLeave={() => setZoom(null)}
      >
        <div
          className="absolute inset-[6%] transition-transform duration-300 ease-[var(--ease-out-quart)] motion-reduce:transition-none"
          style={
            zoom
              ? { transform: "scale(1.6)", transformOrigin: `${zoom.x}% ${zoom.y}%` }
              : undefined
          }
        >
          <SmartImage
            key={current.url}
            src={current.url}
            alt={current.alt}
            sizes="(min-width: 1024px) 55vw, 100vw"
            priority
            fit="contain"
            className="intro-fade"
          />
        </div>
        {list.length > 1 ? (
          <span className="text-ink-muted absolute right-4 bottom-4 text-[0.75rem] font-medium tabular-nums">
            {String(active + 1).padStart(2, "0")} / {String(list.length).padStart(2, "0")}
          </span>
        ) : null}
      </div>

      {list.length > 1 ? (
        <ul className="flex gap-2 lg:w-16 lg:flex-col">
          {list.map((image, index) => (
            <li key={`${image.url}-${index}`} className="w-16 shrink-0">
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show image ${index + 1} of ${list.length} for ${name}`}
                aria-current={index === active}
                className={cn(
                  "bg-surface-panel relative block aspect-square w-full overflow-hidden rounded-lg transition-opacity",
                  "after:absolute after:inset-x-2 after:bottom-1 after:h-0.5 after:rounded-full after:transition-colors",
                  index === active ? "after:bg-ink opacity-100" : "opacity-60 after:bg-transparent hover:opacity-100",
                )}
              >
                <span className="absolute inset-[10%]">
                  <SmartImage src={image.url} alt="" sizes="64px" fit="contain" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
