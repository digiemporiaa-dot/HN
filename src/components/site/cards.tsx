import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import type { Visual, VisualKind } from "@/lib/visuals";
import { RecordImage, SmartImage } from "./media";

/**
 * The public site's card family.
 *
 * Separate components rather than one configurable card: a product card, a
 * clinical-environment card and an article card answer different questions,
 * and forcing them through one shape is how a catalogue starts to look like a
 * template. What they share — radius, hairline, lift, image zoom, arrow — comes
 * from the same tokens and utility classes.
 *
 * Every card is one link: the title's link is stretched over the whole card
 * (`after:absolute after:inset-0`), so the hit area is the card while the
 * accessible name stays the title, and any secondary control can sit above it.
 */

const stretched =
  "after:absolute after:inset-0 after:z-[1] after:rounded-[inherit] focus-visible:outline-none";

const cardFocus =
  "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-[var(--color-ring)]";

export const formatDate = (iso: string | Date | null) =>
  iso
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeZone: "Asia/Kolkata",
      }).format(typeof iso === "string" ? new Date(iso) : iso)
    : null;

/**
 * Grid columns that fit the number of items, so a range of two never sits in
 * a four-column grid with half the row empty.
 */
export function fitColumns(count: number, max: 2 | 3 | 4 = 4): string {
  let n = Math.min(Math.max(count, 1), max);
  // Four columns that would strand one card on the last row become three.
  if (n === 4 && count % 4 === 1 && count % 3 !== 1) n = 3;
  return n <= 2
    ? "sm:grid-cols-2 lg:grid-cols-3"
    : n === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-4";
}

