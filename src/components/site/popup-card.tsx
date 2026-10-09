import type { ReactNode } from "react";
import { ArrowRight, X } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export type PopupCardContent = {
  eyebrow: string | null;
  heading: string;
  description: string | null;
  image: { url: string; alt: string } | null;
  cta: { label: string; href: string } | null;
  product: { name: string; href: string; summary: string | null } | null;
};

/**
 * The popup's face, shared by the public dialog and the admin preview so the
 * preview is the real thing.
 *
 * Pearl and white, near-black type, one restrained cyan accent. Image beside
 * the text from `sm` up (the "split" layout), stacked above it on a phone.
 * `layout` forces one or the other for the admin's device preview.
 */
export function PopupCard({
  content,
  titleId,
  descriptionId,
  onClose,
  onCta,
  form,
  layout = "responsive",
  closeRef,
}: {
  content: PopupCardContent;
  titleId: string;
  descriptionId?: string;
  onClose?: () => void;
  onCta?: () => void;
  /** The form, for an enquiry popup. */
  form?: ReactNode;
  layout?: "responsive" | "desktop" | "mobile";
  closeRef?: React.Ref<HTMLButtonElement>;
}) {
  const split = Boolean(content.image);
  const desktop = layout === "desktop";
  const mobile = layout === "mobile";

  return (
    <div
      className={cn(
        "popup-card bg-surface text-ink relative grid w-full overflow-hidden rounded-[1.25rem]",
        split && !mobile && (desktop ? "grid-cols-[0.92fr_1.08fr]" : "sm:grid-cols-[0.92fr_1.08fr]"),
      )}
    >
      {onClose ? (
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="bg-surface/90 text-ink-muted hover:text-ink border-line absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full border shadow-[var(--shadow-xs)] backdrop-blur transition-colors"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      ) : null}

      {content.image ? (
        <div
          className={cn(
            "bg-surface-panel relative overflow-hidden",
            mobile ? "aspect-[16/9]" : desktop ? "min-h-full" : "aspect-[16/9] sm:aspect-auto sm:min-h-full",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- media route, stored size */}
          <img
            src={content.image.url}
            alt={content.image.alt}
            className="absolute inset-0 size-full object-cover"
            loading="eager"
            decoding="async"
          />
        </div>
      ) : null}

      <div
        className={cn(
          "flex min-w-0 flex-col gap-4 p-6",
          desktop ? "p-9" : !mobile && "sm:p-9",
          // Leaves room for the close button above the heading on a phone.
          !split && "pt-12",
        )}
      >
        {content.eyebrow ? (
          <span className="text-overline text-primary flex items-center gap-2 uppercase">
            <span aria-hidden="true" className="bg-accent inline-block size-1.5 rounded-full" />
            {content.eyebrow}
          </span>
        ) : null}
        <h2
          id={titleId}
          className={cn(
            "text-ink font-display pr-8 font-normal tracking-[-0.03em] text-balance",
            mobile ? "text-[1.5rem] leading-[1.15]" : "text-[clamp(1.5rem,1.2rem+1vw,2rem)] leading-[1.12]",
          )}
        >
          {content.heading}
        </h2>
        {content.description ? (
          <p id={descriptionId} className="text-body-sm text-ink-muted max-w-[48ch]">
            {content.description}
          </p>
        ) : null}

        {content.product ? (
          <div className="border-line flex flex-col gap-1 border-t pt-4">
            <span className="text-label text-ink">{content.product.name}</span>
            {content.product.summary ? (
              <span className="text-caption text-ink-muted line-clamp-2">{content.product.summary}</span>
            ) : null}
          </div>
        ) : null}

        {form ? <div className="popup-form pt-1">{form}</div> : null}

        {content.cta ? (
          <div className="pt-1">
            <a
              href={content.cta.href}
              onClick={onCta}
              className="bg-ink text-canvas hover:bg-secondary-hover group/cta inline-flex h-11 items-center gap-2 rounded-full px-5 text-[0.875rem] font-medium transition-colors"
              {...(content.cta.href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {content.cta.label}
              <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover/cta:translate-x-0.5" />
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
