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
  dark: "surface-dark",
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
        backgroundClass[background],
        spacingClass[spacing],
        "scroll-mt-24",
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
  className?: string;
  children?: ReactNode;
};

export function SectionHeader({
  overline,
  title,
  description,
  align = "left",
  as: Heading = "h2",
  className,
  children,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {overline ? (
        <span className="text-overline text-primary uppercase">{overline}</span>
      ) : null}
      <Heading
        className={cn(
          Heading === "h1" ? "text-h1" : "text-h2",
          "text-ink max-w-[24ch]",
          align === "center" && "max-w-[32ch]",
        )}
      >
        {title}
      </Heading>
      {description ? (
        <p
          className={cn(
            "text-body-lg text-ink-muted max-w-[62ch]",
            align === "center" && "mx-auto",
          )}
        >
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}
