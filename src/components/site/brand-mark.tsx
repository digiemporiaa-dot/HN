import { cn } from "@/lib/utils/cn";

/* eslint-disable @next/next/no-img-element -- the uploaded logo is served
   from our own media route at its stored size, often as SVG. */

/**
 * The company mark.
 *
 * An uploaded logo wins. Without one, a typographic mark: a precise square
 * glyph built from the initials and a cyan indicator — no medical cross, no
 * heartbeat line — beside the company name.
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
  // A short all-capitals first word ("HN") is already the monogram.
  const initials = /^[A-Z0-9]{2,3}$/.test(first)
    ? first
    : name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join("");

  return (
    <span className={cn("flex min-w-0 items-center gap-3", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "relative flex size-10 shrink-0 items-center justify-center rounded-[10px] font-display text-[0.95rem] font-semibold tracking-[-0.04em]",
          inverse
            ? "bg-white text-navy-950"
            : "brand-glyph bg-navy-950 text-white",
        )}
      >
        {initials || "HN"}
        <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-cyan-400" />
      </span>
      <span className="flex min-w-0 flex-col leading-none">
        <span
          className={cn(
            "font-display truncate text-[1.0625rem] font-semibold tracking-[-0.02em]",
            inverse ? "text-white" : "text-ink",
          )}
        >
          {first}
          {rest.length > 0 ? (
            <span className={inverse ? "text-white/70" : "text-ink-muted"}>
              {" "}
              {rest.join(" ")}
            </span>
          ) : null}
        </span>
        <span
          className={cn(
            "mt-1 text-[0.625rem] font-semibold tracking-[0.2em] uppercase max-[399px]:hidden",
            inverse ? "text-cyan-300" : "text-ink-subtle",
          )}
        >
          Healthcare technology
        </span>
      </span>
    </span>
  );
}

/* eslint-enable @next/next/no-img-element */
