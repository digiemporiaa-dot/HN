"use client";

import { useId, type ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { useDialog } from "./use-dialog";

const sizeClass = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
} as const;

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: keyof typeof sizeClass;
  footer?: ReactNode;
  children: ReactNode;
};

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  footer,
  children,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const { ref, handleBackdropClick } = useDialog(open, onClose);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={handleBackdropClick}
      className={cn(
        // The dialog is drawn in the top layer but still inherits its
        // ancestors' custom properties, so it resets them: a modal opened from
        // a dark section is the same modal as one opened from the page.
        "surface-reset bg-surface text-ink m-auto w-[calc(100vw-2rem)] rounded-xl p-0 shadow-xl",
        "backdrop:bg-navy-950/60 backdrop:backdrop-blur-[2px]",
        sizeClass[size],
      )}
    >
      <div className="border-line flex items-start justify-between gap-6 border-b p-6">
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="text-h4 text-ink">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="text-body-sm text-ink-muted">
              {description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="text-ink-muted hover:bg-surface-muted hover:text-ink -mt-1 -mr-1 rounded-md p-2 transition-colors"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>

      <div className="max-h-[min(60vh,32rem)] overflow-y-auto p-6">
        {children}
      </div>

      {footer ? (
        <div className="border-line bg-surface-subtle flex items-center justify-end gap-3 border-t p-6">
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}
