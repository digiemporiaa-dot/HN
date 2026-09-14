import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import type { SectionContainer } from "@/lib/design/section-options";

const widthClass: Record<SectionContainer, string> = {
  narrow: "max-w-narrow",
  standard: "max-w-standard",
  wide: "max-w-wide",
  full: "max-w-none",
};

type ContainerProps = {
  width?: SectionContainer;
  as?: ElementType;
  className?: string;
  children: ReactNode;
};

export function Container({
  width = "standard",
  as: Component = "div",
  className,
  children,
}: ContainerProps) {
  return (
    <Component
      className={cn(
        "mx-auto w-full px-[var(--gutter)]",
        widthClass[width],
        className,
      )}
    >
      {children}
    </Component>
  );
}