const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`;

/** A text link with the sliding arrow. */
export function ArrowLink({
  href,
  children,
  className,
  tone = "primary",
}: {
  href: string;
  children: ReactNode;
  className?: string;
  tone?: "primary" | "ink" | "inverse";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group text-body-sm inline-flex items-center gap-2 font-semibold transition-colors",
        tone === "primary" && "text-primary hover:text-primary-hover",
        tone === "ink" && "text-ink hover:text-primary",
        tone === "inverse" && "text-white hover:text-cyan-200",
        className,
      )}
    >
      {children}
      <ArrowRight aria-hidden="true" className="arrow-nudge size-4" />
    </Link>
  );
}

/* ------------------------------------------------------------ category -- */

export type TileData = {
  name: string;
  href: string;
  summary?: string | null;
  image: Visual | null;
  count?: number | null;
  eyebrow?: string | null;
};

/**
 * An equipment category: the picture on top, the words below. The "feature"
 * size is the bento lead tile — taller, with the copy laid over the image.
 */
export function CategoryCard({
  data,
  size = "tile",
  sizes,
  heading: Heading = "h3",
}: {
  data: TileData;
  size?: "tile" | "feature" | "compact";
  sizes: string;
  heading?: "h2" | "h3";
}) {
  if (size === "feature") {
    // The lead tile of a bento: the equipment large on grey, the words over
    // its lower left.
    return (
      <article
        className={cn(
          "group bg-surface-panel relative isolate flex h-full min-h-[22rem] flex-col justify-end overflow-hidden rounded-2xl p-6 transition-colors duration-[var(--duration-base)] hover:bg-steel-200/60 sm:p-8",
          cardFocus,
        )}
      >
        <RecordImage
          kind="category"
          name={data.name}
          image={data.image}
          sizes={sizes}
          fit="contain"
          frameClassName="zoom-media absolute inset-x-[8%] top-[6%] bottom-[34%] -z-10 bg-transparent"
        />
        {data.count ? (
          <span className="text-ink-muted absolute top-5 left-5 rounded-md bg-white px-2.5 py-1 text-[0.75rem] font-medium sm:top-6 sm:left-6">
            {plural(data.count, "product")}
          </span>
        ) : null}
        <span className="eyebrow">{data.eyebrow ?? "Featured range"}</span>
        <Heading className="text-h2 text-ink mt-2">
          <Link href={data.href} className={stretched}>
            {data.name}
          </Link>
        </Heading>
        {data.summary ? (
          <p className="text-body-sm text-ink-muted mt-2 max-w-[44ch]">{data.summary}</p>
        ) : null}
        <span className="text-body-sm text-ink group-hover:text-primary mt-5 inline-flex items-center gap-2 font-semibold transition-colors">
          Explore range
          <ArrowRight aria-hidden="true" className="arrow-nudge size-4" />
        </span>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "group bg-surface-panel relative flex h-full flex-col overflow-hidden rounded-2xl p-2 transition-colors duration-[var(--duration-base)] hover:bg-steel-200/60",
        cardFocus,
      )}
    >
      <RecordImage
        kind="category"
        name={data.name}
        image={data.image}
        sizes={sizes}
        fit="contain"
        frameClassName={cn(
          "zoom-media rounded-xl bg-transparent [&>img]:p-[8%]",
          size === "compact" ? "aspect-[16/10]" : "aspect-[4/3]",
        )}
      />
      <div className={cn("flex flex-1 flex-col gap-1.5", size === "compact" ? "px-3 pt-1 pb-3" : "px-3 pt-2 pb-4")}>
        <div className="flex items-start justify-between gap-3">
          <Heading
            className={cn(
              "text-ink text-safe font-semibold transition-transform duration-[var(--duration-base)] group-hover:translate-x-0.5",
              size === "compact" ? "text-body-sm sm:text-body" : "text-body",
            )}
          >
            <Link href={data.href} className={stretched}>
              {data.name}
            </Link>
          </Heading>
          <ArrowUpRight
            aria-hidden="true"
            className="text-ink-subtle group-hover:text-primary mt-0.5 hidden size-4 shrink-0 transition-colors sm:block"
          />
        </div>
        {data.summary && size !== "compact" ? (
          <p className="text-ink-muted line-clamp-2 text-[0.8125rem] leading-relaxed">{data.summary}</p>
        ) : null}
        {data.count ? (
          <p className="text-ink-subtle mt-auto pt-1 text-[0.75rem]">{plural(data.count, "product")}</p>
        ) : null}
      </div>
    </article>
  );
}

/* ---------------------------------------------------------- scene card -- */

const sceneAspect = {
  portrait: "aspect-[4/5]",
  landscape: "aspect-[4/3]",
  wide: "aspect-[16/10]",
  square: "aspect-square",
  tall: "aspect-[3/4] lg:aspect-auto lg:h-full lg:min-h-[28rem]",
} as const;

/**
 * A clinical environment — specialty, solution, application. The picture is
 * the card; the words sit on a navy fade at its foot.
 */
export function SceneCard({
  kind,
  data,
  aspect = "portrait",
  sizes,
  size = "md",
  heading: Heading = "h3",
  cta,
}: {
  kind: VisualKind;
  data: TileData;
  aspect?: keyof typeof sceneAspect;
  sizes: string;
  size?: "md" | "lg";
  heading?: "h2" | "h3";
  cta?: string;
}) {
  return (
    <article
      className={cn(
        "group relative isolate flex flex-col justify-end overflow-hidden rounded-2xl bg-navy-950 text-white shadow-[var(--shadow-card)] transition-[box-shadow,transform] duration-[var(--duration-slow)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]",
        sceneAspect[aspect],
        cardFocus,
      )}
    >
      <RecordImage
        kind={kind}
        name={data.name}
        image={data.image}
        sizes={sizes}
        frameClassName="zoom-media absolute inset-0 -z-10"
      />
      <span
        aria-hidden="true"
        className="from-navy-975/85 via-navy-975/25 absolute inset-0 -z-10 bg-gradient-to-t via-40% to-transparent"
      />
      <div className={cn("flex flex-col gap-2", size === "lg" ? "p-7 sm:p-9" : "p-5 sm:p-6")}>
        {data.eyebrow ? (
          <span className="text-overline tracking-[0.1em] text-white/75 uppercase">
            {data.eyebrow}
          </span>
        ) : null}
        <div className="flex items-end justify-between gap-4">
          <Heading
            className={cn(
              "text-white",
              size === "lg" ? "text-h2" : "text-h4",
            )}
          >
            <Link href={data.href} className={stretched}>
              {data.name}
            </Link>
          </Heading>
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur-md transition-colors duration-[var(--duration-base)] group-hover:border-white group-hover:bg-white group-hover:text-navy-950"
          >
            <ArrowUpRight className="size-4" />
          </span>
        </div>
        {data.summary ? (
          <p
            className={cn(
              "text-body-sm text-white/75",
              size === "lg" ? "max-w-[46ch]" : "line-clamp-2",
            )}
          >
            {data.summary}
          </p>
        ) : null}
        {cta ? (
          <span className="text-body-sm mt-2 inline-flex items-center gap-2 font-semibold">
            {cta}
            <ArrowRight aria-hidden="true" className="arrow-nudge size-4" />
          </span>
        ) : data.count ? (
          <span className="text-caption font-medium text-white/60">
            {plural(data.count, "product")}
          </span>
        ) : null}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------- article -- */

export type ArticleData = {
  title: string;
  href: string;
  excerpt: string | null;
  image: Visual | null;
  date: string | Date | null;
  author: string | null;
  tag?: string | null;
};

export function ArticleCard({
  data,
  variant = "standard",
  sizes,
  heading: Heading = "h3",
  priority,
}: {
  data: ArticleData;
  variant?: "standard" | "featured" | "compact";
  sizes: string;
  heading?: "h2" | "h3";
  priority?: boolean;
}) {
  const date = formatDate(data.date);
  const meta = (
    <p className="text-caption text-ink-subtle flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-primary font-semibold tracking-[0.12em] uppercase">
        {data.tag ?? "Insight"}
      </span>
      {date ? (
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays aria-hidden="true" className="size-3.5" />
          <time dateTime={new Date(data.date as string).toISOString()}>{date}</time>
        </span>
      ) : null}
    </p>
  );

  if (variant === "compact") {
    return (
      <article className={cn("group border-line relative flex gap-5 border-b pb-6 last:border-b-0 last:pb-0", cardFocus)}>
        <RecordImage
          kind="post"
          name={data.title}
          image={data.image}
          sizes="160px"
          frameClassName="zoom-media aspect-[4/3] w-32 shrink-0 rounded-xl sm:w-40"
        />
        <div className="flex min-w-0 flex-col gap-2">
          {meta}
          <Heading className="text-body-lg text-ink group-hover:text-primary leading-snug font-semibold transition-colors">
            <Link href={data.href} className={stretched}>
              {data.title}
            </Link>
          </Heading>
        </div>
      </article>
    );
  }

  const featured = variant === "featured";
  return (
    <article
      className={cn(
        "group border-line bg-surface relative flex h-full flex-col overflow-hidden rounded-2xl border shadow-[var(--shadow-card)] transition-[border-color,box-shadow,transform] duration-[var(--duration-slow)] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-card-hover)]",
        cardFocus,
      )}
    >
      <RecordImage
        kind="post"
        name={data.title}
        image={data.image}
        sizes={sizes}
        priority={priority}
        frameClassName={cn(
          "zoom-media",
          featured ? "aspect-[16/10]" : "aspect-[16/10]",
        )}
      />
      <div className={cn("flex flex-1 flex-col gap-3", featured ? "p-6 sm:p-8" : "p-5 sm:p-6")}>
        {meta}
        <Heading
          className={cn(
            "text-ink group-hover:text-primary transition-colors",
            featured ? "text-h2" : "text-h4",
          )}
        >
          <Link href={data.href} className={stretched}>
            {data.title}
          </Link>
        </Heading>
        {data.excerpt ? (
          <p
            className={cn(
              "text-ink-muted",
              featured ? "text-body max-w-[60ch]" : "text-body-sm line-clamp-3",
            )}
          >
            {data.excerpt}
          </p>
        ) : null}
        <span className="text-body-sm text-primary mt-auto inline-flex items-center gap-2 pt-2 font-semibold">
          Read article
          <ArrowRight aria-hidden="true" className="arrow-nudge size-4" />
        </span>
      </div>
    </article>
  );
}

/* --------------------------------------------------------------- brand -- */

export function BrandCard({
  data,
}: {
  data: { name: string; href: string; image: Visual | null; count?: number | null };
}) {
  return (
    <article
      className={cn(
        "group border-line bg-surface hover:border-line-strong relative flex h-full flex-col items-center justify-center gap-4 rounded-2xl border p-6 text-center transition-[border-color,box-shadow] duration-[var(--duration-base)] hover:shadow-[var(--shadow-card)]",
        cardFocus,
      )}
    >
      {data.image ? (
        <div className="relative h-12 w-full opacity-75 grayscale transition-[filter,opacity] duration-[var(--duration-slow)] group-hover:opacity-100 group-hover:grayscale-0">
          <SmartImage src={data.image.url} alt={data.image.alt || data.name} sizes="200px" fit="contain" />
        </div>
      ) : null}
      <h3 className="text-body-sm text-ink font-semibold">
        <Link href={data.href} className={stretched}>
          {data.name}
        </Link>
      </h3>
      {data.count ? (
        <span className="text-caption text-ink-subtle">{plural(data.count, "product")}</span>
      ) : null}
    </article>
  );
}

/* --------------------------------------------------------- small parts -- */

/** A pill link — applications, related taxonomy. */
export function PillLink({
  href,
  children,
  count,
}: {
  href: string;
  children: ReactNode;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className="border-line bg-surface hover:border-primary hover:text-primary text-body-sm text-ink inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 transition-colors"
    >
      {children}
      {count ? (
        <span className="bg-surface-muted text-ink-muted rounded-full px-2 py-0.5 text-[0.75rem] font-medium tabular-nums">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
