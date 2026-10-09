"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { isDownloadKind } from "@/lib/cta/kinds";
import { cn } from "@/lib/utils/cn";
import { useQuoteBasket } from "../quote-basket";
import { useCta, type CtaRequest } from "./cta-provider";

/** A request as a server component may pass it. */
export type CtaRequestProps = CtaRequest;
import { QuoteRequestFlow } from "./quote-request";

/**
 * A configurable button.
 *
 * Where the button has somewhere to go without JavaScript (an ungated file, a
 * page), it is a real link, and the controller takes over the click once the
 * page is interactive. Otherwise it is a button that opens the dialog.
 * Outside the public site (an admin preview) it falls back to the link.
 */
export function CtaButton({
  request,
  className,
  children,
  "aria-label": ariaLabel,
}: {
  request: CtaRequest;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  const controller = useCta();
  const linkable = Boolean(request.href) && !request.gated;

  if (linkable) {
    const download = isDownloadKind(request.kind);
    return (
      <a
        href={request.href!}
        className={className}
        aria-label={ariaLabel}
        {...(download ? { target: "_blank", rel: "noreferrer" } : {})}
        onClick={(event) => {
          if (!controller || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
          event.preventDefault();
          controller.trigger(request);
        }}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      disabled={!controller}
      onClick={() => controller?.trigger(request)}
    >
      {children}
    </button>
  );
}

/**
 * The header's quotation list: opens the quotation modal rather than leaving
 * the page. Hidden until the list has something on it.
 */
export function QuoteListButton() {
  const { lines, ready } = useQuoteBasket();
  const controller = useCta();
  if (!ready || lines.length === 0) return null;

  const label = `Quotation list, ${lines.length} product${lines.length === 1 ? "" : "s"}`;
  const className =
    "text-ink-muted hover:text-ink hover:bg-surface-muted relative flex size-10 items-center justify-center rounded-md transition-colors";
  const badge = (
    <>
      <ClipboardList aria-hidden="true" className="size-[1.125rem]" />
      <span className="bg-ink absolute top-1 right-1 flex size-4 items-center justify-center rounded-full text-[9px] leading-none font-semibold text-white tabular-nums">
        {lines.length}
      </span>
    </>
  );

  if (!controller) {
    return (
      <Link href="/rfq" aria-label={label} className={className}>
        {badge}
      </Link>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      aria-haspopup="dialog"
      className={cn(className)}
      onClick={() => controller.trigger({ kind: "REQUEST_QUOTATION", placement: "header.quote-list" })}
    >
      {badge}
    </button>
  );
}

/** The /rfq page: the same builder, inline, for visitors who arrive by link. */
export function RfqPageFlow() {
  const controller = useCta();
  const basket = useQuoteBasket();
  if (!controller) return null;
  const cta = controller.resolve({ kind: "REQUEST_QUOTATION", placement: "rfq.page" });
  return (
    <div className="border-line bg-surface mx-auto w-full max-w-4xl rounded-2xl border p-5 shadow-[var(--shadow-card)] sm:p-8">
      <QuoteRequestFlow
        cta={cta}
        placement="rfq.page"
        draft={controller.quoteDraft}
        onDraftChange={controller.setQuoteDraft}
        onSent={() => {
          basket.clear();
          controller.resetQuoteDraft();
        }}
        layout="page"
      />
    </div>
  );
}
