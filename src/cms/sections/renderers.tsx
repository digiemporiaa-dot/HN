import Link from "next/link";
import { Download } from "lucide-react";
import type { ReactNode } from "react";

import {
  Accordion,
  buttonStyles,
  Card,
  CardContent,
  SectionHeader,
} from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import type { SectionDesign } from "@/lib/design/section-options";
import type { ResolvedMedia } from "@/cms/render-page";
import type { ResolvedEntity } from "@/cms/sections/entities";
import { RichText } from "@/cms/rich-text";

export type RendererProps = {
  content: Record<string, unknown>;
  design: SectionDesign;
  /** Resolved URL and alt text for MEDIA fields, keyed by field name. */
  media: Record<string, ResolvedMedia | null>;
  /**
   * Catalogue records for ENTITIES fields, keyed by field name, already in the
   * editor's order and already filtered to what is publicly visible.
   */
  entities: Record<string, ResolvedEntity[]>;
};

const text = (content: Record<string, unknown>, key: string): string =>
  typeof content[key] === "string" ? (content[key] as string) : "";

const rows = (
  content: Record<string, unknown>,
  key: string,
): Array<Record<string, unknown>> =>
  Array.isArray(content[key])
    ? (content[key] as Array<Record<string, unknown>>)
    : [];

const columnClass: Record<string, string> = {
  "2": "sm:grid-cols-2",
  "3": "sm:grid-cols-2 lg:grid-cols-3",
  "4": "sm:grid-cols-2 lg:grid-cols-4",
};

function Actions({
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  align,
}: {
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  align?: string;
}) {
  const hasPrimary = primaryLabel && primaryHref;
  const hasSecondary = secondaryLabel && secondaryHref;
  if (!hasPrimary && !hasSecondary) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap gap-3",
        align === "center" && "justify-center",
      )}
    >
      {hasPrimary ? (
        <Link href={primaryHref} className={buttonStyles({ size: "lg" })}>
          {primaryLabel}
        </Link>
      ) : null}
      {hasSecondary ? (
        <Link
          href={secondaryHref}
          className={buttonStyles({ variant: "outline", size: "lg" })}
        >
          {secondaryLabel}
        </Link>
      ) : null}
    </div>
  );
}

/* eslint-disable @next/next/no-img-element -- CMS images are served from our own
   media route at their stored size; Next/Image would re-encode files we
   deliberately store untouched. */

function Hero({ content, design, media }: RendererProps) {
  const image = media.image;
  const centered = design.align === "center";

  return (
    <div
      className={cn(
        "grid items-center gap-10",
        image && !centered ? "lg:grid-cols-2" : "",
      )}
    >
      <div className={cn("flex flex-col gap-6", centered && "text-center")}>
        <SectionHeader
          overline={text(content, "overline") || undefined}
          title={text(content, "heading")}
          description={text(content, "subheading") || undefined}
          align={centered ? "center" : "left"}
          as="h1"
        />
        <Actions
          primaryLabel={text(content, "primaryLabel")}
          primaryHref={text(content, "primaryHref")}
          secondaryLabel={text(content, "secondaryLabel")}
          secondaryHref={text(content, "secondaryHref")}
          align={design.align}
        />
      </div>

      {image ? (
        <img
          src={image.url}
          alt={image.alt}
          className="border-line w-full rounded-xl border object-cover"
        />
      ) : null}
    </div>
  );
}

function HeadingText({ content, design }: RendererProps) {
  return (
    <SectionHeader
      overline={text(content, "overline") || undefined}
      title={text(content, "heading")}
      description={text(content, "body") || undefined}
      align={design.align === "center" ? "center" : "left"}
    />
  );
}

function RichTextSection({ content }: RendererProps) {
  const heading = text(content, "heading");

  return (
    <div className="flex flex-col gap-5">
      {heading ? <h2 className="text-h2 text-ink">{heading}</h2> : null}
      <RichText
        value={text(content, "body")}
        className="text-body-lg text-ink-muted max-w-[70ch]"
      />
    </div>
  );
}

