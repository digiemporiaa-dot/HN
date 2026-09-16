import Link from "next/link";
import { BadgeCheck, Download, Quote } from "lucide-react";
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
import { parseVideoUrl } from "@/cms/video";
import { EnquiryForm } from "@/components/site/enquiry-form";
import { BuiltForm } from "@/components/site/built-form";
import { submitFormAction } from "@/server/forms/submit";
import type { PublicForm } from "@/server/forms/service";
import { submitEnquiryAction } from "@/server/leads/actions";
import {
  GalleryGrid,
  TabbedPanels,
  VideoFacade,
} from "@/cms/sections/client-sections";

export type RendererProps = {
  content: Record<string, unknown>;
  design: SectionDesign;
  /** Resolved URL and alt text for MEDIA fields, keyed by field name. */
  media: Record<string, ResolvedMedia | null>;
  /** Every resolved asset on the page, for images inside repeater rows. */
  mediaById: Record<string, ResolvedMedia>;
  /**
   * Catalogue records for ENTITIES fields, keyed by field name, already in the
   * editor's order and already filtered to what is publicly visible.
   */
  entities: Record<string, ResolvedEntity[]>;
  /** Built forms for FORMKEY fields, keyed by field name. Null means the
   *  enquiry form, either by choice or because the chosen one is gone. */
  forms: Record<string, PublicForm | null>;
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

/* -------------------------------------------------------------------------
 * Content sections
 * ---------------------------------------------------------------------- */

/** The heading block shared by every section that has one. */
function Header({
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

const row = (item: Record<string, unknown>, key: string): string =>
  typeof item[key] === "string" ? (item[key] as string) : "";

function ImageCards({ content, design, mediaById }: RendererProps) {
  const items = rows(content, "items");
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-10">
      <Header content={content} align={design.align} />

      <ul
        className={cn(
          "grid grid-cols-1 gap-6",
          columnClass[design.columns ?? "3"] ?? columnClass["3"],
        )}
      >
        {items.map((item, index) => {
          const image = mediaById[row(item, "image")];
          const href = row(item, "linkHref");
          const body = (
            <>
              {image ? (
                <img
                  src={image.url}
                  alt={image.alt}
                  loading="lazy"
                  className="bg-surface-muted aspect-4/3 w-full rounded-md object-cover"
                />
              ) : null}
              <CardContent className="flex flex-col gap-1.5 p-0">
                <h3 className="text-h4 text-ink">{row(item, "title")}</h3>
                {row(item, "body") ? (
                  <p className="text-body-sm text-ink-muted">
                    {row(item, "body")}
                  </p>
                ) : null}
                {href && row(item, "linkLabel") ? (
                  <span className="text-body-sm text-primary mt-1 font-medium">
                    {row(item, "linkLabel")}
                  </span>
                ) : null}
              </CardContent>
            </>
          );

          return (
            <Card
              key={index}
              as="li"
              appearance={design.cardStyle ?? "standard"}
              interactive={Boolean(href)}
            >
              {href ? (
                <Link href={href} className="flex flex-col gap-3">
                  {body}
                </Link>
              ) : (
                <div className="flex flex-col gap-3">{body}</div>
              )}
            </Card>
          );
        })}
      </ul>
    </div>
  );
}

function Gallery({ content, design, mediaById }: RendererProps) {
  const items = rows(content, "items").flatMap((item) => {
    const media = mediaById[row(item, "image")];
    return media ? [{ media, caption: row(item, "caption") }] : [];
  });
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      <Header content={content} align={design.align} />
      <GalleryGrid items={items} columns={design.columns ?? "3"} />
    </div>
  );
}

function Video({ content, media }: RendererProps) {
  const url = text(content, "url");
  const embed = parseVideoUrl(url);
  const heading = text(content, "heading");

  return (
    <div className="flex flex-col gap-6">
      <Header content={content} align="left" />

      {embed ? (
        <VideoFacade embed={embed} poster={media.poster} label={heading} />
      ) : url ? (
        // An address we cannot embed is offered as a link rather than dropped:
        // the editor put it there on purpose. Wrapped so it sizes to its own
        // label instead of stretching across the column.
        <div>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className={buttonStyles({ variant: "outline" })}
          >
            Watch the video
          </a>
        </div>
      ) : null}
    </div>
  );
}

function Testimonials({ content, design }: RendererProps) {
  const items = rows(content, "items");
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-10">
      <Header content={content} align={design.align} />

      <ul
        className={cn(
          "grid grid-cols-1 gap-6",
          columnClass[design.columns ?? "3"] ?? columnClass["3"],
        )}
      >
        {items.map((item, index) => (
          <Card key={index} as="li" appearance={design.cardStyle ?? "standard"}>
            <CardContent className="flex h-full flex-col gap-4 p-0">
              <Quote
                aria-hidden="true"
                className="text-primary/30 size-7 shrink-0"
              />
              <blockquote className="text-body text-ink flex-1">
                {row(item, "quote")}
              </blockquote>
              {row(item, "name") || row(item, "role") ? (
                <figcaption className="flex flex-col">
                  {row(item, "name") ? (
                    <span className="text-body-sm text-ink font-medium">
                      {row(item, "name")}
                    </span>
                  ) : null}
                  {row(item, "role") ? (
                    <span className="text-caption text-ink-muted">
                      {row(item, "role")}
                    </span>
                  ) : null}
                </figcaption>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </ul>
    </div>
  );
}

function Certifications({ content, design, mediaById }: RendererProps) {
  const items = rows(content, "items");
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      <Header content={content} align={design.align} />

      <ul
        className={cn(
          "grid grid-cols-1 gap-6",
          columnClass[design.columns ?? "4"] ?? columnClass["4"],
        )}
      >
        {items.map((item, index) => {
          const image = mediaById[row(item, "image")];
          return (
            <li key={index} className="flex items-start gap-3">
              {image ? (
                <img
                  src={image.url}
                  alt={image.alt}
                  loading="lazy"
                  className="size-12 shrink-0 object-contain"
                />
              ) : (
                <BadgeCheck
                  aria-hidden="true"
                  className="text-primary size-6 shrink-0"
                />
              )}
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-body-sm text-ink font-medium">
                  {row(item, "name")}
                </span>
                {row(item, "detail") ? (
                  <span className="text-caption text-ink-muted">
                    {row(item, "detail")}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Timeline({ content, design }: RendererProps) {
  const items = rows(content, "items");
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      <Header content={content} align={design.align} />

      <ol className="border-line flex flex-col gap-8 border-l pl-6">
        {items.map((item, index) => (
          <li key={index} className="relative flex flex-col gap-1">
            <span
              aria-hidden="true"
              className="bg-primary absolute top-2 -left-[27px] size-2.5 rounded-full ring-4 ring-white"
            />
            <span className="text-caption text-primary font-medium">
              {row(item, "when")}
            </span>
            <h3 className="text-h4 text-ink">{row(item, "title")}</h3>
            {row(item, "body") ? (
              <p className="text-body-sm text-ink-muted">{row(item, "body")}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ProcessSteps({ content, design }: RendererProps) {
  const items = rows(content, "items");
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-10">
      <Header content={content} align={design.align} />

      <ol
        className={cn(
          "grid grid-cols-1 gap-8",
          columnClass[design.columns ?? "4"] ?? columnClass["4"],
        )}
      >
        {items.map((item, index) => (
          <li key={index} className="flex flex-col gap-2">
            <span className="bg-primary text-body-sm flex size-9 items-center justify-center rounded-full font-medium text-white">
              {index + 1}
            </span>
            <h3 className="text-h4 text-ink">{row(item, "title")}</h3>
            {row(item, "body") ? (
              <p className="text-body-sm text-ink-muted">{row(item, "body")}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function AccordionSection({ content }: RendererProps) {
  const items = rows(content, "items");
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      <Header content={content} align="left" />
      {/* The shared component still names its halves question and answer,
          after the FAQ it was first built for. */}
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

function TabsSection({ content }: RendererProps) {
  const items = rows(content, "items");
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      <Header content={content} align="left" />
      <TabbedPanels
        items={items.map((item) => ({
          label: row(item, "label"),
          // Rendered here rather than in the client component: rich text is
          // markup the server already knows how to produce, and a render
          // function cannot cross that boundary.
          content: <RichText value={row(item, "body")} />,
        }))}
      />
    </div>
  );
}

function FormSection({ content, forms }: RendererProps) {
  const built = forms.formKey;

  return (
    <div className="flex flex-col gap-8">
      <Header content={content} align="left" />
      {built ? (
        // A form an administrator assembled. Its submissions are filed under
        // the form rather than as enquiries, because that is what they are.
        <BuiltForm form={built} action={submitFormAction} />
      ) : (
        // No product and no document, so the action files it as a contact form.
        // The source is decided by what the submission carries, not by anything
        // this section could assert.
        <EnquiryForm
          action={submitEnquiryAction}
          submitLabel={text(content, "submitLabel") || "Send enquiry"}
        />
      )}
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
  IMAGE_CARDS: ImageCards,
  GALLERY: Gallery,
  VIDEO: Video,
  TESTIMONIALS: Testimonials,
  TRUST_CERTIFICATIONS: Certifications,
  TIMELINE: Timeline,
  PROCESS_STEPS: ProcessSteps,
  ACCORDION: AccordionSection,
  TABS: TabsSection,
  FORM: FormSection,
};
