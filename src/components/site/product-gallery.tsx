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
  const list = images.length > 0 ? images : [categoryVisual(name)];
  const current = list[Math.min(active, list.length - 1)];

  return (
    <div className="flex flex-col gap-4">
      <div className="media-frame bg-surface-panel relative aspect-[4/3] rounded-2xl [&>img]:p-[6%]">
        <SmartImage
          key={current.url}
          src={current.url}
          alt={current.alt}
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
          fit="contain"
          className="intro-fade"
        />
        {list.length > 1 ? (
          <span className="text-caption text-ink-muted absolute right-4 bottom-4 rounded-md bg-white px-2.5 py-1 font-medium tabular-nums">
            {active + 1} / {list.length}
          </span>
        ) : null}
      </div>

      {list.length > 1 ? (
        <ul className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {list.map((image, index) => (
            <li key={`${image.url}-${index}`}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show image ${index + 1} of ${list.length} for ${name}`}
                aria-current={index === active}
                className={cn(
                  "media-frame bg-surface-panel block aspect-square w-full rounded-xl border-2 transition-colors [&>img]:p-[10%]",
                  index === active
                    ? "border-primary"
                    : "border-transparent hover:border-line-strong",
                )}
              >
                <SmartImage src={image.url} alt="" sizes="120px" fit="contain" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