function ImageText({ content, design, media }: RendererProps) {
  const imageFirst = design.imagePosition !== "right";

  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      {media.image ? (
        <img
          src={media.image.url}
          alt={media.image.alt}
          className={cn(
            "border-line w-full rounded-xl border object-cover",
            imageFirst ? "lg:order-1" : "lg:order-2",
          )}
        />
      ) : null}

      <div
        className={cn(
          "flex flex-col gap-5",
          imageFirst ? "lg:order-2" : "lg:order-1",
        )}
      >
        {text(content, "overline") ? (
          <span className="text-overline text-primary uppercase">
            {text(content, "overline")}
          </span>
        ) : null}
        <h2 className="text-h2 text-ink">{text(content, "heading")}</h2>
        <RichText
          value={text(content, "body")}
          className="text-body text-ink-muted"
        />
        <Actions
          primaryLabel={text(content, "ctaLabel")}
          primaryHref={text(content, "ctaHref")}
          secondaryLabel=""
          secondaryHref=""
        />
      </div>
    </div>
  );
}

function Statistics({ content, design }: RendererProps) {
  const items = rows(content, "items");
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      {text(content, "heading") ? (
        <h2 className="text-h2 text-ink">{text(content, "heading")}</h2>
      ) : null}

      <dl
        className={cn(
          "grid gap-8",
          columnClass[design.columns ?? "3"] ?? columnClass["3"],
        )}
      >
        {items.map((item, index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <dt className="text-display-2 text-ink tabular-nums">
              {String(item.value ?? "")}
            </dt>
            <dd className="text-body-sm text-ink-muted">
              {String(item.label ?? "")}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function IconCards({ content, design }: RendererProps) {
  const items = rows(content, "items");

  return (
    <div className="flex flex-col gap-10">
      {text(content, "heading") ? (
        <SectionHeader
          overline={text(content, "overline") || undefined}
          title={text(content, "heading")}
          description={text(content, "intro") || undefined}
          align={design.align === "center" ? "center" : "left"}
        />
      ) : null}

      <div
        className={cn(
          "grid gap-6",
          columnClass[design.columns ?? "3"] ?? columnClass["3"],
        )}
      >
        {items.map((item, index) => (
          <Card key={index} appearance={design.cardStyle ?? "standard"}>
            <CardContent className="flex flex-col gap-2">
              <h3 className="text-h4 text-ink">{String(item.title ?? "")}</h3>
              <p className="text-body-sm text-ink-muted">
                {String(item.body ?? "")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Faq({ content }: RendererProps) {
  const items = rows(content, "items");
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      {text(content, "heading") ? (
        <h2 className="text-h2 text-ink">{text(content, "heading")}</h2>
      ) : null}

      <Accordion
        items={items.map((item, index) => ({
          id: String(index),
          question: String(item.question ?? ""),
          answer: <RichText value={String(item.answer ?? "")} />,
        }))}
      />
    </div>
  );
}

function CallToAction({ content, design }: RendererProps) {
  const centered = design.align !== "left";

  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        centered && "items-center text-center",
      )}
    >
      <h2 className="text-h1 text-ink max-w-[26ch]">
        {text(content, "heading")}
      </h2>
      {text(content, "body") ? (
        <p className="text-body-lg text-ink-muted max-w-[58ch]">
          {text(content, "body")}
        </p>
      ) : null}
      <Actions
        primaryLabel={text(content, "primaryLabel")}
        primaryHref={text(content, "primaryHref")}
        secondaryLabel={text(content, "secondaryLabel")}
        secondaryHref={text(content, "secondaryHref")}
        align={centered ? "center" : "left"}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Catalogue sections
 *
 * These render records rather than copy, so a product renamed or withdrawn in
 * the catalogue changes on every page that shows it without anyone editing
 * those pages. The resolver has already dropped anything unpublished, so an
 * empty list here means there is nothing to show and the section says nothing
 * at all rather than announcing a heading over a gap.
 * ---------------------------------------------------------------------- */

function GridHeader({
  content,
  align,
}: {
  content: Record<string, unknown>;
  align?: string;
}) {
  const heading = text(content, "heading");
  const intro = text(content, "intro");
  if (!heading && !intro) return null;

  return (
    <SectionHeader
      overline={text(content, "overline") || undefined}
      title={heading}
      description={intro || undefined}
      align={align === "center" ? "center" : "left"}
    />
  );
}

function EntityCard({
  entity,
  cardStyle,
}: {
  entity: ResolvedEntity;
  cardStyle?: SectionDesign["cardStyle"];
}) {
  return (
    <Card as="li" appearance={cardStyle ?? "standard"} interactive>
      <Link href={entity.href} className="group flex h-full flex-col gap-3">
        {entity.image ? (
          <img
            src={entity.image.url}
            alt={entity.image.alt}
            loading="lazy"
            className="bg-surface-muted aspect-4/3 w-full rounded-md object-contain"
          />
        ) : null}

        <CardContent className="flex flex-1 flex-col gap-1.5 p-0">
          {entity.meta ? (
            <span className="text-caption text-ink-subtle">{entity.meta}</span>
          ) : null}
          <span className="text-body text-ink group-hover:text-primary font-medium transition-colors">
            {entity.name}
          </span>
          {entity.summary ? (
            <span className="text-body-sm text-ink-muted line-clamp-3">
              {entity.summary}
            </span>
          ) : null}
        </CardContent>
      </Link>
    </Card>
  );
}

function CatalogueGrid({ content, design, entities }: RendererProps) {
  const items = entities.items ?? [];
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      <GridHeader content={content} align={design.align} />

      <ul
        className={cn(
          "grid grid-cols-1 gap-5",
          columnClass[design.columns ?? "3"] ?? columnClass["3"],
        )}
      >
        {items.map((entity) => (
          <EntityCard
            key={entity.id}
            entity={entity}
            cardStyle={design.cardStyle}
          />
        ))}
      </ul>

      <Actions
        primaryLabel={text(content, "ctaLabel")}
        primaryHref={text(content, "ctaHref")}
        secondaryLabel=""
        secondaryHref=""
        align={design.align}
      />
    </div>
  );
}

function LogoStrip({ content, entities }: RendererProps) {
  const items = entities.items ?? [];
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {text(content, "heading") ? (
        <h2 className="text-h4 text-ink-muted text-center">
          {text(content, "heading")}
        </h2>
      ) : null}

      <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
        {items.map((entity) => (
          <li key={entity.id}>
            <Link
              href={entity.href}
              className="opacity-70 transition-opacity hover:opacity-100"
            >
              {entity.image ? (
                <img
                  src={entity.image.url}
                  alt={entity.image.alt || entity.name}
                  loading="lazy"
                  className="max-h-12 w-auto object-contain"
                />
              ) : (
                <span className="text-body-sm text-ink-muted font-medium">
                  {entity.name}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const DOCUMENT_LABELS: Record<string, string> = {
  BROCHURE: "Brochure",
  DATASHEET: "Datasheet",
  MANUAL: "User manual",
  CERTIFICATE: "Certificate",
  CASE_STUDY: "Case study",
  OTHER: "Document",
};

const fileSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

function BrochureDownload({ content, entities }: RendererProps) {
  const product = (entities.items ?? [])[0];
  if (!product || product.documents.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title={text(content, "heading") || product.name}
        description={text(content, "intro") || undefined}
        align="left"
      />

      <ul className="flex flex-col gap-2">
        {product.documents.map((document) => (
          <li key={document.href}>
            <a
              href={document.href}
              target="_blank"
              rel="noreferrer"
              className="border-line bg-surface hover:border-line-strong flex items-center gap-3 rounded-md border p-4 transition-colors"
            >
              <Download
                aria-hidden="true"
                className="text-primary size-5 shrink-0"
              />
              <span className="min-w-0 flex-1">
                <span className="text-body-sm text-ink block font-medium">
                  {document.title}
                </span>
                <span className="text-caption text-ink-subtle block">
                  {DOCUMENT_LABELS[document.kind] ?? "Document"} ·{" "}
                  {fileSize(document.sizeBytes)}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* eslint-enable @next/next/no-img-element */

export const SECTION_RENDERERS: Record<
  string,
  (props: RendererProps) => ReactNode
> = {
  HERO: Hero,
  HEADING_TEXT: HeadingText,
  RICH_TEXT: RichTextSection,
  IMAGE_TEXT: ImageText,
  STATISTICS: Statistics,
  ICON_CARDS: IconCards,
  FAQ: Faq,
  CTA: CallToAction,
  // One grid renderer for all five: they differ in which table they read, which
  // the resolver has already settled by the time a card is drawn.
  PRODUCT_GRID: CatalogueGrid,
  CATEGORY_GRID: CatalogueGrid,
  SUBCATEGORY_GRID: CatalogueGrid,
  BRAND_GRID: CatalogueGrid,
  SPECIALTY_GRID: CatalogueGrid,
  LOGO_STRIP: LogoStrip,
  BROCHURE_DOWNLOAD: BrochureDownload,
};
