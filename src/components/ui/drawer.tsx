"use client";

import { useId, type ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { useDialog } from "./use-dialog";

const sideClass = {
  right: "ml-auto h-dvh max-h-dvh w-[min(28rem,100vw-3rem)] rounded-l-xl",
  left: "mr-auto h-dvh max-h-dvh w-[min(28rem,100vw-3rem)] rounded-r-xl",
  bottom: "mt-auto max-h-[85dvh] w-screen max-w-none rounded-t-xl",
} as const;

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: keyof typeof sideClass;
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * Side sheet used for the RFQ basket, mobile filters and mobile navigation.
 * `bottom` is the correct choice on small screens for filter UX.
 */
export function Drawer({
  open,
  onClose,
  title,
  side = "right",
  footer,
  children,
}: DrawerProps) {
  const titleId = useId();
  const { ref, handleBackdropClick } = useDialog(open, onClose);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClick={handleBackdropClick}
      className={cn(
        // `open:flex` rather than `flex`: a bare display value would override the
        // user-agent `display: none` and leave the drawer visible while closed.
        "bg-surface text-ink m-0 max-w-none flex-col p-0 shadow-xl open:flex",
        "backdrop:bg-navy-950/60 backdrop:backdrop-blur-[2px]",
        sideClass[side],
      )}
    >
      <div className="border-line flex shrink-0 items-center justify-between gap-4 border-b p-5">
        <h2 id={titleId} className="text-h4 text-ink">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="text-ink-muted hover:bg-surface-muted hover:text-ink -mr-1 rounded-md p-2 transition-colors"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">{children}</div>

      {footer ? (
        <div className="border-line bg-surface-subtle shrink-0 border-t p-5">
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}
