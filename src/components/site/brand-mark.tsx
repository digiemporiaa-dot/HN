import { cn } from "@/lib/utils/cn";

/* eslint-disable @next/next/no-img-element -- the uploaded logo is served
   from our own media route at its stored size, often as SVG. */

/**
 * The company mark.
 *
 * An uploaded logo wins. Without one, the house glyph beside the company
 * name, its first word bold and the rest light.
 */
export function BrandMark({
  name,
  logoUrl,
  inverse = false,
  className,
}: {
  name: string;
  logoUrl: string | null;
  /** Drawn on a dark background (the footer). */
  inverse?: boolean;
  className?: string;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={cn(
          "brand-logo h-9 w-auto max-w-[11rem] object-contain sm:h-10",
          inverse && "brightness-0 invert",
          className,
        )}
      />
    );
  }

  const [first, ...rest] = name.split(" ");

  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <BrandGlyph className="size-7 shrink-0" />
      <span
        className={cn(
          "font-display truncate text-[1.1875rem] leading-none tracking-[-0.03em]",
          inverse ? "text-white" : "text-ink",
        )}
      >
        <span className="font-bold">{first}</span>
        {rest.length > 0 ? (
          <span className="font-light"> {rest.join(" ")}</span>
        ) : null}
      </span>
    </span>
  );
}

/**
 * The house glyph: a clinical cross whose arms stop short of the centre,
 * leaving a point of light — precision around care.
 */
export function BrandGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" className={className}>
      <g fill="var(--color-cyan-500)">
        <rect x="10.5" y="1" width="7" height="10" rx="3.5" />
        <rect x="10.5" y="17" width="7" height="10" rx="3.5" />
        <rect x="1" y="10.5" width="10" height="7" rx="3.5" />
        <rect x="17" y="10.5" width="10" height="7" rx="3.5" />
      </g>
      <circle cx="14" cy="14" r="2.2" fill="var(--color-cyan-700)" />
    </svg>
  );
}

/* eslint-enable @next/next/no-img-element */
