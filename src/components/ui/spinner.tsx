import { cn } from "@/lib/utils/cn";

type SpinnerProps = {
  className?: string;
  label?: string;
};

export function Spinner({ className, label }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label ?? "Loading"}
      className={cn(
        "inline-block size-5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
    />
  );
}
