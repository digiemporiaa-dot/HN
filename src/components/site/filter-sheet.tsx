"use client";

import { useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";

import { buttonStyles, Drawer } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

/**
 * The catalogue filters on small screens: a button that opens them as a bottom
 * sheet. The filters themselves are server-rendered links passed in as
 * children, so they stay crawlable and work without this component; choosing
 * one closes the sheet as the page navigates.
 */
export function FilterSheet({
  activeCount,
  children,
}: {
  activeCount: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(buttonStyles({ variant: "outline", size: "md" }), "lg:hidden")}
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        Filters
        {activeCount > 0 ? (
          <span className="bg-primary flex size-5 items-center justify-center rounded-full text-[11px] font-semibold text-white">
            {activeCount}
          </span>
        ) : null}
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Filter products" side="bottom">
        <div
          onClickCapture={(event) => {
            if ((event.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          {children}
        </div>
      </Drawer>
    </>
  );
}
