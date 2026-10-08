import type { ReactNode } from "react";

import { Breadcrumb, Container, type BreadcrumbItem } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import type { Visual } from "@/lib/visuals";
import { SmartImage } from "./media";

/**
 * The top of every inner page.
 *
 * "image": a photograph under a navy wash; as the first element of the page it
 * slides under the transparent header, like the homepage hero.
 * "pearl": a typographic hero on the technical grid, with an optional framed
 * visual (a product render, a category image) beside the words.
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
  children,
}: {
  variant?: "image" | "pearl";
  trail: BreadcrumbItem[];
  eyebrow?: string | null;
  title: string;
  description?: string | null;
  /** Background (image variant) or framed visual (pearl variant). */
  image?: Visual | null;
  /** Replaces the framed visual on the pearl variant. */
  aside?: ReactNode;
  actions?: ReactNode;
  /** Small facts under the description: counts, locations. */
  meta?: ReactNode;
  size?: "md" | "lg";
  children?: ReactNode;
}) {
  if (variant === "image" && image) {
    return (
      <section
        className={cn(
          "hero-overlay relative isolate flex flex-col overflow-hidden bg-navy-975 text-white",
          size === "lg" ? "min-h-[clamp(32rem,78svh,46rem)]" : "min-h-[clamp(26rem,62svh,36rem)]",
        )}
      >
        <div className="media-frame settle absolute inset-0 -z-30 bg-navy-950">
          <SmartImage src={image.url} alt="" sizes="100vw" priority quality={80} />
        </div>
        <div
          aria-hidden="true"
          className="from-navy-975 via-navy-975/85 to-navy-975/35 absolute inset-0 -z-20 bg-gradient-to-r max-md:via-navy-975/80"
        />
        <div
          aria-hidden="true"
          className="from-navy-975/80 absolute inset-x-0 bottom-0 -z-20 h-1/2 bg-gradient-to-t to-transparent"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(155_178_207/0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgb(155_178_207/0.07)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_right,black,transparent_70%)]"
        />
        <div className="surface-dark flex flex-1 flex-col bg-transparent">
          <Container width="wide" className="pt-6">
            <Breadcrumb items={trail} />
          </Container>
          <Container width="wide" className="flex flex-1 flex-col justify-end pt-10 pb-12 sm:pb-16 lg:pb-20">
            <div className="flex max-w-[48rem] flex-col gap-5">
              {eyebrow ? <span className="eyebrow intro">{eyebrow}</span> : null}
              <h1 className="intro text-hero text-safe max-w-[20ch] text-white [--i:1]">{title}</h1>
              {description ? (
                <p className="intro text-lead max-w-[56ch] text-white/75 [--i:2]">{description}</p>
              ) : null}
              {meta ? <div className="intro text-body-sm flex flex-wrap gap-2 text-white/70 [--i:3]">{meta}</div> : null}
              {actions ? <div className="intro pt-2 [--i:3]">{actions}</div> : null}
              {children}
            </div>
          </Container>
        </div>
      </section>
    );
  }

  const visual = aside ?? (image ? (
    <div className="relative">
      <div aria-hidden="true" className="absolute -inset-3 -z-10 rounded-[1.75rem] bg-gradient-to-br from-white to-pearl-200 sm:-inset-5" />
      <div className="media-frame border-line aspect-[4/3] rounded-3xl border bg-pearl-100 shadow-[var(--shadow-float)]">
        <SmartImage src={image.url} alt={image.alt} sizes="(min-width: 1024px) 40vw, 100vw" priority />
      </div>
    </div>
  ) : null);

  return (
    <section className="surface-grid border-line relative overflow-hidden border-b">
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 right-[-10%] size-[36rem] rounded-full bg-[radial-gradient(circle,rgb(47_189_214/0.12),transparent_65%)]" />
      <Container width="wide" className="relative pt-6">
        <Breadcrumb items={trail} />
      </Container>
      <Container
        width="wide"
        className={cn(
          "relative grid items-center gap-10 pt-10 pb-14 sm:pb-16 lg:gap-16",
          size === "lg" ? "lg:pt-14 lg:pb-24" : "lg:pt-12 lg:pb-20",
          visual ? "lg:grid-cols-[1.1fr_0.9fr]" : "",
        )}
      >
        <div className="flex max-w-[52rem] flex-col gap-5">
          {eyebrow ? <span className="eyebrow intro">{eyebrow}</span> : null}
          <h1 className="intro text-hero text-ink text-safe max-w-[20ch] [--i:1]">{title}</h1>
          {description ? (
            <p className="intro text-lead text-ink-muted max-w-[58ch] [--i:2]">{description}</p>
          ) : null}
          {meta ? <div className="intro text-body-sm text-ink-muted flex flex-wrap gap-2 [--i:3]">{meta}</div> : null}
          {actions ? <div className="intro pt-2 [--i:3]">{actions}</div> : null}
          {children}
        </div>
        {visual ? <div className="intro [--i:2]">{visual}</div> : null}
      </Container>
    </section>
  );
}

/** A small rounded fact chip for hero meta rows. */
export function MetaChip({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[0.8125rem] font-medium",
        dark ? "border-white/20 bg-white/[0.06] text-white/85" : "border-line bg-surface text-ink-muted",
      )}
    >
      {children}
    </span>
  );
}
