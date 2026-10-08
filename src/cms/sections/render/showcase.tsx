import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Building2,
  HeartPulse,
  Microscope,
  Scan,
  Siren,
  Stethoscope,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { buttonStyles } from "@/components/ui";
import { AnimatedNumber } from "@/components/site/animated-number";
import { SmartImage } from "@/components/site/media";
import { AddToQuoteButton } from "@/components/site/quote-basket";
import { cn } from "@/lib/utils/cn";
import { SCENES, visualFor } from "@/lib/visuals";
import type { ResolvedEntity } from "@/cms/sections/entities";
import {
  AccentHeading,
  row,
  rows,
  text,
  type RendererProps,
} from "./shared";

/*
 * The showcase compositions: the asymmetric, product-led layouts the homepage
 * is built from. Each one is the "bento" or "editorial" layout of an existing
 * section type, so a page that never chooses them renders exactly as before.
 */

/** A section heading on the left with a small grey "view all" chip on the right. */
function HeadRow({ content, center = false }: { content: Record<string, unknown>; center?: boolean }) {
  const heading = text(content, "heading");
  const intro = text(content, "intro");
  const overline = text(content, "overline");
  const ctaLabel = text(content, "ctaLabel");
  const ctaHref = text(content, "ctaHref");
  if (!heading && !intro) return null;

  return (
    <div
      className={cn(
        "reveal flex flex-col gap-5",
        center ? "items-center text-center" : "md:flex-row md:items-end md:justify-between md:gap-10",
      )}
    >
      <div className={cn("flex flex-col gap-3", center ? "items-center" : "max-w-[44rem]")}>
        {overline ? <span className="eyebrow">{overline}</span> : null}
        {heading ? (
          <h2 className={cn("text-section text-ink text-safe", center && "max-w-[22ch]")}>
            <AccentHeading value={heading} />
          </h2>
        ) : null}
        {intro ? <p className="text-body text-ink-muted max-w-[56ch]">{intro}</p> : null}
      </div>
      {ctaLabel && ctaHref && !center ? <Chip href={ctaHref}>{ctaLabel}</Chip> : null}
    </div>
  );
}

/** The small grey pill link used for "view all". */
function Chip({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="group bg-surface-panel text-ink hover:bg-steel-200 inline-flex h-9 w-fit shrink-0 items-center gap-1.5 rounded-md px-3.5 text-[0.8125rem] font-medium transition-colors"
    >
      {children}
      <ArrowRight aria-hidden="true" className="arrow-nudge size-3.5" />
    </Link>
  );
}

/* ------------------------------------------------- statement + figures -- */

const TILE_TONES = [
  "bg-surface-panel text-ink",
  "bg-medical-600 text-white",
  "bg-ink text-white",
] as const;

/**
 * A large statement on the left; on the right a staggered bento of figures —
 * grey, cyan and black tiles around one photograph.
 */
