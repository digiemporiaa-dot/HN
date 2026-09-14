import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Standard padding and rhythm for every admin screen, so page content never
 * sits flush against the sidebar or under the sticky header.
 */
export function AdminPage({
  children,
  className,
  width = "full",
}: {
  children: ReactNode;
  className?: string;
  width?: "full" | "narrow";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-8 px-4 py-8 lg:px-8",
        width === "narrow" && "mx-auto w-full max-w-3xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
