import type { CSSProperties } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Check,
  CheckCircle2,
  Download,
  FileText,
  Lock,
  Quote,
} from "lucide-react";

import { Accordion, buttonStyles, SectionHeader } from "@/components/ui";
import { AnimatedNumber } from "@/components/site/animated-number";
import { ArrowLink } from "@/components/site/cards";
import { SmartImage } from "@/components/site/media";
import { EnquiryForm } from "@/components/site/enquiry-form";
import { BuiltForm } from "@/components/site/built-form";
import { CtaButton } from "@/components/site/cta/cta-button";
import { RichText } from "@/cms/rich-text";
import { parseVideoUrl } from "@/cms/video";
import { featureIcon } from "@/lib/design/icons";
import { cn } from "@/lib/utils/cn";
import { submitFormAction } from "@/server/forms/submit";
import { submitEnquiryAction } from "@/server/leads/actions";
import { faqPageJsonLd } from "@/server/seo/structured-data";
import { JsonLd } from "@/components/seo/json-ld";
import {
  GalleryGrid,
  TabbedPanels,
  VideoFacade,
} from "@/cms/sections/client-sections";
import {
  AccentHeading,
  Actions,
  ctaRequestFor,
  gridCols,
  Intro,
  isDark,
  row,
  rows,
  Stack,
  text,
  type RendererProps,
} from "./shared";

/* ------------------------------------------------------- heading & text -- */