export function StatementStats({ content, media }: RendererProps) {
  const items = rows(content, "items").filter((item) => String(item.value ?? ""));
  const image = media.image ?? SCENES.ot;
  const heading = text(content, "heading");
  const ctaLabel = text(content, "ctaLabel");
  const ctaHref = text(content, "ctaHref");
  const note = text(content, "note");
  const [first, second, third] = items;

  const tile = (item: Record<string, unknown> | undefined, tone: number, className: string) =>
    item ? (
      <div className={cn("flex flex-col justify-between gap-6 rounded-2xl p-5 sm:p-7", TILE_TONES[tone], className)}>
        <p
          className={cn(
            "font-display leading-none font-medium tracking-[-0.04em]",
            /\d/.test(String(item.value ?? ""))
              ? "text-[clamp(2.25rem,1.7rem+1.8vw,3.25rem)] whitespace-nowrap"
              : "text-safe text-[clamp(1.75rem,1.3rem+1.6vw,3rem)]",
          )}
        >
          <AnimatedNumber value={String(item.value ?? "")} />
        </p>
        <p className={cn("flex flex-col gap-1 text-[0.8125rem] font-medium", tone === 0 ? "text-ink" : "text-white")}>
          {String(item.label ?? "")}
          {row(item, "detail") ? (
            <span className={cn("font-normal", tone === 0 ? "text-ink-muted" : "text-white/80")}>{row(item, "detail")}</span>
          ) : null}
        </p>
      </div>
    ) : null;

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:items-start lg:gap-14">
      <div className="reveal flex flex-col gap-8 lg:col-span-6 lg:pt-6">
        {text(content, "overline") ? <span className="eyebrow">{text(content, "overline")}</span> : null}
        {heading ? (
          <h2 className="text-ink text-safe text-[clamp(1.625rem,1.1rem+1.7vw,2.5rem)] leading-[1.2] font-normal tracking-[-0.03em]">
            <AccentHeading value={heading} />
          </h2>
        ) : null}
        {text(content, "intro") ? (
          <p className="text-body text-ink-muted max-w-[52ch]">{text(content, "intro")}</p>
        ) : null}
        {ctaLabel && ctaHref ? <Chip href={ctaHref}>{ctaLabel}</Chip> : null}
        {note ? <p className="text-caption text-ink-subtle max-w-[52ch]">{note}</p> : null}
      </div>

      <div className="reveal-stagger grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-6 lg:grid-rows-[repeat(3,minmax(8.5rem,auto))]">
        {/* Phones: two figures side by side, the photograph across, the third
            figure under it. Desktop: the staggered two-column bento. */}
        {tile(first, 0, "order-1 lg:order-none")}
        <div className="media-frame zoom-media relative order-3 col-span-2 aspect-[16/10] rounded-2xl lg:order-none lg:col-span-1 lg:row-span-2 lg:aspect-auto lg:min-h-56">
          <SmartImage src={image.url} alt={image.alt} sizes="(min-width: 1024px) 25vw, 100vw" />
        </div>
        {tile(second, 1, "order-2 lg:order-none lg:row-span-2")}
        {tile(third, 2, "order-4 col-span-2 lg:order-none lg:col-span-1")}
      </div>
    </div>
  );
}

/* ----------------------------------------------------- solution tiles -- */

const SOLUTION_ICONS: Array<[RegExp, LucideIcon]> = [
  [/surg|theatre|operat/i, Stethoscope],
  [/imag|diagnos|radiol|x-?ray|\bct\b|ultra/i, Scan],
  [/monitor/i, Activity],
  [/critical|icu|intensive/i, HeartPulse],
  [/lab/i, Microscope],
  [/emerg|trauma|resus/i, Siren],
  [/support|service|maint/i, Wrench],
  [/hospital|setup|infra/i, Building2],
];

const solutionIcon = (name: string): LucideIcon =>
  SOLUTION_ICONS.find(([pattern]) => pattern.test(name))?.[1] ?? Building2;

/**
 * Solutions as an editorial spread: the first two lead with their
 * photographs, the rest follow as a quiet list with an icon and a line.
 */
