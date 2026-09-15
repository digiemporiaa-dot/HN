"use client";

import { useState } from "react";

import { cn } from "@/lib/utils/cn";
import type { PublicImage } from "@/server/products/public";

/* eslint-disable @next/next/no-img-element -- catalogue images are served from
   our own media route at their stored size. */

/**
 * The product's pictures.
 *
 * object-contain rather than cover: a ventilator photographed against white
 * must not be cropped to fill a square, because the shape of the machine is
 * part of what the buyer is looking at.
 */
export function ProductGallery({
  images,
  name,
}: {
  images: PublicImage[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  const current = images[active];

  if (!current) {
    return (
      <div
        aria-hidden="true"
        className="border-line bg-surface-muted aspect-4/3 w-full rounded-lg border"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="border-line bg-surface overflow-hidden rounded-lg border">
        <img
          src={current.url}
          alt={current.alt}
          className="aspect-4/3 w-full object-contain"
        />
      </div>

      {images.length > 1 ? (
        <ul className="grid grid-cols-5 gap-2">
          {images.map((image, index) => (
            <li key={`${image.url}-${index}`}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show image ${index + 1} of ${images.length} for ${name}`}
                aria-current={index === active}
                className={cn(
                  "block w-full overflow-hidden rounded-md border transition-colors",
                  index === active
                    ? "border-primary"
                    : "border-line hover:border-line-strong",
                )}
              >
                <img
                  src={image.url}
                  alt=""
                  loading="lazy"
                  className="bg-surface aspect-square w-full object-contain"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/* eslint-enable @next/next/no-img-element */