export function HeadingText({ content, design }: RendererProps) {
  const heading = text(content, "heading");
  const body = text(content, "body");
  const overline = text(content, "overline");

  if (design.layout === "split" || design.layout === "editorial") {
    return (
      <div className="reveal grid gap-8 lg:grid-cols-12 lg:gap-16">
        <div className="flex flex-col gap-5 lg:col-span-6">
          {overline ? <span className="eyebrow">{overline}</span> : null}
          <h2 className="text-section text-ink text-safe">
            <AccentHeading value={heading} dark={isDark(design)} />
          </h2>
        </div>
        {body ? (
          <p className="text-lead text-ink-muted self-end lg:col-span-5 lg:col-start-8">
            {body}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <SectionHeader
      overline={overline || undefined}
      title={<AccentHeading value={heading} />}
      description={body || undefined}
      align={design.align === "center" ? "center" : "left"}
      className="reveal"
    />
  );
}

export function RichTextSection({ content }: RendererProps) {
  const heading = text(content, "heading");
  return (
    <div className="flex flex-col gap-6">
      {heading ? <h2 className="text-h2 text-ink"><AccentHeading value={heading} /></h2> : null}
      <RichText value={text(content, "body")} className="prose-hn max-w-[70ch]" />
    </div>
  );
}

/* ------------------------------------------------------ image and text -- */

export function ImageText({ content, design, media }: RendererProps) {
  const imageFirst = design.imagePosition !== "right";
  const editorial = design.layout === "editorial";
  const points = rows(content, "points").filter((item) => row(item, "title"));
  const dark = isDark(design);

  return (
    <div
      className={cn(
        "grid items-center gap-10 lg:gap-16",
        editorial ? "lg:grid-cols-[1.15fr_1fr]" : "lg:grid-cols-2",
      )}
    >
      {media.image ? (
        <div className={cn("reveal relative", imageFirst ? "lg:order-1" : "lg:order-2")}>
          <div
            className={cn(
              "media-frame border-line rounded-3xl border shadow-[var(--shadow-float)]",
              editorial ? "aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5]" : "aspect-[4/3]",
            )}
          >
            <SmartImage
              src={media.image.url}
              alt={media.image.alt}
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </div>
          {editorial ? (
            <div
              aria-hidden="true"
              className={cn(
                "surface-grid absolute -bottom-6 -z-10 hidden h-2/3 w-2/3 rounded-3xl lg:block",
                imageFirst ? "-left-6" : "-right-6",
              )}
            />
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "reveal flex flex-col gap-6",
          imageFirst ? "lg:order-2" : "lg:order-1",
        )}
      >
        {text(content, "overline") ? (
          <span className="eyebrow">{text(content, "overline")}</span>
        ) : null}
        <h2 className="text-section text-ink text-safe">
          <AccentHeading value={text(content, "heading")} dark={dark} />
        </h2>
        <RichText value={text(content, "body")} className="text-body-lg text-ink-muted" />
        {points.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {points.map((item, index) => (
              <li key={index} className="text-body-sm text-ink flex items-start gap-3">
                <span className="bg-primary-subtle text-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
                  <Check aria-hidden="true" className="size-3" />
                </span>
                {row(item, "title")}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="pt-2">
          <Actions
            primaryLabel={text(content, "ctaLabel")}
            primaryHref={text(content, "ctaHref")}
            secondaryLabel=""
            secondaryHref=""
            dark={dark}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- statistics -- */

export function Statistics({ content, design }: RendererProps) {
  const items = rows(content, "items");
  if (items.length === 0) return null;
  const dark = isDark(design);
  const note = text(content, "note");

  return (
    <Stack>
      {text(content, "heading") || text(content, "intro") ? (
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="reveal flex flex-col gap-5 lg:col-span-7">
            {text(content, "overline") ? (
              <span className="eyebrow">{text(content, "overline")}</span>
            ) : null}
            {text(content, "heading") ? (
              <h2 className="text-section text-ink">
                <AccentHeading value={text(content, "heading")} dark={dark} />
              </h2>
            ) : null}
          </div>
          {text(content, "intro") ? (
            <p className="reveal text-lead text-ink-muted lg:col-span-4 lg:col-start-9">
              {text(content, "intro")}
            </p>
          ) : null}
        </div>
      ) : null}

      <dl
        className={cn(
          "reveal-stagger grid grid-cols-2 gap-px overflow-hidden rounded-2xl border",
          gridCols(design.columns, "4"),
          dark ? "border-white/10 bg-white/10" : "border-line bg-line",
        )}
      >
        {items.map((item, index) => (
          <div
            key={index}
            className={cn(
              "relative flex min-w-0 flex-col gap-2 p-5 sm:gap-3 sm:p-8 lg:p-10",
              dark ? "bg-navy-975" : "bg-surface",
            )}
          >
            <span
              aria-hidden="true"
              className="absolute top-0 left-5 h-px w-10 bg-gradient-to-r from-cyan-400 to-transparent sm:left-8 lg:left-10"
            />
            <dt className="text-body-sm text-ink order-2 font-semibold">
              {String(item.label ?? "")}
            </dt>
            <dd
              className={cn(
                "font-display text-ink order-1 leading-none font-semibold whitespace-nowrap",
                /\d/.test(String(item.value ?? ""))
                  ? "text-[clamp(2rem,1.4rem+2.6vw,3.75rem)] tracking-[-0.04em]"
                  : "text-[clamp(1.25rem,0.95rem+1.5vw,2.5rem)] tracking-[-0.03em]",
              )}
            >
              <AnimatedNumber value={String(item.value ?? "")} />
            </dd>
            {row(item, "detail") ? (
              <dd className="text-caption text-ink-muted order-3">{row(item, "detail")}</dd>
            ) : null}
          </div>
        ))}
      </dl>

      {note ? <p className="text-caption text-ink-subtle -mt-4 lg:-mt-6">{note}</p> : null}
    </Stack>
  );
}

/* ------------------------------------------------------- feature cards -- */

function FeatureMarker({ icon, index, dark }: { icon: string; index: number; dark: boolean }) {
  const Icon = featureIcon(icon);
  return (
    <span
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-xl border",
        dark
          ? "border-white/15 bg-white/[0.06] text-cyan-300"
          : "border-medical-100 bg-primary-subtle text-primary",
      )}
    >
      {Icon ? (
        <Icon aria-hidden="true" className="size-5" />
      ) : (
        <span className="font-display text-body-sm font-semibold tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
      )}
    </span>
  );
}

export function IconCards({ content, design, media }: RendererProps) {
  const items = rows(content, "items");
  const dark = isDark(design);

  if (design.layout === "split" || design.layout === "editorial") {
    const imageRight = design.imagePosition === "right";
    return (
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div
          className={cn(
            "flex flex-col gap-8 lg:sticky lg:top-28 lg:col-span-5 lg:self-start",
            imageRight && "lg:order-2 lg:col-start-8",
          )}
        >
          <div className="reveal flex flex-col gap-5">
            {text(content, "overline") ? (
              <span className="eyebrow">{text(content, "overline")}</span>
            ) : null}
            {text(content, "heading") ? (
              <h2 className="text-section text-ink text-safe">
                <AccentHeading value={text(content, "heading")} dark={dark} />
              </h2>
            ) : null}
            {text(content, "intro") ? (
              <p className="text-lead text-ink-muted">{text(content, "intro")}</p>
            ) : null}
          </div>
          {media.image ? (
            <div className="reveal media-frame border-line aspect-[4/3] rounded-3xl border shadow-[var(--shadow-float)]">
              <SmartImage
                src={media.image.url}
                alt={media.image.alt}
                sizes="(min-width: 1024px) 40vw, 100vw"
              />
            </div>
          ) : null}
          <Actions
            primaryLabel={text(content, "ctaLabel")}
            primaryHref={text(content, "ctaHref")}
            secondaryLabel=""
            secondaryHref=""
            dark={dark}
          />
        </div>

        <ol
          className={cn(
            "reveal-stagger flex flex-col lg:col-span-6",
            imageRight ? "lg:order-1" : "lg:col-start-7",
          )}
        >
          {items.map((item, index) => (
            <li
              key={index}
              className={cn(
                "flex gap-5 border-t py-8 first:border-t-0 first:pt-0 sm:gap-7",
                dark ? "border-white/10" : "border-line",
              )}
            >
              <FeatureMarker icon={row(item, "icon")} index={index} dark={dark} />
              <div className="flex min-w-0 flex-col gap-2">
                <h3 className="text-h3 text-ink">{row(item, "title")}</h3>
                {row(item, "body") ? (
                  <p className="text-body text-ink-muted">{row(item, "body")}</p>
                ) : null}
                {row(item, "linkHref") && row(item, "linkLabel") ? (
                  <ArrowLink href={row(item, "linkHref")} tone={dark ? "inverse" : "primary"} className="mt-1 w-fit">
                    {row(item, "linkLabel")}
                  </ArrowLink>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const style = design.cardStyle ?? "standard";
  return (
    <Stack>
      <Intro content={content} design={design} />
      <ul className={cn("reveal-stagger grid grid-cols-1 gap-5 lg:gap-6", gridCols(design.columns))}>
        {items.map((item, index) => (
          <li
            key={index}
            className={cn(
              "flex flex-col gap-5 rounded-2xl p-7 sm:p-8",
              style === "minimal"
                ? ""
                : dark
                  ? "border border-white/10 bg-white/[0.03]"
                  : cn(
                      "border-line bg-surface border",
                      style === "elevated" && "shadow-[var(--shadow-card)]",
                      style === "bordered" && "border-line-strong",
                    ),
            )}
          >
            <FeatureMarker icon={row(item, "icon")} index={index} dark={dark} />
            <div className="flex flex-col gap-2">
              <h3 className="text-h4 text-ink">{row(item, "title")}</h3>
              {row(item, "body") ? (
                <p className="text-body-sm text-ink-muted">{row(item, "body")}</p>
              ) : null}
            </div>
            {row(item, "linkHref") && row(item, "linkLabel") ? (
              <ArrowLink href={row(item, "linkHref")} tone={dark ? "inverse" : "primary"} className="mt-auto w-fit">
                {row(item, "linkLabel")}
              </ArrowLink>
            ) : null}
          </li>
        ))}
      </ul>
    </Stack>
  );
}

/* ----------------------------------------------------------------- FAQ -- */

export function Faq({ content, design }: RendererProps) {
  const items = rows(content, "items");
  if (items.length === 0) return null;

  const jsonLd = (
    <JsonLd
      data={faqPageJsonLd(
        items.map((item) => ({
          question: String(item.question ?? ""),
          answer: String(item.answer ?? ""),
        })),
      )}
    />
  );
  const accordion = (
    <Accordion
      items={items.map((item, index) => ({
        id: String(index),
        question: String(item.question ?? ""),
        answer: <RichText value={String(item.answer ?? "")} />,
      }))}
    />
  );

  if (design.layout === "split") {
    return (
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        {jsonLd}
        <div className="reveal flex flex-col gap-5 lg:sticky lg:top-28 lg:col-span-4 lg:self-start">
          {text(content, "overline") ? (
            <span className="eyebrow">{text(content, "overline")}</span>
          ) : null}
          <h2 className="text-section text-ink">{text(content, "heading") || "Questions"}</h2>
          {text(content, "intro") ? (
            <p className="text-body-lg text-ink-muted">{text(content, "intro")}</p>
          ) : null}
          <ArrowLink href="/contact" className="mt-2 w-fit">
            Ask our team a question
          </ArrowLink>
        </div>
        <div className="lg:col-span-8">{accordion}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {jsonLd}
      {text(content, "heading") || text(content, "intro") ? (
        <SectionHeader
          overline={text(content, "overline") || undefined}
          title={<AccentHeading value={text(content, "heading")} />}
          description={text(content, "intro") || undefined}
          size="compact"
          align={design.align === "center" ? "center" : "left"}
        />
      ) : null}
      {accordion}
    </div>
  );
}

/* ----------------------------------------------------------------- CTA -- */

/* How far a full-bleed backdrop reaches past the content: exactly the
   section's own padding, whichever rhythm the editor chose. */
const BLEED: Record<string, string> = {
  compact: "inset-y-[calc(var(--section-space-compact)*-1)]",
  normal: "inset-y-[calc(var(--section-space-normal)*-1)]",
  large: "inset-y-[calc(var(--section-space-large)*-1)]",
  xl: "inset-y-[calc(var(--section-space-xl)*-1)]",
};

export function CallToAction({ content, design, media, entities }: RendererProps) {
  const centered = design.align !== "left";
  const dark = isDark(design);
  const heading = text(content, "heading");
  const body = text(content, "body");

  const inner = (inverse: boolean) => (
    <div
      className={cn(
        "relative flex flex-col gap-8",
        centered ? "items-center text-center" : "lg:flex-row lg:items-end lg:justify-between lg:gap-16",
      )}
    >
      <div className={cn("flex flex-col gap-5", centered ? "items-center" : "max-w-[44rem]")}>
        {text(content, "overline") ? (
          <span className={cn("eyebrow", inverse && "[--color-eyebrow:var(--color-cyan-300)]")}>
            {text(content, "overline")}
          </span>
        ) : null}
        <h2 className={cn("text-section text-safe max-w-[22ch]", inverse ? "text-white" : "text-ink")}>
          <AccentHeading value={heading} dark={inverse} />
        </h2>
        {body ? (
          <p className={cn("text-lead max-w-[56ch]", inverse ? "text-white/75" : "text-ink-muted")}>
            {body}
          </p>
        ) : null}
      </div>
      <div className="shrink-0">
        <Actions
          primaryLabel={text(content, "primaryLabel")}
          primaryHref={text(content, "primaryHref")}
          secondaryLabel={text(content, "secondaryLabel")}
          secondaryHref={text(content, "secondaryHref")}
          primaryRequest={ctaRequestFor(content, entities, "primary")}
          secondaryRequest={ctaRequestFor(content, entities, "secondary")}
          align={centered ? "center" : "left"}
          dark={inverse}
        />
      </div>
    </div>
  );

  const backdrop = media.image ? (
    <>
      <div className="media-frame absolute inset-0 -z-10 bg-transparent">
        <SmartImage src={media.image.url} alt="" sizes="100vw" className="opacity-50" />
      </div>
      <div
        aria-hidden="true"
        className="from-navy-975 via-navy-975/85 to-navy-975/30 absolute inset-0 -z-10 bg-gradient-to-r"
      />
    </>
  ) : null;

  if (dark) {
    // A full-width band: the section itself is the navy surface.
    return (
      <div className="reveal relative isolate py-4">
        {media.image ? (
          <div aria-hidden="true" className={cn("absolute left-1/2 -z-10 w-screen -translate-x-1/2 overflow-hidden", BLEED[design.spacing] ?? BLEED.normal)}>
            {backdrop}
          </div>
        ) : null}
        {inner(true)}
      </div>
    );
  }

  // On a light page: a framed navy panel.
  return (
    <div className="reveal surface-dark surface-navy gradient-border relative isolate overflow-hidden rounded-3xl px-6 py-14 shadow-[var(--shadow-float)] sm:px-12 sm:py-16 lg:px-16 lg:py-20">
      {backdrop}
      {inner(true)}
    </div>
  );
}

/* --------------------------------------------------------- process etc -- */

export function ProcessSteps({ content, design }: RendererProps) {
  const items = rows(content, "items");
  if (items.length === 0) return null;
  const dark = isDark(design);
  const count = Math.min(items.length, 6);

  return (
    <Stack>
      <Intro content={content} design={design} />
      {/* Typography and a single rule rather than icons: a track across the
          top on desktop that draws itself in as it scrolls into view, a
          vertical line down the left on phones. */}
      <div className="relative">
        <span aria-hidden="true" className={cn("absolute inset-x-0 top-[7px] hidden h-px lg:block", dark ? "bg-white/15" : "bg-line")} />
        <span aria-hidden="true" className="draw-line absolute inset-x-0 top-[7px] hidden h-px bg-cyan-500 lg:block" />
        <ol
          className="reveal-stagger grid grid-cols-1 gap-0 md:grid-cols-2 md:gap-x-10 md:gap-y-12 lg:grid-cols-[repeat(var(--steps),minmax(0,1fr))] lg:gap-x-8"
          style={{ ["--steps" as string]: String(count) } as CSSProperties}
        >
          {items.map((item, index) => (
            <li key={index} className="relative pb-10 pl-9 last:pb-0 md:pb-0 lg:pt-10 lg:pl-0">
              {index < items.length - 1 ? (
                <span aria-hidden="true" className={cn("absolute top-5 bottom-0 left-[7px] w-px md:hidden", dark ? "bg-white/15" : "bg-line")} />
              ) : null}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-0 left-0 size-[15px] rounded-full border-2 border-cyan-500",
                  dark ? "bg-navy-975" : "bg-white",
                )}
              />
              <span className="font-display text-ink-subtle block text-[2.25rem] leading-none font-light tracking-[-0.04em] tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-h4 text-ink mt-4">{row(item, "title")}</h3>
              {row(item, "body") ? (
                <p className="text-body-sm text-ink-muted mt-2 max-w-[34ch]">{row(item, "body")}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </Stack>
  );
}

export function Timeline({ content, design }: RendererProps) {
  const items = rows(content, "items");
  if (items.length === 0) return null;

  return (
    <Stack>
      <Intro content={content} design={design} />
      <ol className="border-line-strong relative flex flex-col gap-10 border-l pl-8">
        {items.map((item, index) => (
          <li key={index} className="reveal relative flex flex-col gap-1.5">
            <span
              aria-hidden="true"
              className="bg-primary absolute top-1.5 -left-[2.3rem] size-3 rounded-full ring-4 ring-[var(--color-pearl-100)]"
            />
            <span className="text-caption text-primary font-semibold tracking-[0.12em] uppercase">
              {row(item, "when")}
            </span>
            <h3 className="text-h4 text-ink">{row(item, "title")}</h3>
            {row(item, "body") ? (
              <p className="text-body-sm text-ink-muted">{row(item, "body")}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </Stack>
  );
}

export function Testimonials({ content, design }: RendererProps) {
  const items = rows(content, "items");
  if (items.length === 0) return null;
  const dark = isDark(design);

  return (
    <Stack>
      <Intro content={content} design={design} />
      <ul className={cn("reveal-stagger grid grid-cols-1 gap-6", gridCols(design.columns))}>
        {items.map((item, index) => (
          <li
            key={index}
            className={cn(
              "flex h-full flex-col gap-6 rounded-2xl border p-8",
              dark ? "border-white/10 bg-white/[0.03]" : "border-line bg-surface shadow-[var(--shadow-card)]",
            )}
          >
            <figure className="flex h-full flex-col gap-6">
              <Quote aria-hidden="true" className="text-accent size-8 shrink-0" />
              <blockquote className="text-body-lg text-ink flex-1">{row(item, "quote")}</blockquote>
              {row(item, "name") || row(item, "role") ? (
                <figcaption className="border-line flex flex-col border-t pt-5">
                  {row(item, "name") ? (
                    <span className="text-body-sm text-ink font-semibold">{row(item, "name")}</span>
                  ) : null}
                  {row(item, "role") ? (
                    <span className="text-caption text-ink-muted">{row(item, "role")}</span>
                  ) : null}
                </figcaption>
              ) : null}
            </figure>
          </li>
        ))}
      </ul>
    </Stack>
  );
}

export function Certifications({ content, design, mediaById }: RendererProps) {
  const items = rows(content, "items");
  if (items.length === 0) return null;

  return (
    <Stack>
      <Intro content={content} design={design} />
      <ul className={cn("grid grid-cols-1 gap-4", gridCols(design.columns, "4"))}>
        {items.map((item, index) => {
          const image = mediaById[row(item, "image")];
          return (
            <li key={index} className="border-line bg-surface flex items-start gap-4 rounded-2xl border p-5">
              {image ? (
                <span className="relative size-12 shrink-0">
                  <SmartImage src={image.url} alt={image.alt} sizes="48px" fit="contain" />
                </span>
              ) : (
                <BadgeCheck aria-hidden="true" className="text-primary size-6 shrink-0" />
              )}
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-body-sm text-ink font-semibold">{row(item, "name")}</span>
                {row(item, "detail") ? (
                  <span className="text-caption text-ink-muted">{row(item, "detail")}</span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Stack>
  );
}

export function AccordionSection({ content, design }: RendererProps) {
  const items = rows(content, "items");
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-8">
      <Intro content={content} design={design} />
      <Accordion
        items={items.map((item, index) => ({
          id: String(index),
          question: row(item, "title"),
          answer: <RichText value={row(item, "body")} />,
        }))}
      />
    </div>
  );
}

export function TabsSection({ content, design }: RendererProps) {
  const items = rows(content, "items");
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-8">
      <Intro content={content} design={design} />
      <TabbedPanels
        items={items.map((item) => ({
          label: row(item, "label"),
          // Rendered here rather than in the client component: rich text is
          // markup the server already knows how to produce, and a render
          // function cannot cross that boundary.
          content: <RichText value={row(item, "body")} className="prose-hn max-w-[70ch]" />,
        }))}
      />
    </div>
  );
}

export function Gallery({ content, design, mediaById }: RendererProps) {
  const items = rows(content, "items").flatMap((item) => {
    const media = mediaById[row(item, "image")];
    return media ? [{ media, caption: row(item, "caption") }] : [];
  });
  if (items.length === 0) return null;
  return (
    <Stack>
      <Intro content={content} design={design} />
      <GalleryGrid items={items} columns={design.columns ?? "3"} />
    </Stack>
  );
}

export function Video({ content, design, media }: RendererProps) {
  const url = text(content, "url");
  const embed = parseVideoUrl(url);
  const heading = text(content, "heading");
  return (
    <div className="flex flex-col gap-8">
      <Intro content={content} design={design} />
      {embed ? (
        <VideoFacade embed={embed} poster={media.poster} label={heading} />
      ) : url ? (
        // An address we cannot embed is offered as a link rather than dropped.
        <div>
          <a href={url} target="_blank" rel="noreferrer" className={buttonStyles({ variant: "outline" })}>
            Watch the video
          </a>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------- documents -- */

const DOCUMENT_LABELS: Record<string, string> = {
  BROCHURE: "Brochure",
  DATASHEET: "Datasheet",
  MANUAL: "User manual",
  CERTIFICATE: "Certificate",
  CASE_STUDY: "Case study",
  OTHER: "Document",
};

export const fileSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function BrochureDownload({ content, entities }: RendererProps) {
  const product = (entities.items ?? [])[0];
  if (!product || product.documents.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        title={text(content, "heading") || product.name}
        description={text(content, "intro") || undefined}
        size="compact"
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {product.documents.map((document) => (
          <li key={document.id}>
            <CtaButton
              request={{
                kind: "DOWNLOAD_BROCHURE",
                placement: "cms.brochure.download",
                productId: product.id,
                productName: product.name,
                documentId: document.id,
                documentTitle: document.title,
                gated: document.gated,
                href: document.href,
              }}
              className="group border-line bg-surface hover:border-primary flex w-full items-center gap-4 rounded-2xl border p-5 text-left transition-colors"
            >
              <span className="bg-primary-subtle text-primary flex size-12 shrink-0 items-center justify-center rounded-xl">
                {document.gated ? <Lock aria-hidden="true" className="size-5" /> : <FileText aria-hidden="true" className="size-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-body-sm text-ink block font-semibold">{document.title}</span>
                <span className="text-caption text-ink-subtle block">
                  {DOCUMENT_LABELS[document.kind] ?? "Document"} · {fileSize(document.sizeBytes)}
                  {document.gated ? " · sent after a short form" : ""}
                </span>
              </span>
              <Download aria-hidden="true" className="text-ink-subtle group-hover:text-primary size-5 shrink-0 transition-colors" />
            </CtaButton>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- form -- */

const REASSURANCES = [
  "Your enquiry goes directly to our sales team",
  "Quoted to your configuration and quantities",
  "Single products or complete department projects",
];

export function FormSection({ content, design, forms }: RendererProps) {
  const built = forms.formKey;
  const form = built ? (
    // A form an administrator assembled; its submissions are filed under it.
    <BuiltForm form={built} action={submitFormAction} />
  ) : (
    // No product and no document, so the action files it as a contact form.
    <EnquiryForm action={submitEnquiryAction} submitLabel={text(content, "submitLabel") || "Send enquiry"} />
  );

  if (design.layout === "split") {
    return (
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="flex flex-col gap-6 lg:col-span-5">
          {text(content, "overline") ? <span className="eyebrow">{text(content, "overline")}</span> : null}
          <h2 className="text-section text-ink">{text(content, "heading") || "Tell us what you need"}</h2>
          {text(content, "intro") ? <p className="text-lead text-ink-muted">{text(content, "intro")}</p> : null}
          <ul className="flex flex-col gap-3 pt-2">
            {REASSURANCES.map((line) => (
              <li key={line} className="text-body-sm text-ink flex items-start gap-3">
                <CheckCircle2 aria-hidden="true" className="text-teal-500 mt-0.5 size-5 shrink-0" />
                {line}
              </li>
            ))}
          </ul>
          <Link href="/contact" className="text-body-sm text-primary w-fit font-semibold underline-offset-4 hover:underline">
            Other ways to reach us
          </Link>
        </div>
        <div className="border-line bg-surface rounded-3xl border p-6 shadow-[var(--shadow-card)] sm:p-10 lg:col-span-7">
          {form}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Intro content={content} design={design} />
      <div className="border-line bg-surface rounded-3xl border p-6 shadow-[var(--shadow-card)] sm:p-10">{form}</div>
    </div>
  );
}

