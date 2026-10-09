import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import { variants } from "@/lib/utils/variants";
import type { CardStyle } from "@/lib/design/section-options";

const cardStyles = variants({
  base: "ui-card relative flex flex-col rounded-xl",
  variants: {
    appearance: {
      standard: "border border-line bg-surface",
      bordered: "border border-line-strong bg-surface",
      elevated: "border border-line bg-surface shadow-[var(--shadow-card)]",
      minimal: "bg-transparent",
      overlay: "overflow-hidden bg-navy-950 text-white",
    },
    interactive: {
      yes: "transition-[border-color,box-shadow,transform] duration-[var(--duration-slow)] ease-[var(--ease-out-quart)] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-card-hover)] focus-within:border-line-strong",
      no: "",
    },
  },
  defaults: { appearance: "standard", interactive: "no" },
});

type CardProps = {
  appearance?: CardStyle;
  interactive?: boolean;
  as?: ElementType;
  className?: string;
  children: ReactNode;
};

export function Card({
  appearance = "standard",
  interactive = false,
  as: Component = "div",
  className,
  children,
}: CardProps) {
  return (
    <Component
      className={cardStyles({
        appearance,
        interactive: interactive ? "yes" : "no",
        className,
      })}
    >
      {children}
    </Component>
  );
}

export function CardHeader({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2 p-6 pb-0", className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  as: Heading = "h3",
  className,
  children,
}: {
  as?: "h2" | "h3" | "h4";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Heading className={cn("text-h4 text-ink", className)}>{children}</Heading>
  );
}

export function CardDescription({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <p className={cn("text-body-sm text-ink-muted", className)}>{children}</p>
  );
}

export function CardContent({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("p-6", className)}>{children}</div>;
}

export function CardFooter({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "mt-auto flex items-center gap-3 border-t border-line p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
