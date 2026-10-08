import Link from "next/link";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";

import { Container, SectionHeader } from "@/components/ui";
import { SmartImage } from "@/components/site/media";
import { ParallaxStage } from "@/components/site/parallax-stage";
import { cn } from "@/lib/utils/cn";
import { HERO_OBJECT, SCENES } from "@/lib/visuals";
import {
  AccentHeading,
  Actions,
  isDark,
  MixedWeight,
  row,
  rows,
  stagger,
  text,
  type RendererProps,
} from "./shared";

/** A hero is cinematic when the editor chose the full-width layout. */
export const isCinematicHero = ({ design }: RendererProps) =>
  design.layout === "full";

/** The showcase hero is the editorial layout. */
export const isShowcaseHero = ({ design }: RendererProps) =>
  design.layout === "editorial";

/**
 * The full-bleed hero: a photograph under a navy wash, a technical grid, a
 * slow ambient light, and the type on top. It renders its own <section>
 * (rather than inside the shared Section) because it owns its whole box —
 * and, as the first thing on a page, it slides under the transparent header.
 */
export function CinematicHero({ content, media, first }: RendererProps) {
  const image = media.image ?? SCENES.hero;
  const points = rows(content, "points").filter((item) => row(item, "title"));
  const heading = text(content, "heading");
  const note = text(content, "note");
  const overline = text(content, "overline");

  return (
    <section
      className={cn(
        "relative isolate flex min-h-[clamp(38rem,94svh,60rem)] flex-col overflow-hidden bg-navy-975 text-white",
        first && "hero-overlay",
      )}
    >
      <div className="media-frame settle absolute inset-0 -z-30 bg-navy-950">
        <SmartImage
          src={image.url}
          alt={image.alt}
          sizes="100vw"
          priority
          quality={80}
          className="object-[70%_center]"
        />
      </div>
      {/* Wash: strong under the type, open over the equipment. */}
      <div
        aria-hidden="true"
        className="from-navy-975 via-navy-975/85 absolute inset-0 -z-20 bg-gradient-to-r via-40% to-navy-975/20 max-lg:via-navy-975/80"
      />
      <div
        aria-hidden="true"
        className="from-navy-975 absolute inset-x-0 bottom-0 -z-20 h-2/5 bg-gradient-to-t to-transparent"
      />
      {/* Technical grid, faded towards the image. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(155_178_207/0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgb(155_178_207/0.08)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_right,black_0%,black_35%,transparent_75%)]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 -left-40 -z-10 size-[38rem] rounded-full bg-[radial-gradient(circle,rgb(31_102_220/0.35),transparent_65%)] ambient" />
      <div aria-hidden="true" className="pointer-events-none absolute right-[10%] bottom-[-10rem] -z-10 size-[30rem] rounded-full bg-[radial-gradient(circle,rgb(47_189_214/0.18),transparent_65%)] ambient [animation-delay:-9s]" />

      <Container width="wide" className="flex flex-1 flex-col justify-center py-16 sm:py-20 lg:py-24">
        <div className="flex max-w-[44rem] flex-col gap-7">
          {overline ? (
            <p
              className="intro text-overline inline-flex w-fit items-center gap-3 rounded-full border border-white/15 bg-white/[0.06] py-1.5 pr-4 pl-2 tracking-[0.14em] text-cyan-100 uppercase backdrop-blur-md"
              style={stagger(0)}
            >
              <span className="size-1.5 rounded-full bg-cyan-400" />
              {overline}
            </p>
          ) : null}
          <h1
            className="intro text-hero text-safe max-w-[18ch] text-white"
            style={stagger(1)}
          >
            <AccentHeading value={heading} dark breakLine />
          </h1>
          {text(content, "subheading") ? (
            <p
              className="intro text-lead max-w-[50ch] text-white/75"
              style={stagger(2)}
            >
              {text(content, "subheading")}
            </p>
          ) : null}
          <div className="intro" style={stagger(3)}>
            <Actions
              primaryLabel={text(content, "primaryLabel")}
              primaryHref={text(content, "primaryHref")}
              secondaryLabel={text(content, "secondaryLabel")}
              secondaryHref={text(content, "secondaryHref")}
              dark
            />
          </div>
          {note ? (
            <p
              className="intro text-body-sm inline-flex items-start gap-2.5 text-white/65"
              style={stagger(4)}
            >
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-teal-400" />
              {note}
            </p>
          ) : null}
        </div>
      </Container>

      {points.length > 0 ? (
        <div className="intro-fade border-t border-white/10 bg-navy-975/40 backdrop-blur-md [animation-delay:600ms]">
          <Container width="wide">
            <ul
              className={cn(
                "grid grid-cols-1 divide-white/10 sm:grid-cols-2 sm:divide-x-0",
                points.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
                "lg:divide-x",
              )}
            >
              {points.map((item, index) => (
                <li
                  key={index}
                  className="flex items-start gap-4 border-white/10 py-5 max-sm:border-b max-sm:last:border-b-0 sm:py-6 lg:px-6 lg:first:pl-0"
                >
                  <span className="font-display text-body-sm pt-0.5 font-semibold text-cyan-300 tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-body-sm font-semibold text-white">
                      {row(item, "title")}
                    </span>
                    {row(item, "detail") ? (
                      <span className="text-caption text-white/60">
                        {row(item, "detail")}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </Container>
        </div>
      ) : null}
    </section>
  );
}

/**
 * The editorial hero: type beside a framed picture, on whatever background the
 * editor chose. The shape existing heroes keep.
 */
export function Hero({ content, design, media }: RendererProps) {
  const image = media.image;
  const centered = design.align === "center";
  const dark = isDark(design);

  return (
    <div
      className={cn(
        "grid items-center gap-12 lg:gap-16",
        image && !centered ? "lg:grid-cols-[1.05fr_1fr]" : "",
      )}
    >
      <div className={cn("flex flex-col gap-8", centered && "items-center text-center")}>
        <SectionHeader
          overline={text(content, "overline") || undefined}
          title={<AccentHeading value={text(content, "heading")} />}
          description={text(content, "subheading") || undefined}
          align={centered ? "center" : "left"}
          as="h1"
          size={image ? "section" : "page"}
          className="intro"
        />
        <div className="intro" style={stagger(2)}>
          <Actions
            primaryLabel={text(content, "primaryLabel")}
            primaryHref={text(content, "primaryHref")}
            secondaryLabel={text(content, "secondaryLabel")}
            secondaryHref={text(content, "secondaryHref")}
            align={design.align}
            dark={dark}
          />
        </div>
        {text(content, "note") ? (
          <p className="text-body-sm text-ink-muted inline-flex items-start gap-2.5">
            <CheckCircle2 aria-hidden="true" className="text-teal-500 mt-0.5 size-4 shrink-0" />
            {text(content, "note")}
          </p>
        ) : null}
      </div>

      {image ? (
        <div className="relative">
          <div
            aria-hidden="true"
            className="surface-grid absolute -inset-4 -z-10 rounded-[2rem] opacity-80 sm:-inset-6"
          />
          <div className="media-frame intro border-line aspect-[5/4] rounded-3xl border shadow-[var(--shadow-float)]" style={stagger(1)}>
            <SmartImage
              src={image.url}
              alt={image.alt}
              sizes="(min-width: 1024px) 50vw, 100vw"
              priority
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** "500+" → ["500", "+"]: the figure, then a unit set lighter beside it. */
function splitFigure(value: string): [string, string] {
  const match = /^([^\d]*[\d.,]+)(.*)$/.exec(value.trim());
  return match ? [match[1], match[2]] : [value, ""];
}

/**
 * The showcase hero: an editorial headline over a soft grey stage that holds
 * one piece of equipment like an object in a studio, with small product cards
 * floating beside it and a single figure underneath.
 *
 * The stage is two overlapping rounded panels — a lower, shorter one on the
 * left and a taller one on the right — so the equipment can break out of the
 * frame without the composition looking boxed in.
 */
export function ShowcaseHero({ content, media, mediaById }: RendererProps) {
  const object = media.image ?? HERO_OBJECT;
  const heading = text(content, "heading");
  const subheading = text(content, "subheading");
  const statValue = text(content, "statValue");
  const statLabel = text(content, "statLabel");
  const statDetail = text(content, "statDetail");
  const cards = rows(content, "points")
    .filter((item) => row(item, "title"))
    .slice(0, 3)
    .map((item) => ({
      title: row(item, "title"),
      detail: row(item, "detail"),
      href: row(item, "href"),
      image: mediaById[row(item, "image")] ?? null,
    }));
  const [figure, unit] = splitFigure(statValue);
  const lines = heading.split(/\n| \/ /).length;

  const stat = statValue ? (
    <div className="flex flex-col gap-1.5">
      <p className="font-display text-ink text-[clamp(3rem,2.2rem+2.6vw,4.75rem)] leading-none font-light tracking-[-0.05em]">
        {figure}
        {unit ? <span className="text-steel-400 font-light">{unit}</span> : null}
      </p>
      {statLabel ? <p className="text-ink-muted text-[0.75rem] tracking-[0.02em]">{statLabel}</p> : null}
      {statDetail ? (
        <p className="text-ink-muted mt-3 max-w-[28ch] text-[0.8125rem] leading-relaxed">{statDetail}</p>
      ) : null}
    </div>
  ) : null;

  return (
    <div className="relative">
      {/* Headline row. */}
      <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
        <div className="flex flex-col gap-6 lg:col-span-8">
          {text(content, "overline") ? (
            <p className="eyebrow intro" style={stagger(0)}>
              {text(content, "overline")}
            </p>
          ) : null}
          <h1 className="text-hero headline-mix text-ink text-safe max-w-[15ch]">
            {heading.includes("**") ? (
              heading.split(/\n| \/ /).map((line, index) => (
                <span key={index} className="intro block" style={stagger(1 + index)}>
                  <MixedWeight value={line} />
                </span>
              ))
            ) : (
              <span className="intro block" style={stagger(1)}>
                {heading}
              </span>
            )}
          </h1>
          <div className="intro pt-1" style={stagger(lines + 2)}>
            <Actions
              primaryLabel={text(content, "primaryLabel")}
              primaryHref={text(content, "primaryHref")}
              secondaryLabel={text(content, "secondaryLabel")}
              secondaryHref={text(content, "secondaryHref")}
              size="md"
            />
          </div>
        </div>
        {subheading ? (
          <p
            className="intro text-body-sm text-ink-muted max-w-[42ch] lg:col-span-4 lg:pt-[clamp(3rem,2rem+3vw,6rem)]"
            style={stagger(lines + 1)}
          >
            {subheading}
          </p>
        ) : null}
      </div>

      {/* Stage: one soft environmental surface, the equipment breaking out
          of it, a floor shadow, the figure in the white space and the cards
          floating at the edge. Each layer drifts at its own depth with the
          pointer on desktop. */}
      <ParallaxStage className="mt-10 lg:mt-2 lg:aspect-[2.15/1]">
        <div
          aria-hidden="true"
          className="parallax-layer stage-surface absolute inset-0 top-[12%] left-[15%] rounded-[1.75rem] [--depth:0.25] max-lg:hidden"
        />
        <div className="relative aspect-[5/4] sm:aspect-[16/11] lg:absolute lg:inset-0 lg:aspect-auto">
          <div aria-hidden="true" className="stage-surface absolute inset-0 rounded-2xl lg:hidden" />
          <div
            aria-hidden="true"
            className="parallax-layer absolute bottom-[6%] left-[18%] h-[9%] w-[64%] rounded-[50%] bg-[radial-gradient(closest-side,rgb(11_13_15/0.16),transparent)] blur-md [--depth:0.5] lg:bottom-[3%] lg:left-[16%] lg:w-[54%]"
          />
          <div
            className="parallax-layer absolute inset-x-[5%] top-[4%] bottom-[5%] [--depth:1] lg:top-[-10%] lg:right-auto lg:bottom-[2%] lg:left-[10%] lg:w-[64%]"
          >
            <div className="intro-scale relative h-full w-full" style={stagger(lines + 3)}>
              <SmartImage
                src={object.url}
                alt={object.alt}
                sizes="(min-width: 1024px) 64vw, 100vw"
                fit="contain"
                priority
                quality={80}
              />
            </div>
          </div>
        </div>

        {stat ? (
          <div className="intro mt-8 lg:absolute lg:bottom-0 lg:left-0 lg:mt-0 lg:w-[15%]" style={stagger(lines + 4)}>
            {stat}
          </div>
        ) : null}

        {cards.length > 0 ? (
          <ul className="parallax-layer scrollbar-none -mx-[var(--gutter)] mt-6 flex snap-x gap-2.5 overflow-x-auto px-[var(--gutter)] pb-1 [--depth:-0.6] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:absolute lg:top-[20%] lg:right-[2.5%] lg:mt-0 lg:flex lg:w-[18.5%] lg:flex-col">
            {cards.map((card, index) => (
              <li
                key={card.title}
                className="intro w-[14rem] shrink-0 snap-start sm:w-auto"
                style={stagger(lines + 5 + index)}
              >
                <FloatingCard {...card} />
              </li>
            ))}
          </ul>
        ) : null}
      </ParallaxStage>
    </div>
  );
}

function FloatingCard({
  title,
  detail,
  href,
  image,
}: {
  title: string;
  detail: string;
  href: string;
  image: { url: string; alt: string } | null;
}) {
  const body = (
    <>
      {image ? (
        <span className="relative size-11 shrink-0">
          <SmartImage src={image.url} alt="" sizes="44px" fit="contain" />
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-ink truncate text-[0.8125rem] leading-tight font-semibold">{title}</span>
        {detail ? <span className="text-ink-subtle line-clamp-2 text-[0.75rem] leading-snug">{detail}</span> : null}
      </span>
      {href ? (
        <ArrowUpRight aria-hidden="true" className="text-ink-subtle group-hover:text-primary size-3.5 shrink-0 transition-colors" />
      ) : null}
    </>
  );
  const className =
    "group flex items-center gap-2.5 rounded-xl bg-white/90 p-2 pr-3 shadow-[0_1px_2px_rgb(11_13_15/0.05),0_10px_24px_-18px_rgb(11_13_15/0.35)] backdrop-blur-sm transition-transform duration-[var(--duration-base)] hover:-translate-y-0.5";
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
