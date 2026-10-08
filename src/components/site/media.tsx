import Image from "next/image";

import { cn } from "@/lib/utils/cn";
import { visualFor, type Visual, type VisualKind } from "@/lib/visuals";

/**
 * Every catalogue and editorial picture on the public site.
 *
 * Always fills a frame whose aspect ratio the caller sets, so nothing
 * stretches and nothing shifts the layout while it loads. Raster images go
 * through next/image for responsive sizes and modern formats; SVG (logos,
 * vector uploads) is served as stored, since re-encoding it gains nothing.
 */
export function SmartImage({
  src,
  alt,
  sizes,
  priority = false,
  fit = "cover",
  className,
  quality,
}: {
  src: string;
  alt: string;
  /** The rendered width at each breakpoint — required for responsive sizing. */
  sizes: string;
  priority?: boolean;
  fit?: "cover" | "contain";
  className?: string;
  quality?: number;
}) {
  const vector = /\.svg($|\?)/i.test(src);
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      quality={quality}
      unoptimized={vector}
      className={cn(
        fit === "cover" ? "object-cover" : "object-contain",
        className,
      )}
    />
  );
}

/**
 * A framed picture for a record, borrowing a house image when the record has
 * none — so a card is never an empty grey box.
 */
export function RecordImage({
  kind,
  name,
  image,
  sizes,
  priority,
  fit,
  className,
  frameClassName,
}: {
  kind: VisualKind;
  name: string;
  image: Visual | null | undefined;
  sizes: string;
  priority?: boolean;
  fit?: "cover" | "contain";
  className?: string;
  frameClassName?: string;
}) {
  const visual = visualFor(kind, name, image);
  return (
    <div className={cn("media-frame", frameClassName)}>
      <SmartImage
        src={visual.url}
        alt={visual.alt}
        sizes={sizes}
        priority={priority}
        fit={fit}
        className={className}
      />
    </div>
  );
}
