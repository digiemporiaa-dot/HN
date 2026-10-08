import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

import { ProductCard } from "@/components/site/product-card";
import {
  ArrowLink,
  ArticleCard,
  BrandCard,
  CategoryCard,
  SceneCard,
} from "@/components/site/cards";
import { SmartImage } from "@/components/site/media";
import { cn } from "@/lib/utils/cn";
import { groupByRegion, REGIONS } from "@/lib/regions";
import type { ResolvedEntity } from "@/cms/sections/entities";
import type { ProductCardData } from "@/server/products/public";
import {
  AccentHeading,
  gridCols,
  Intro,
  isDark,
  Stack,
  text,
  type RendererProps,
} from "./shared";

/* Card adapters: a resolved record in the shape each card takes. */

const tile = (entity: ResolvedEntity) => ({
  name: entity.name,
  href: entity.href,
  summary: entity.summary || null,
  image: entity.image,
  count: entity.count,
});

const productData = (entity: ResolvedEntity): ProductCardData => ({
  id: entity.id,
  name: entity.name,
  slug: entity.href.replace(/^\/products\//, ""),
  modelNumber: null,
  shortDescription: entity.summary || null,
  categoryName: entity.label || "Equipment",
  brandName: entity.meta || null,
  image: entity.image,
});

/* -------------------------------------------------------------- products -- */

export function ProductGrid({ content, design, entities }: RendererProps) {
  const items = entities.items ?? [];
  if (items.length === 0) return null;
  return (
    <Stack>
      <Intro content={content} design={design} />
      {/* A swipeable row on phones, a grid from small tablets up. */}
      <ul
        className={cn(
          "reveal-stagger scrollbar-none -mx-[var(--gutter)] flex snap-x snap-mandatory gap-4 overflow-x-auto px-[var(--gutter)] pb-2",
          "sm:mx-0 sm:grid sm:snap-none sm:overflow-visible sm:px-0 sm:pb-0 lg:gap-6",
          gridCols(design.columns, "4"),
        )}
      >
        {items.map((entity) => (
          <li key={entity.id} className="flex w-[84%] shrink-0 snap-start sm:w-auto">
            <ProductCard as="div" product={productData(entity)} />
          </li>
        ))}
      </ul>
    </Stack>
  );
}

/* ------------------------------------------------------------ categories -- */

const span = ["", "lg:col-span-1", "lg:col-span-2", "lg:col-span-3"];

export function CategoryGrid({ content, design, entities }: RendererProps) {
  const items = entities.items ?? [];
  if (items.length === 0) return null;
  const allHref = text(content, "ctaHref") || "/categories";

  if (design.layout === "bento" && items.length >= 3) {
    const [lead, ...rest] = items;
    // The lead tile fills four slots; whatever is left over in the last row
    // becomes a "full catalogue" tile so the grid always closes square.
    const overflow = Math.max(0, rest.length - 4) % 4;
    const filler = rest.length < 4 ? 4 - rest.length : overflow ? 4 - overflow : 0;

    return (
      <Stack>
        <Intro content={content} design={design} />
        <ul className="reveal-stagger grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          <li className="col-span-2 lg:row-span-2">
            <CategoryCard
              data={{ ...tile(lead), eyebrow: "Featured range" }}
              size="feature"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </li>
          {rest.map((entity) => (
            <li key={entity.id}>
              <CategoryCard data={tile(entity)} size="compact" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
            </li>
          ))}
          {filler ? (
            <li className={cn("col-span-2", span[filler])}>
              <Link
                href={allHref}
                className="group border-line-strong hover:border-primary flex h-full min-h-40 flex-col justify-between gap-6 rounded-2xl border border-dashed p-6 transition-colors"
              >
                <span className="eyebrow">Complete catalogue</span>
                <span className="flex items-end justify-between gap-4">
                  <span className="text-h4 text-ink group-hover:text-primary max-w-[18ch] transition-colors">
                    Explore every equipment category
                  </span>
                  <span className="bg-primary flex size-11 shrink-0 items-center justify-center rounded-full text-white">
                    <ArrowRight aria-hidden="true" className="arrow-nudge size-5" />
                  </span>
                </span>
              </Link>
            </li>
          ) : null}
        </ul>
      </Stack>
    );
  }

  const overlay = design.cardStyle === "overlay";
  return (
    <Stack>
      <Intro content={content} design={design} />
      <ul className={cn("reveal-stagger grid grid-cols-1 gap-5 lg:gap-6", gridCols(design.columns))}>
        {items.map((entity) => (
          <li key={entity.id}>
            {overlay ? (
              <SceneCard kind="category" data={tile(entity)} aspect="landscape" sizes="(min-width: 1024px) 33vw, 100vw" />
            ) : (
              <CategoryCard data={tile(entity)} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
            )}
          </li>
        ))}
      </ul>
    </Stack>
  );
}

/* ---------------------------------------------------------------- brands -- */

export function BrandGrid({ content, design, entities }: RendererProps) {
  const items = entities.items ?? [];
  if (items.length === 0) return null;
  return (
    <Stack>
      <Intro content={content} design={design} />
      <ul className={cn("grid grid-cols-2 gap-4", gridCols(design.columns, "4"))}>
        {items.map((entity) => (
          <li key={entity.id}>
            <BrandCard data={{ name: entity.name, href: entity.href, image: entity.image }} />
          </li>
        ))}
      </ul>
    </Stack>
  );
}

/* ----------------------------------------------------------- specialties -- */

/**
 * Portrait clinical cards. On phones they become a swipeable row, which
 * keeps eight departments from turning into a very long scroll.
 */
export function SpecialtyGrid({ content, design, entities }: RendererProps) {
  const items = entities.items ?? [];
  if (items.length === 0) return null;
  return (
    <Stack>
      <Intro content={content} design={design} />
      <ul
        className={cn(
          "reveal-stagger scrollbar-none -mx-[var(--gutter)] flex snap-x snap-mandatory gap-4 overflow-x-auto px-[var(--gutter)] pb-2",
          "sm:mx-0 sm:grid sm:snap-none sm:overflow-visible sm:px-0 sm:pb-0 lg:gap-6",
          gridCols(design.columns, "4"),
        )}
      >
        {items.map((entity) => (
          <li key={entity.id} className="w-[78%] shrink-0 snap-start sm:w-auto">
            <SceneCard
              kind="specialty"
              data={{ ...tile(entity), count: null }}
              aspect="portrait"
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 80vw"
            />
          </li>
        ))}
      </ul>
    </Stack>
  );
}

/* ------------------------------------------------------------- solutions -- */

export function SolutionGrid({ content, design, entities }: RendererProps) {
  const items = entities.items ?? [];
  if (items.length === 0) return null;
  const dark = isDark(design);

  if (design.layout === "editorial") {
    return (
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="reveal flex flex-col gap-6 lg:sticky lg:top-28 lg:col-span-4 lg:self-start">
          {text(content, "overline") ? <span className="eyebrow">{text(content, "overline")}</span> : null}
          {text(content, "heading") ? (
            <h2 className="text-h1 text-ink text-safe">
              <AccentHeading value={text(content, "heading")} dark={dark} />
            </h2>
          ) : null}
          {text(content, "intro") ? <p className="text-lead text-ink-muted">{text(content, "intro")}</p> : null}
          <ol className={cn("mt-2 hidden flex-col border-t lg:flex", dark ? "border-white/10" : "border-line")}>
            {items.map((entity, index) => (
              <li key={entity.id} className={cn("border-b", dark ? "border-white/10" : "border-line")}>
                <Link
                  href={entity.href}
                  className="group text-body-sm text-ink-muted hover:text-ink flex items-center gap-4 py-3.5 transition-colors"
                >
                  <span className="font-display text-caption text-ink-subtle tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 font-medium">{entity.name}</span>
                  <ArrowRight aria-hidden="true" className="arrow-nudge size-4 opacity-60" />
                </Link>
              </li>
            ))}
          </ol>
          {text(content, "ctaLabel") && text(content, "ctaHref") ? (
            <ArrowLink href={text(content, "ctaHref")} tone={dark ? "inverse" : "primary"} className="w-fit">
              {text(content, "ctaLabel")}
            </ArrowLink>
          ) : null}
        </div>
        <ul className="reveal-stagger grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-8 lg:gap-6">
          {items.map((entity, index) => (
            <li key={entity.id} className={cn(index === 0 && items.length % 2 === 1 && "sm:col-span-2")}>
              <SceneCard
                kind="solution"
                data={{ ...tile(entity), count: null, eyebrow: "Solution" }}
                aspect={index === 0 && items.length % 2 === 1 ? "wide" : "landscape"}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <Stack>
      <Intro content={content} design={design} />
      <ul className={cn("reveal-stagger grid grid-cols-1 gap-5 lg:gap-6", gridCols(design.columns))}>
        {items.map((entity) => (
          <li key={entity.id}>
            <SceneCard kind="solution" data={{ ...tile(entity), count: null }} aspect="landscape" sizes="(min-width: 1024px) 33vw, 100vw" />
          </li>
        ))}
      </ul>
    </Stack>
  );
}

/* ---------------------------------------------------------- applications -- */

/** Rows alternate two wide cards and three narrower ones, ending square. */
function mosaicSpans(count: number): number[] {
  const spans: number[] = [];
  let remaining = count;
  let wide = true;
  while (remaining > 0) {
    let size = wide ? 2 : 3;
    if (remaining <= 3) size = remaining;
    else if (remaining - size === 1) size = wide ? 3 : 2;
    for (let i = 0; i < size; i++) spans.push(6 / size);
    remaining -= size;
    wide = !wide;
  }
  return spans;
}

const mosaicClass: Record<number, string> = {
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  6: "lg:col-span-6",
};

export function ApplicationGrid({ content, design, entities }: RendererProps) {
  const items = entities.items ?? [];
  if (items.length === 0) return null;
  const spans = mosaicSpans(items.length);
  return (
    <Stack>
      <Intro content={content} design={design} />
      <ul className="reveal-stagger grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6 lg:gap-6">
        {items.map((entity, index) => (
          <li key={entity.id} className={cn(mosaicClass[spans[index]], spans[index] === 6 && "sm:col-span-2")}>
            <SceneCard
              kind="application"
              data={{ ...tile(entity), count: null, eyebrow: "Clinical environment" }}
              aspect={spans[index] === 2 ? "landscape" : "wide"}
              size={spans[index] === 2 ? "md" : "lg"}
              sizes={spans[index] === 2 ? "(min-width: 1024px) 33vw, 50vw" : "(min-width: 1024px) 50vw, 100vw"}
            />
          </li>
        ))}
      </ul>
    </Stack>
  );
}

/* --------------------------------------------------------------- articles -- */

const articleData = (entity: ResolvedEntity) => ({
  title: entity.name,
  href: entity.href,
  excerpt: entity.summary || null,
  image: entity.image,
  date: entity.date,
  author: entity.author,
});

export function PostGrid({ content, design, entities }: RendererProps) {
  const items = entities.items ?? [];
  if (items.length === 0) return null;

  if (design.layout === "editorial" && items.length >= 2) {
    const [lead, ...rest] = items;
    return (
      <Stack>
        <Intro content={content} design={design} />
        <div className="reveal grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <ArticleCard data={articleData(lead)} variant="featured" sizes="(min-width: 1024px) 55vw, 100vw" />
          </div>
          <div className="flex flex-col gap-6 lg:col-span-5">
            {rest.slice(0, 4).map((entity) => (
              <ArticleCard key={entity.id} data={articleData(entity)} variant="compact" sizes="160px" />
            ))}
          </div>
        </div>
      </Stack>
    );
  }

  return (
    <Stack>
      <Intro content={content} design={design} />
      <ul className={cn("reveal-stagger grid grid-cols-1 gap-6", gridCols(design.columns))}>
        {items.map((entity) => (
          <li key={entity.id}>
            <ArticleCard data={articleData(entity)} sizes="(min-width: 1024px) 33vw, 100vw" />
          </li>
        ))}
      </ul>
    </Stack>
  );
}

/* ------------------------------------------------------------ logo strip -- */

function Logo({ entity, hidden }: { entity: ResolvedEntity; hidden?: boolean }) {
  return (
    <Link
      href={entity.href}
      tabIndex={hidden ? -1 : undefined}
      className="group flex h-16 w-full max-w-[13rem] items-center justify-center rounded-xl px-2 transition-colors"
    >
      {entity.image ? (
        <span className="relative h-10 w-full opacity-60 grayscale transition-[filter,opacity] duration-[var(--duration-slow)] group-hover:opacity-100 group-hover:grayscale-0">
          <SmartImage src={entity.image.url} alt={entity.image.alt || entity.name} sizes="208px" fit="contain" />
        </span>
      ) : (
        <span className="text-body text-ink-muted group-hover:text-ink font-semibold tracking-tight transition-colors">
          {entity.name}
        </span>
      )}
    </Link>
  );
}

export function LogoStrip({ content, design, entities }: RendererProps) {
  const items = entities.items ?? [];
  if (items.length === 0) return null;
  const marquee = design.layout === "full";

  return (
    <div className="flex flex-col gap-8">
      {text(content, "heading") ? (
        <p className="text-caption text-ink-subtle text-center font-semibold tracking-[0.16em] uppercase">
          {text(content, "heading")}
        </p>
      ) : null}
      {marquee ? (
        <div className="marquee relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <div
            className="marquee-track flex w-max"
            style={{ ["--marquee-duration" as string]: `${Math.max(30, items.length * 6)}s` } as CSSProperties}
          >
            {[0, 1].map((copy) => (
              <ul key={copy} aria-hidden={copy === 1 ? true : undefined} className="flex shrink-0 items-center gap-4 pr-4">
                {items.map((entity) => (
                  <li key={entity.id} className="w-44 sm:w-52">
                    <Logo entity={entity} hidden={copy === 1} />
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      ) : (
        // A quiet grid of hairline cells: logos given room, none louder
        // than another.
        <ul className="border-line grid grid-cols-2 border-t border-l sm:grid-cols-3 lg:grid-cols-6">
          {items.map((entity) => (
            <li key={entity.id} className="border-line flex min-h-24 items-center justify-center border-r border-b px-4 py-6 sm:min-h-28">
              <Logo entity={entity} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- locations -- */

export function Locations({ content, design, locations }: RendererProps) {
  const cities = locations.flatMap((state) => state.cities);
  const regions = groupByRegion(locations);
  const dark = isDark(design);
  const highlight = text(content, "highlight");

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
      <div className="reveal flex flex-col gap-6 lg:col-span-5">
        {text(content, "overline") ? <span className="eyebrow">{text(content, "overline")}</span> : null}
        <h2 className="text-h1 text-ink text-safe">
          <AccentHeading value={text(content, "heading") || "Supplying healthcare institutions across India."} dark={dark} />
        </h2>
        {text(content, "intro") ? <p className="text-lead text-ink-muted">{text(content, "intro")}</p> : null}

        <div className={cn("mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border", dark ? "border-white/10 bg-white/10" : "border-line bg-line")}>
          <div className={cn("flex flex-col gap-1 p-6", dark ? "bg-navy-975" : "bg-surface")}>
            <span className="font-display text-ink text-[clamp(2rem,1.6rem+1.6vw,2.75rem)] leading-none font-semibold tracking-[-0.04em]">
              {highlight || (cities.length > 0 ? cities.length : "Pan-India")}
            </span>
            <span className="text-caption text-ink-muted">
              {highlight ? "Service coverage" : cities.length > 0 ? "Cities with local pages" : "Service coverage"}
            </span>
          </div>
          <div className={cn("flex flex-col gap-1 p-6", dark ? "bg-navy-975" : "bg-surface")}>
            <span className="font-display text-ink text-[clamp(2rem,1.6rem+1.6vw,2.75rem)] leading-none font-semibold tracking-[-0.04em]">
              {regions.length > 0 ? regions.length : 6}
            </span>
            <span className="text-caption text-ink-muted">Regions served</span>
          </div>
        </div>

        {text(content, "ctaLabel") && text(content, "ctaHref") ? (
          <ArrowLink href={text(content, "ctaHref")} tone={dark ? "inverse" : "primary"} className="w-fit">
            {text(content, "ctaLabel")}
          </ArrowLink>
        ) : null}
      </div>

      <div className="lg:col-span-7">
        {regions.length > 0 ? (
          <ul className="reveal-stagger grid gap-4 sm:grid-cols-2">
            {regions.map(([region, list]) => (
              <li
                key={region}
                className={cn(
                  "flex flex-col gap-4 rounded-2xl border p-6",
                  dark ? "border-white/10 bg-white/[0.03]" : "border-line bg-surface shadow-[var(--shadow-card)]",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-caption text-ink font-semibold tracking-[0.14em] uppercase">{region}</h3>
                  <span className="text-caption text-ink-subtle tabular-nums">{list.length}</span>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {list.map((city) => (
                    <li key={city.id}>
                      <Link
                        href={city.href}
                        className={cn(
                          "text-body-sm inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 transition-colors",
                          dark
                            ? "border-white/15 text-white/85 hover:border-cyan-300 hover:text-white"
                            : "border-line text-ink hover:border-primary hover:text-primary",
                        )}
                      >
                        <span className="live-dot size-1.5 rounded-full bg-cyan-400" />
                        {city.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="reveal-stagger grid gap-4 sm:grid-cols-2">
            {REGIONS.map(([region]) => (
              <li key={region} className="border-line bg-surface text-body-sm text-ink flex items-center gap-3 rounded-2xl border p-5 font-medium">
                <MapPin aria-hidden="true" className="text-primary size-4" />
                {region}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
