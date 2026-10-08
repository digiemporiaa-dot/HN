import type { ReactNode } from "react";

import { Breadcrumb, Container, type BreadcrumbItem } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import type { Visual } from "@/lib/visuals";
import { SmartImage } from "./media";

/**
 * The top of every inner page, on the white canvas.
 *
 * "image": an editorial headline row — title on the left, the description and
 * actions on the right — over a wide, softly rounded photograph.
 * "pearl": the headline beside a framed visual on a soft grey panel (a product
 * or category cut-out), or beside whatever `aside` the page supplies.
 *
 * Structured data for the breadcrumb is emitted by the Breadcrumb inside, so
 * pages must not render the trail a second time.
 */
export function PageHero({
  variant = "pearl",
  trail,
  eyebrow,
  title,
  description,
  image,
  aside,
  actions,
  meta,
  size = "md",
  imageFit = "contain",
  children,
}: {
  variant?: "image" | "pearl";
  trail: BreadcrumbItem[];
  eyebrow?: string | null;
  title: ReactNode;
  description?: string | null;
  /** Wide photograph (image variant) or framed visual (pearl variant). */
  image?: Visual | null;
  /** Replaces the framed visual on the pearl variant. */
  aside?: ReactNode;
  actions?: ReactNode;
  /** Small facts under the description: counts, locations. */
  meta?: ReactNode;
  size?: "md" | "lg";
  /** Pearl variant: "contain" for cut-outs on the grey panel, "cover" for photographs. */
  imageFit?: "contain" | "cover";
  children?: ReactNode;
}) {
  const heading = (
    <h1
      className={cn(
        "intro text-ink text-safe font-display max-w-[18ch] font-normal tracking-[-0.035em] [--i:1]",
        // Line height after the size: a later font-size class would
        // otherwise cancel it when the classes are merged.
        size === "lg"
          ? "text-[clamp(2.5rem,1.3rem+3.8vw,4.75rem)] leading-[1.05]"
          : "text-[clamp(2.25rem,1.3rem+3vw,4rem)] leading-[1.05]",
      )}
    >
      {title}
    </h1>
  );

  if (variant === "image" && image) {
    return (
      <section className="bg-canvas relative">
        <Container width="wide" className="pt-6">
          <Breadcrumb items={trail} />
        </Container>
        <Container width="wide" className="grid gap-6 pt-8 pb-8 sm:pt-10 lg:grid-cols-12 lg:items-end lg:gap-10 lg:pb-10">
          <div className="flex flex-col gap-4 lg:col-span-7">
            {eyebrow ? <span className="eyebrow intro">{eyebrow}</span> : null}
            {heading}
          </div>
          <div className="flex flex-col gap-5 lg:col-span-5 lg:pb-2">
            {description ? (
              <p className="intro text-body text-ink-muted max-w-[52ch] [--i:2]">{description}</p>
            ) : null}
            {meta ? <div className="intro text-body-sm flex flex-wrap gap-2 [--i:3]">{meta}</div> : null}
            {actions ? <div className="intro [--i:3]">{actions}</div> : null}
            {children}
          </div>
        </Container>
        <Container width="wide">
          <div className="intro-scale media-frame bg-surface-panel aspect-[4/3] rounded-2xl sm:aspect-[16/8] lg:aspect-[21/8] [--i:3]">
            <SmartImage src={image.url} alt={image.alt} sizes="(min-width: 1440px) 1360px, 100vw" priority quality={80} />
          </div>
        </Container>
      </section>
    );
  }

  const visual = aside ?? (image ? (
    <div className="bg-surface-panel relative aspect-[4/3] overflow-hidden rounded-2xl">
      <div className={cn("absolute", imageFit === "contain" ? "inset-[8%]" : "inset-0")}>
        <SmartImage src={image.url} alt={image.alt} sizes="(min-width: 1024px) 40vw, 100vw" fit={imageFit} priority />
      </div>
    </div>
  ) : null);

  return (
    <section className="bg-canvas relative">
      <Container width="wide" className="pt-6">
        <Breadcrumb items={trail} />
      </Container>
      <Container
        width="wide"
        className={cn(
          "grid items-center gap-10 pt-8 pb-12 sm:pt-10 sm:pb-14 lg:gap-16",
          size === "lg" ? "lg:pb-20" : "lg:pb-16",
          visual ? "lg:grid-cols-[1.05fr_0.95fr]" : "",
        )}
      >
        <div className="flex max-w-[52rem] flex-col gap-5">
          {eyebrow ? <span className="eyebrow intro">{eyebrow}</span> : null}
          {heading}
          {description ? (
            <p className="intro text-body-lg text-ink-muted max-w-[56ch] [--i:2]">{description}</p>
          ) : null}
          {meta ? <div className="intro text-body-sm flex flex-wrap gap-2 [--i:3]">{meta}</div> : null}
          {actions ? <div className="intro pt-2 [--i:3]">{actions}</div> : null}
          {children}
        </div>
        {visual ? <div className="intro-scale [--i:2]">{visual}</div> : null}
      </Container>
    </section>
  );
}

/** A small rounded fact chip for hero meta rows. */
export function MetaChip({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[0.8125rem] font-medium",
        dark ? "bg-white/10 text-white/85" : "bg-surface-panel text-ink-muted",
      )}
    >
      {children}
    </span>
  );
}
