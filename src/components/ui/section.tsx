import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import { Container } from "./container";
import {
  isValidAnchorId,
  type SectionBackground,
  type SectionContainer,
  type SectionSpacing,
} from "@/lib/design/section-options";

const spacingClass: Record<SectionSpacing, string> = {
  compact: "py-[var(--section-space-compact)]",
  normal: "py-[var(--section-space-normal)]",
  large: "py-[var(--section-space-large)]",
  xl: "py-[var(--section-space-xl)]",
};

const backgroundClass: Record<SectionBackground, string> = {
  default: "surface-default",
  white: "surface-white",
  light: "surface-light",
  pearl: "surface-pearl",
  gradient: "surface-gradient",
  grid: "surface-grid",
  glow: "surface-glow",
  dark: "surface-dark surface-navy",
  brand: "surface-brand",
};

type SectionProps = {
  spacing?: SectionSpacing;
  container?: SectionContainer;
  background?: SectionBackground;
  anchorId?: string;
  /** Set when the caller needs to own the inner layout entirely. */
  bare?: boolean;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
};

/**
 * The only component permitted to set section rhythm and background. Every CMS
 * section and every marketing page renders through it, which is what keeps the
 * vertical rhythm consistent once non-developers are building pages.
 */
export function Section({
  spacing = "normal",
  container = "standard",
  background = "default",
  anchorId,
  bare = false,
  className,
  innerClassName,
  children,
}: SectionProps) {
  const id = anchorId && isValidAnchorId(anchorId) ? anchorId : undefined;

  return (
    <section
      id={id}
      className={cn(
        backgroundClass[background] ?? backgroundClass.default,
        spacingClass[spacing],
        "relative scroll-mt-24",
        className,
      )}
    >
      {bare ? (
        children
      ) : (
        <Container width={container} className={innerClassName}>
          {children}
        </Container>
      )}
    </section>
  );
}

type SectionHeaderProps = {
  overline?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  as?: "h1" | "h2" | "h3";
  /** "section" is the large editorial title; "compact" suits dense pages. */
  size?: "section" | "compact" | "page";
  className?: string;
  /** Rendered beside the heading on wide screens (a "view all" link). */
  action?: ReactNode;
  children?: ReactNode;
};

const titleSize = {
  page: "text-hero",
  section: "text-section",
  compact: "text-h2",
} as const;

export function SectionHeader({
  overline,
  title,
  description,
  align = "left",
  as: Heading = "h2",
  size,
  className,
  action,
  children,
}: SectionHeaderProps) {
  const resolved = size ?? (Heading === "h1" ? "page" : "section");
  const centered = align === "center";

  const text = (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-4",
        centered && "items-center text-center",
      )}
    >
      {overline ? <span className="eyebrow">{overline}</span> : null}
      <Heading
        className={cn(
          titleSize[resolved],
          "text-ink text-safe max-w-[22ch]",
          centered && "max-w-[26ch]",
        )}
      >
        {title}
      </Heading>
      {description ? (
        <p
          className={cn(
            "text-lead text-ink-muted max-w-[58ch]",
            centered && "mx-auto",
          )}
        >
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );

  if (!action) {
    return <div className={cn("flex flex-col", className)}>{text}</div>;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-10",
        centered && "md:flex-col md:items-center",
        className,
      )}
    >
      {text}
      <div className="shrink-0">{action}</div>
    </div>
  );
}
