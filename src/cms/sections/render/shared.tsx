import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { buttonStyles, SectionHeader } from "@/components/ui";
import { ArrowLink } from "@/components/site/cards";
import { cn } from "@/lib/utils/cn";
import type { SectionDesign } from "@/lib/design/section-options";
import type { ResolvedMedia } from "@/cms/render-page";
import type { ResolvedEntity } from "@/cms/sections/entities";
import type { PublicForm } from "@/server/forms/service";

export type LocationGroup = {
  id: string;
  name: string;
  cities: Array<{ id: string; name: string; href: string; headline: string | null }>;
};

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
  /** Published cities by state, for the locations section. */
  locations: LocationGroup[];
  /** True for the first section on the page — it may sit under the header. */
  first: boolean;
};

/** Stagger index for `.intro` / `.reveal` children. */
export const stagger = (index: number): CSSProperties =>
  ({ "--i": index }) as CSSProperties;

export const text = (content: Record<string, unknown>, key: string): string =>
  typeof content[key] === "string" ? (content[key] as string) : "";

export const rows = (
  content: Record<string, unknown>,
  key: string,
): Array<Record<string, unknown>> =>
  Array.isArray(content[key])
    ? (content[key] as Array<Record<string, unknown>>)
    : [];

export const row = (item: Record<string, unknown>, key: string): string =>
  typeof item[key] === "string" ? (item[key] as string) : "";

export const columnClass: Record<string, string> = {
  "2": "sm:grid-cols-2",
  "3": "sm:grid-cols-2 lg:grid-cols-3",
  "4": "sm:grid-cols-2 lg:grid-cols-4",
};

export const gridCols = (columns: string | undefined, fallback = "3") =>
  columnClass[columns ?? fallback] ?? columnClass[fallback];

export const isDark = (design: SectionDesign) =>
  design.background === "dark" || design.background === "brand";

/**
 * A heading whose second sentence is set in the accent: "Advanced Medical
 * Technology. Built Around Better Care." reads as two lines, the second lit.
 * Editors write plain text; the split is purely presentational.
 */
export function AccentHeading({
  value,
  dark,
  breakLine = false,
}: {
  value: string;
  dark?: boolean;
  /** Start the lit sentence on its own line (from small screens up). */
  breakLine?: boolean;
}) {
  const match = /^(.+?[.!?])\s+(\S.*)$/.exec(value.trim());
  if (!match) return <>{value}</>;
  return (
    <>
      {match[1]}{" "}
      {breakLine ? <br className="hidden sm:block" /> : null}
      <span className={dark ? "text-gradient-dark" : "text-gradient"}>
        {match[2]}
      </span>
    </>
  );
}

export function Actions({
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  align,
  dark,
  size = "lg",
}: {
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  align?: string;
  dark?: boolean;
  size?: "lg" | "xl";
}) {
  const hasPrimary = primaryLabel && primaryHref;
  const hasSecondary = secondaryLabel && secondaryHref;
  if (!hasPrimary && !hasSecondary) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap",
        align === "center" && "sm:justify-center",
      )}
    >
      {hasPrimary ? (
        <Link href={primaryHref} className={buttonStyles({ size })}>
          {primaryLabel}
          <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-[var(--duration-base)] group-hover/button:translate-x-0.5" />
        </Link>
      ) : null}
      {hasSecondary ? (
        <Link
          href={secondaryHref}
          className={buttonStyles({
            variant: dark ? "outline-inverse" : "outline",
            size,
          })}
        >
          {secondaryLabel}
        </Link>
      ) : null}
    </div>
  );
}

/** The heading block most sections open with, plus an optional "view all". */
export function Intro({
  content,
  design,
  className,
  link = true,
}: {
  content: Record<string, unknown>;
  design: SectionDesign;
  className?: string;
  /** Show the ctaLabel/ctaHref link beside the heading. */
  link?: boolean;
}) {
  const heading = text(content, "heading");
  const intro = text(content, "intro");
  if (!heading && !intro) return null;

  const ctaLabel = text(content, "ctaLabel");
  const ctaHref = text(content, "ctaHref");
  const action =
    link && ctaLabel && ctaHref ? (
      <ArrowLink href={ctaHref} tone={isDark(design) ? "inverse" : "primary"}>
        {ctaLabel}
      </ArrowLink>
    ) : undefined;

  return (
    <SectionHeader
      overline={text(content, "overline") || undefined}
      title={heading}
      description={intro || undefined}
      align={design.align === "center" ? "center" : "left"}
      action={action}
      className={cn("reveal", className)}
    />
  );
}

export function Stack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-10 lg:gap-14", className)}>{children}</div>;
}
