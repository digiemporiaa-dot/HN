import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import { variants } from "@/lib/utils/variants";
import { Spinner } from "./spinner";

export const buttonStyles = variants({
  base: "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-[background-color,border-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out-quart)] disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55",
  variants: {
    variant: {
      primary:
        "bg-primary text-primary-ink hover:bg-primary-hover active:bg-primary-active",
      secondary:
        "bg-secondary text-secondary-ink hover:bg-secondary-hover active:bg-navy-950",
      outline:
        "border border-line-strong bg-transparent text-ink hover:border-ink-subtle hover:bg-surface-subtle",
      ghost: "bg-transparent text-ink hover:bg-surface-muted",
      danger: "bg-danger-600 text-white hover:bg-danger-700",
      link: "bg-transparent p-0 text-primary underline underline-offset-4 hover:text-primary-hover",
    },
    size: {
      sm: "h-9 px-3.5 text-body-sm",
      md: "h-11 px-5 text-body-sm",
      lg: "h-12 px-7 text-body",
      icon: "h-11 w-11 p-0",
    },
  },
  defaults: { variant: "primary", size: "md" },
});

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "link";
  size?: "sm" | "md" | "lg" | "icon";
  block?: boolean;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  block = false,
  loading = false,
  leadingIcon,
  trailingIcon,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        buttonStyles({ variant, size }),
        block && "w-full",
        className,
      )}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : leadingIcon}
      {children}
      {loading ? null : trailingIcon}
    </button>
  );
}