export function SolutionTiles({ content, entities }: RendererProps) {
  const items = entities.items ?? [];
  if (items.length === 0) return null;
  const [first, second, ...rest] = items;

  const photo = (entity: ResolvedEntity, large: boolean) => {
    const image = visualFor("solution", entity.name, entity.image);
    return (
      <Link
        href={entity.href}
        className={cn(
          "group surface-dark relative isolate flex flex-col justify-end overflow-hidden rounded-xl bg-navy-950 p-6 sm:p-8",
          large ? "min-h-[24rem] lg:h-full lg:min-h-[34rem]" : "min-h-[16rem] lg:min-h-[18rem]",
        )}
      >
        <span className="media-frame zoom-media reveal-image absolute inset-0 -z-10">
          <SmartImage src={image.url} alt={image.alt} sizes={large ? "(min-width: 1024px) 55vw, 100vw" : "(min-width: 1024px) 40vw, 100vw"} />
        </span>
        <span aria-hidden="true" className="from-navy-975/90 via-navy-975/40 absolute inset-0 -z-10 bg-gradient-to-t via-45% to-transparent" />
        <span className={cn("text-white", large ? "text-h2" : "text-h3")}>{entity.name}</span>
        {entity.summary ? (
          <span className="mt-2 max-w-[44ch] text-[0.875rem] text-white/80">{entity.summary}</span>
        ) : null}
        <span className="mt-5 inline-flex items-center gap-2 text-[0.8125rem] font-semibold text-white">
          Explore solution
          <ArrowRight aria-hidden="true" className="arrow-nudge size-4" />
        </span>
      </Link>
    );
  };

  return (
    <div className="flex flex-col gap-10 lg:gap-14">
      <HeadRow content={content} />
      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="lg:col-span-7">{photo(first, true)}</div>
        <div className="flex flex-col gap-4 lg:col-span-5 lg:gap-5">
          {second ? photo(second, false) : null}
          {rest.length > 0 ? (
            <ul className="reveal-stagger flex flex-col">
              {rest.map((entity) => {
                const Icon = solutionIcon(entity.name);
                return (
                  <li key={entity.id} className="border-line border-t last:border-b">
                    <Link href={entity.href} className="group flex items-center gap-4 py-4">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 transition-colors duration-[var(--duration-base)] group-hover:bg-cyan-500 group-hover:text-white">
                        <Icon aria-hidden="true" className="size-[1.125rem]" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-body text-ink font-semibold transition-transform duration-[var(--duration-base)] group-hover:translate-x-0.5">
                          {entity.name}
                        </span>
                        {entity.summary ? (
                          <span className="text-ink-muted line-clamp-1 text-[0.8125rem]">{entity.summary}</span>
                        ) : null}
                      </span>
                      <ArrowRight aria-hidden="true" className="arrow-nudge text-ink-subtle group-hover:text-primary size-4 shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------- product bento -- */

/*
 * Six slots on a four-column grid:
 *   [ A A B C ]
 *   [ A A D D ]
 *   [ E E F F ]
 * A feature product, two compact ones, then three wide ones. On two columns
 * it becomes A / B C / D / E F — always full rows.
 */
const BENTO = [
  "col-span-2 lg:row-span-2",
  "",
  "",
  "col-span-2",
  "lg:col-span-2",
  "lg:col-span-2",
] as const;
/* "wideLg" is wide only on desktop; below it shares a row and stacks. */
type Slot = "feature" | "compact" | "wide" | "wideLg";
const SLOT: Slot[] = ["feature", "compact", "compact", "wide", "wideLg", "wideLg"];

function productImage(entity: ResolvedEntity) {
  return visualFor("product", entity.name, entity.image);
}

/** One product in the bento: the cut-out dominates, the words stay short. */
function BentoProduct({ entity, slot }: { entity: ResolvedEntity; slot: Slot }) {
  const image = productImage(entity);
  const title = (
    <div className="flex min-w-0 flex-col gap-1">
      {entity.label ? <span className="eyebrow">{entity.label}</span> : null}
      <h3 className={cn("text-ink leading-snug", slot === "feature" ? "text-h3" : "text-body font-semibold")}>
        <Link href={entity.href} className="after:absolute after:inset-0 after:rounded-xl">
          {entity.name}
        </Link>
      </h3>
      {entity.summary && slot !== "compact" ? (
        <p className={cn("text-ink-muted line-clamp-2 max-w-[40ch] text-[0.8125rem] leading-relaxed", slot === "wideLg" && "max-lg:hidden")}>{entity.summary}</p>
      ) : null}
    </div>
  );
  const arrow = (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-[var(--duration-base)]",
        slot === "feature" ? "bg-medical-600 text-white" : "bg-surface-muted text-ink group-hover:bg-ink group-hover:text-white",
      )}
    >
      <ArrowRight aria-hidden="true" className="arrow-nudge size-4" />
    </span>
  );
  const picture = (className: string, sizes: string) => (
    <div className={cn("zoom-media relative", className)}>
      <SmartImage src={image.url} alt={image.alt} fit="contain" sizes={sizes} />
    </div>
  );

  if (slot === "feature") {
    return (
      <article className="group bg-surface-panel relative flex h-full min-h-[26rem] flex-col overflow-hidden rounded-xl p-6 sm:p-8">
        {title}
        {picture("my-4 min-h-56 flex-1", "(min-width: 1024px) 45vw, 90vw")}
        <div className="flex items-center justify-between">
          <span className="text-ink-subtle text-[0.75rem]">{entity.meta}</span>
          {arrow}
        </div>
      </article>
    );
  }
  if (slot === "wide" || slot === "wideLg") {
    const stackBelowLg = slot === "wideLg";
    return (
      <article
        className={cn(
          "group bg-surface-panel relative flex h-full min-h-[13rem] gap-4 overflow-hidden rounded-xl p-4 sm:p-6",
          stackBelowLg ? "flex-col lg:flex-row lg:items-stretch" : "items-stretch",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
          {title}
          <span className={stackBelowLg ? "max-lg:hidden" : undefined}>{arrow}</span>
        </div>
        {picture(
          stackBelowLg ? "min-h-32 flex-1 lg:w-[46%] lg:flex-none" : "w-[46%] shrink-0",
          "(min-width: 1024px) 20vw, 45vw",
        )}
      </article>
    );
  }
  return (
    <article className="group bg-surface-panel relative flex h-full min-h-[15rem] flex-col overflow-hidden rounded-xl p-4 sm:p-5">
      {title}
      {picture("mt-3 min-h-32 flex-1", "(min-width: 1024px) 20vw, 45vw")}
    </article>
  );
}

/** "Engineered for precision": products in an asymmetric bento. */
export function ProductBento({ content, entities }: RendererProps) {
  const items = (entities.items ?? []).slice(0, 6);
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-8 lg:gap-12">
      <HeadRow content={content} />
      <ul className="reveal-stagger grid grid-flow-row-dense grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:auto-rows-[minmax(14rem,auto)]">
        {items.map((entity, index) => (
          <li
            key={entity.id}
            className={cn(
              "min-w-0",
              BENTO[index],
              // An odd product out on two columns takes the whole row.
              index === items.length - 1 && [1, 4].includes(index) && "max-lg:col-span-2",
            )}
          >
            <BentoProduct entity={entity} slot={SLOT[index]} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Featured equipment: one tall product beside two wide ones. */
export function ProductFeature({ content, entities }: RendererProps) {
  const items = (entities.items ?? []).slice(0, 3);
  if (items.length === 0) return null;
  const [lead, ...rest] = items;

  const card = (entity: ResolvedEntity, lead: boolean) => {
    const image = productImage(entity);
    return (
      <article
        className={cn(
          "group bg-surface-panel relative flex h-full overflow-hidden rounded-2xl p-6 sm:p-8",
          lead ? "min-h-[26rem] flex-col lg:min-h-[36rem]" : "min-h-56 flex-col sm:flex-row sm:items-stretch sm:gap-6",
        )}
      >
        <div className={cn("relative z-[1] flex flex-col gap-2", !lead && "sm:w-1/2 sm:justify-between")}>
          <div className="flex flex-col gap-2">
            <h3 className="text-h3 text-ink">{entity.name}</h3>
            {entity.summary ? <p className="text-body-sm text-ink-muted line-clamp-2 max-w-[34ch]">{entity.summary}</p> : null}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              href={entity.href}
              className="bg-ink inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 text-[0.8125rem] font-medium text-white transition-colors hover:bg-steel-800"
            >
              View product
              <ArrowRight aria-hidden="true" className="size-3.5" />
              <span className="sr-only">: {entity.name}</span>
            </Link>
            <AddToQuoteButton productId={entity.id} productName={entity.name} size="sm" compact />
          </div>
        </div>
        <div className={cn("zoom-media relative flex-1", lead ? "mt-6 min-h-64" : "mt-4 min-h-40 sm:mt-0")}>
          <SmartImage
            src={image.url}
            alt={image.alt}
            fit="contain"
            sizes={lead ? "(min-width: 1024px) 40vw, 90vw" : "(min-width: 1024px) 25vw, 90vw"}
          />
        </div>
      </article>
    );
  };

  return (
    <div className="flex flex-col gap-10 lg:gap-14">
      <HeadRow content={content} center />
      <div className="reveal-stagger grid gap-3 sm:gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">{card(lead, true)}</div>
        {rest.length > 0 ? (
          <div className="grid gap-3 sm:gap-4 lg:col-span-7">
            {rest.map((entity) => (
              <div key={entity.id}>{card(entity, false)}</div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------------------------------------------- category tiles -- */

/** Category tiles: the equipment in a soft well, the name beneath it. */
export function CategoryTiles({ content, entities }: RendererProps) {
  const items = entities.items ?? [];
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-8 lg:gap-12">
      <HeadRow content={content} />
      <ul className="reveal-stagger grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 lg:grid-cols-5">
        {items.map((entity) => {
          const image = visualFor("category", entity.name, entity.image);
          return (
            <li key={entity.id}>
              <Link href={entity.href} className="group flex flex-col gap-3">
                <span className="bg-surface-panel relative block aspect-square overflow-hidden rounded-xl transition-colors duration-[var(--duration-base)]">
                  <span className="zoom-media absolute inset-[12%]">
                    <SmartImage src={image.url} alt="" fit="contain" sizes="(min-width: 1024px) 18vw, 45vw" />
                  </span>
                </span>
                <span className="flex items-baseline justify-between gap-2 px-0.5">
                  <span className="text-body-sm text-ink group-hover:text-primary font-semibold transition-colors">
                    {entity.name}
                  </span>
                  {entity.count ? (
                    <span className="text-ink-subtle shrink-0 text-[0.75rem] tabular-nums">{entity.count}</span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* --------------------------------------------------------- image band -- */

/** A campaign photograph: wide, immersive, one oversized line and one action. */
export function ImageBand({ content, media }: RendererProps) {
  const image = media.image ?? SCENES.ctRoom;
  const heading = text(content, "heading");
  const body = text(content, "body");
  const primaryLabel = text(content, "primaryLabel");
  const primaryHref = text(content, "primaryHref");
  const label = primaryLabel || text(content, "secondaryLabel");
  const href = primaryHref || text(content, "secondaryHref");

  return (
    <div className="surface-dark relative isolate flex min-h-[34rem] overflow-hidden rounded-xl sm:min-h-[30rem] lg:aspect-[2.1/1] lg:min-h-0">
      <div className="media-frame reveal-image absolute inset-0 -z-20 bg-navy-950">
        <SmartImage src={image.url} alt={image.alt} sizes="100vw" quality={80} className="object-[72%_center]" />
      </div>
      <div
        aria-hidden="true"
        className="from-navy-975/90 via-navy-975/30 absolute inset-0 -z-10 bg-gradient-to-t to-transparent lg:bg-gradient-to-tr lg:via-navy-975/15"
      />
      <div className="reveal mt-auto flex w-full flex-col gap-6 p-6 sm:p-10 lg:p-14">
        {text(content, "overline") ? <span className="eyebrow">{text(content, "overline")}</span> : null}
        <h2 className="text-safe max-w-[16ch] text-[clamp(2.125rem,1.3rem+3vw,4.5rem)] leading-[1.02] font-light tracking-[-0.04em] text-white">
          <AccentHeading value={heading} dark />
        </h2>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          {body ? <p className="max-w-[46ch] text-[0.9375rem] text-white/75">{body}</p> : <span />}
          {label && href ? (
            <Link href={href} className={cn(buttonStyles({ variant: "inverse", size: "md" }), "group shrink-0")}>
              {label}
              <ArrowRight aria-hidden="true" className="arrow-nudge size-4" />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
