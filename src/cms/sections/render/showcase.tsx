import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
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
  Actions,
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

/** Compact grey cards, an icon, a title and one line: the solutions index. */
export function SolutionTiles({ content, entities }: RendererProps) {
  const items = entities.items ?? [];
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-10 lg:gap-14">
      <HeadRow content={content} center />
      <ul className="reveal-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        {items.map((entity) => {
          const Icon = solutionIcon(entity.name);
          return (
            <li key={entity.id}>
              <Link
                href={entity.href}
                className="group bg-surface-panel hover:border-line relative flex h-full items-start gap-4 rounded-2xl border border-transparent p-5 transition-[background-color,border-color] duration-[var(--duration-base)] hover:bg-white sm:flex-col sm:items-stretch sm:gap-10 sm:p-6"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 transition-colors duration-[var(--duration-base)] group-hover:bg-cyan-500 group-hover:text-white">
                  <Icon aria-hidden="true" className="size-[1.125rem]" />
                </span>
                <span className="flex min-w-0 flex-col gap-1.5 pr-5 sm:pr-0">
                  <span className="text-body text-ink font-semibold transition-transform duration-[var(--duration-base)] group-hover:translate-x-0.5">
                    {entity.name}
                  </span>
                  {entity.summary ? (
                    <span className="text-ink-muted line-clamp-2 text-[0.8125rem] leading-relaxed">{entity.summary}</span>
                  ) : null}
                </span>
                <ArrowUpRight aria-hidden="true" className="text-ink-subtle absolute top-5 right-5 size-4 opacity-0 transition-opacity group-hover:opacity-100 sm:top-6 sm:right-6" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------- product bento -- */

/* Six slots that tile a four-column grid: wide, tall, then four singles. */
const BENTO = [
  "col-span-2 lg:col-span-2",
  "lg:row-span-2",
  "",
  "",
  "",
  "",
] as const;

function productImage(entity: ResolvedEntity) {
  return visualFor("product", entity.name, entity.image);
}

/** One product in the bento: a grey card, the cut-out, the name and a line. */
function BentoProduct({ entity, slot }: { entity: ResolvedEntity; slot: number }) {
  const wide = slot === 0;
  const tall = slot === 1;
  const image = productImage(entity);

  const title = (
    <div className="flex flex-col gap-1">
      <h3 className="text-body text-ink font-semibold leading-snug">
        <Link href={entity.href} className="after:absolute after:inset-0 after:rounded-2xl">
          {entity.name}
        </Link>
      </h3>
      {entity.summary ? (
        <p className={cn("text-ink-muted text-[0.8125rem] leading-relaxed", wide ? "line-clamp-3" : "line-clamp-2")}>
          {entity.summary}
        </p>
      ) : null}
    </div>
  );
  const footer = (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-subtle truncate text-[0.75rem]">{entity.label || entity.meta}</span>
      {wide ? (
        <span className="bg-medical-600 flex size-9 shrink-0 items-center justify-center rounded-full text-white">
          <ArrowRight aria-hidden="true" className="arrow-nudge size-4" />
        </span>
      ) : (
        <ArrowUpRight aria-hidden="true" className="text-ink-subtle group-hover:text-primary size-4 shrink-0 transition-colors" />
      )}
    </div>
  );
  const picture = (
    <div className={cn("zoom-media relative flex-1", tall ? "min-h-52 lg:min-h-[18rem]" : "min-h-36 sm:min-h-40")}>
      <SmartImage
        src={image.url}
        alt={image.alt}
        fit="contain"
        sizes={wide ? "(min-width: 1024px) 25vw, 90vw" : "(min-width: 1024px) 20vw, 45vw"}
      />
    </div>
  );

  return (
    <article className="group bg-surface-panel relative flex h-full overflow-hidden rounded-2xl p-4 transition-colors duration-[var(--duration-base)] hover:bg-steel-200/60 sm:p-5">
      {wide ? (
        <div className="grid w-full gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="flex min-w-0 flex-col justify-between gap-4">
            {title}
            <div className="max-sm:hidden">{footer}</div>
          </div>
          {picture}
          <div className="sm:hidden">{footer}</div>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-3">
          {title}
          {picture}
          {footer}
        </div>
      )}
    </article>
  );
}

/** "Engineered for precision": products in an asymmetric bento. */
export function ProductBento({ content, entities }: RendererProps) {
  const items = entities.items ?? [];
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      <HeadRow content={content} />
      <ul className="reveal-stagger grid grid-flow-row-dense grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:auto-rows-[minmax(15rem,auto)]">
        {items.map((entity, index) => (
          <li
            key={entity.id}
            className={cn(
              "min-w-0",
              BENTO[index % BENTO.length],
              // Two columns below desktop: a last card that would sit alone
              // takes the full row instead.
              index === items.length - 1 && items.length % 2 === 0 && "max-lg:col-span-2",
            )}
          >
            <BentoProduct entity={entity} slot={index % BENTO.length} />
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

/** Compact category cards: the equipment on grey, the name and a count. */
export function CategoryTiles({ content, entities }: RendererProps) {
  const items = entities.items ?? [];
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      <HeadRow content={content} />
      <ul className="reveal-stagger grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {items.map((entity) => {
          const image = visualFor("category", entity.name, entity.image);
          return (
            <li key={entity.id}>
              <Link
                href={entity.href}
                className="group bg-surface-panel relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl p-3 transition-colors duration-[var(--duration-base)] hover:bg-steel-200/60 sm:p-4"
              >
                <span className="zoom-media relative block aspect-[4/3]">
                  <SmartImage src={image.url} alt="" fit="contain" sizes="(min-width: 1024px) 18vw, (min-width: 640px) 30vw, 45vw" />
                </span>
                <span className="flex items-end justify-between gap-2 px-1">
                  <span className="flex min-w-0 flex-col">
                    <span className="text-body-sm text-ink font-semibold transition-transform duration-[var(--duration-base)] group-hover:translate-x-0.5">
                      {entity.name}
                    </span>
                    {entity.count ? (
                      <span className="text-ink-subtle text-[0.75rem]">
                        {entity.count} product{entity.count === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </span>
                  <span className="h-px w-0 shrink-0 bg-cyan-500 transition-[width] duration-[var(--duration-base)] group-hover:w-5" />
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

/** A wide photograph with the statement laid over its lower left corner. */
export function ImageBand({ content, media }: RendererProps) {
  const image = media.image ?? SCENES.ctRoom;
  const heading = text(content, "heading");
  const body = text(content, "body");

  return (
    <div className="reveal surface-dark relative isolate flex min-h-[30rem] overflow-hidden rounded-2xl sm:min-h-[26rem] lg:aspect-[2.35/1] lg:min-h-0">
      <div className="media-frame absolute inset-0 -z-20 bg-navy-950">
        <SmartImage src={image.url} alt={image.alt} sizes="100vw" quality={80} />
      </div>
      <div
        aria-hidden="true"
        className="from-navy-975/85 via-navy-975/35 absolute inset-0 -z-10 bg-gradient-to-t to-transparent lg:bg-gradient-to-tr lg:via-navy-975/20"
      />
      <div className="mt-auto flex w-full flex-col gap-6 p-6 sm:p-10 lg:flex-row lg:items-end lg:justify-between lg:p-12">
        <div className="flex max-w-[36rem] flex-col gap-3">
          {text(content, "overline") ? <span className="eyebrow">{text(content, "overline")}</span> : null}
          <h2 className="text-white text-safe text-[clamp(1.75rem,1.2rem+1.8vw,2.75rem)] leading-[1.1] font-medium tracking-[-0.03em]">
            <AccentHeading value={heading} dark />
          </h2>
          {body ? <p className="text-body-sm max-w-[48ch] text-white/75">{body}</p> : null}
        </div>
        <div className="shrink-0">
          {text(content, "primaryLabel") && text(content, "primaryHref") ? (
            <Link href={text(content, "primaryHref")} className={cn(buttonStyles({ variant: "inverse", size: "sm" }), "group")}>
              {text(content, "primaryLabel")}
              <ArrowRight aria-hidden="true" className="arrow-nudge size-4" />
            </Link>
          ) : (
            <Actions
              primaryLabel=""
              primaryHref=""
              secondaryLabel={text(content, "secondaryLabel")}
              secondaryHref={text(content, "secondaryHref")}
              dark
            />
          )}
        </div>
      </div>
    </div>
  );
}
