import { CheckCircle2 } from "lucide-react";

import { Container, SectionHeader } from "@/components/ui";
import { SmartImage } from "@/components/site/media";
import { cn } from "@/lib/utils/cn";
import { SCENES } from "@/lib/visuals";
import {
  AccentHeading,
  Actions,
  isDark,
  row,
  rows,
  stagger,
  text,
  type RendererProps,
} from "./shared";

/** A hero is cinematic when the editor chose the full-width layout. */
export const isCinematicHero = ({ design }: RendererProps) =>
  design.layout === "full";

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
              <span className="live-dot size-2 rounded-full bg-cyan-400" />
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
          title={text(content, "heading")}
          description={text(content, "subheading") || undefined}
          align={centered ? "center" : "left"}
          as="h1"
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
