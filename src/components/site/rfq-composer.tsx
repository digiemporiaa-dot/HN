"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Loader2,
  MessageSquareText,
  Minus,
  Package,
  Plus,
  Trash2,
} from "lucide-react";

import { buttonStyles, EmptyState, Field, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { MAX_QUANTITY } from "@/lib/validation/rfq";
import type { QuoteLineProduct } from "@/server/products/public";
import { lookupQuoteLinesAction, submitRfqAction } from "@/server/rfq/actions";
import { EnquiryForm } from "./enquiry-form";
import { useQuoteBasket } from "./quote-basket";

/* eslint-disable @next/next/no-img-element -- catalogue images are served from
   our own media route at their stored size. */

/**
 * The quotation list, and the request that sends it.
 *
 * The basket holds ids and nothing else, so the page asks the server what those
 * ids are before it can show anything. That round trip is why the list renders
 * from a loading state rather than from the markup: what a visitor kept in
 * their browser is not something the page was built with.
 */
export function RfqComposer() {
  const { lines, ready, setQuantity, setNotes, remove, clear } =
    useQuoteBasket();
  const [products, setProducts] = useState<QuoteLineProduct[] | null>(null);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // Clearing the list asks twice: it cannot be undone, and the button sits
  // beside controls the visitor is pressing all the time.
  const [confirmClear, setConfirmClear] = useState(false);

  // Keyed on the ids rather than the whole basket, so typing a note or changing
  // a quantity does not send the page back to the server for names it has.
  const idsKey = lines.map((line) => line.productId).join(",");

  useEffect(() => {
    if (!ready) return;
    const ids = idsKey ? idsKey.split(",") : [];
    if (ids.length === 0) {
      setProducts([]);
      return;
    }

    let cancelled = false;
    setLookupFailed(false);
    lookupQuoteLinesAction(ids)
      .then((result) => {
        if (!cancelled) setProducts(result);
      })
      .catch(() => {
        if (!cancelled) setLookupFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, idsKey]);

  const byId = useMemo(
    () => new Map((products ?? []).map((product) => [product.id, product])),
    [products],
  );

  // In the order the visitor arranged them, which is the order the request is
  // stored in. A line whose product has been withdrawn keeps its place and says
  // so, rather than disappearing between one visit and the next.
  const rows = lines.map((line) => ({
    line,
    product: byId.get(line.productId) ?? null,
  }));
  const available = rows.filter((row) => row.product !== null);

  // Once sent, the list is gone and the form is showing its acknowledgement.
  // Everything below stays out of the way rather than replacing the form: a
  // form rendered somewhere else in the tree is a different form to React, and
  // remounting it would throw away the very message the visitor came for.
  if (!submitted && (!ready || products === null)) {
    return (
      <p className="border-line bg-surface text-body-sm text-ink-muted flex items-center gap-2 rounded-2xl border p-6">
        <Loader2 aria-hidden="true" className="text-primary size-4 animate-spin" />
        Loading your list…
      </p>
    );
  }

  if (!submitted && lookupFailed) {
    return (
      <p
        role="alert"
        className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm rounded-lg border p-4"
      >
        We could not load your list just now. Please refresh the page.
      </p>
    );
  }

  if (!submitted && lines.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList aria-hidden="true" className="size-6" />}
        title="Your quotation list is empty"
        description="Add products from the catalogue with “Add to quote”, then send them to us as one request. Not sure what you need yet? Send a general enquiry instead."
        action={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/products" className={buttonStyles({})}>
              Browse products
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <Link href="/contact" className={buttonStyles({ variant: "outline" })}>
              <MessageSquareText aria-hidden="true" className="size-4" />
              General enquiry
            </Link>
          </div>
        }
      />
    );
  }

  const totalUnits = available.reduce((sum, row) => sum + row.line.quantity, 0);

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-12">
      {submitted ? null : (
        <section aria-labelledby="rfq-list" className="flex min-w-0 flex-col gap-4 lg:col-span-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="rfq-list" className="text-h3 text-ink">
                Selected equipment
              </h2>
              <p className="text-body-sm text-ink-muted">
                {lines.length} product{lines.length === 1 ? "" : "s"}
                {totalUnits > 0 ? ` · ${totalUnits} unit${totalUnits === 1 ? "" : "s"} in total` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {confirmClear ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      clear();
                      setConfirmClear(false);
                    }}
                    className={buttonStyles({ variant: "outline", size: "sm" })}
                  >
                    <Trash2 aria-hidden="true" className="text-danger-700 size-4" />
                    Clear all items
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="text-body-sm text-ink-muted hover:text-ink px-2 py-1.5 transition-colors"
                  >
                    Keep
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="text-body-sm text-ink-muted hover:text-danger-700 inline-flex items-center gap-1.5 px-2 py-1.5 transition-colors"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  Clear list
                </button>
              )}
            </div>
          </div>

          <ul className="flex flex-col gap-3">
            {rows.map(({ line, product }) => (
              <li
                key={line.productId}
                className={cn(
                  "bg-surface-panel flex flex-col gap-5 rounded-xl p-4 sm:p-5",
                  product ? null : "bg-surface-pearl shadow-none",
                )}
              >
                <div className="flex items-start gap-4">
                  {product?.image ? (
                    <img
                      src={product.image.url}
                      alt={product.image.alt}
                      loading="lazy"
                      className="border-line bg-surface-pearl size-20 shrink-0 rounded-xl border object-contain p-1.5 sm:size-24"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="border-line bg-surface-pearl text-ink-subtle flex size-20 shrink-0 items-center justify-center rounded-xl border sm:size-24"
                    >
                      <Package className="size-6" />
                    </span>
                  )}

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {product ? (
                      <>
                        {product.categoryName ? (
                          <span className="text-caption text-primary font-semibold tracking-[0.1em] uppercase">
                            {product.categoryName}
                          </span>
                        ) : null}
                        <Link
                          href={`/products/${product.slug}`}
                          className="text-body text-ink hover:text-primary font-semibold transition-colors"
                        >
                          {product.name}
                        </Link>
                        {product.brandName || product.modelNumber ? (
                          <span className="text-caption text-ink-subtle">
                            {[product.brandName, product.modelNumber].filter(Boolean).join(" · ")}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <span className="text-body text-ink-muted font-semibold">
                          No longer available
                        </span>
                        <span className="text-caption text-ink-subtle">
                          This product has been withdrawn and will not be sent with
                          your request.
                        </span>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(line.productId)}
                    className="text-ink-subtle hover:bg-danger-50 hover:text-danger-700 -m-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                    <span className="sr-only">
                      Remove {product ? product.name : "this product"}
                    </span>
                  </button>
                </div>

                {product ? (
                  <div className="border-line grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-5">
                    <QuantityStepper
                      productName={product.name}
                      value={line.quantity}
                      onChange={(quantity) => setQuantity(line.productId, quantity)}
                    />
                    <Field
                      label="Notes for this product"
                      help="Configuration, accessories, a delivery date — anything that affects the quote."
                    >
                      {(control) => (
                        <Textarea
                          rows={2}
                          maxLength={500}
                          value={line.notes}
                          onChange={(event) =>
                            setNotes(line.productId, event.target.value)
                          }
                          {...control}
                        />
                      )}
                    </Field>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          <Link
            href="/products"
            className="text-body-sm text-primary inline-flex items-center gap-1.5 self-start font-semibold"
          >
            <Plus aria-hidden="true" className="size-4" />
            Add more products
          </Link>
        </section>
      )}

      {available.length === 0 && !submitted ? (
        <div className="border-line bg-surface-pearl rounded-2xl border p-6 lg:col-span-5">
          <p className="text-body-sm text-ink-muted">
            Nothing on your list is still available to quote.{" "}
            <Link href="/products" className="text-primary underline underline-offset-4">
              Browse products
            </Link>{" "}
            or{" "}
            <Link href="/contact" className="text-primary underline underline-offset-4">
              send a general enquiry
            </Link>
            .
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "border-ink/80 min-w-0 border-t pt-6 sm:pt-8",
            submitted
              ? "lg:col-span-8 lg:col-start-3 sm:p-10"
              : "lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:col-span-5",
          )}
        >
          {submitted ? null : (
            <div className="mb-6 flex flex-col gap-1.5">
              <span className="eyebrow">Your details</span>
              <h2 className="text-h3 text-ink">
                Where should we send the quotation?
              </h2>
              <p className="text-body-sm text-ink-muted">
                {available.length === 1
                  ? "One product on this request."
                  : `${available.length} products on this request.`}{" "}
                We reply within one working day.
              </p>
            </div>
          )}

          <EnquiryForm
            action={submitRfqAction}
            // Only the lines still in the catalogue are sent. The server checks
            // them again anyway, but there is no reason to post a line we
            // already know it will drop.
            lines={available.map(({ line }) => ({
              productId: line.productId,
              quantity: line.quantity,
              notes: line.notes,
            }))}
            submitLabel="Send quotation request"
            onDone={() => {
              setSubmitted(true);
              clear();
            }}
          />

          {submitted ? (
            <div className="border-line mt-8 flex flex-col gap-3 border-t pt-6 sm:flex-row">
              <Link href="/products" className={buttonStyles({ variant: "outline" })}>
                Browse more products
              </Link>
              <Link href="/" className={buttonStyles({ variant: "ghost" })}>
                Back to home
              </Link>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * The quantity control: a number field between two step buttons, so a phone
 * user can nudge a quantity without summoning the keyboard, and a tender buyer
 * can still type 120.
 */
function QuantityStepper({
  productName,
  value,
  onChange,
}: {
  productName: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const step =
    "text-ink-muted hover:bg-surface-pearl hover:text-ink flex size-11 items-center justify-center transition-colors disabled:pointer-events-none disabled:opacity-40";

  return (
    <Field label="Quantity">
      {(control) => (
        <div className="border-line-strong focus-within:border-primary focus-within:ring-primary/15 inline-flex h-12 w-fit items-center overflow-hidden rounded-lg border bg-white focus-within:ring-4">
          <button
            type="button"
            className={step}
            onClick={() => onChange(value - 1)}
            disabled={value <= 1}
            aria-label={`Decrease quantity of ${productName}`}
          >
            <Minus aria-hidden="true" className="size-4" />
          </button>
          <input
            type="number"
            min={1}
            max={MAX_QUANTITY}
            step={1}
            inputMode="numeric"
            value={String(value)}
            onChange={(event) => onChange(Number(event.target.value))}
            className="text-body text-ink h-full w-14 [appearance:textfield] border-x-0 bg-transparent text-center font-semibold tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            {...control}
          />
          <button
            type="button"
            className={step}
            onClick={() => onChange(value + 1)}
            disabled={value >= MAX_QUANTITY}
            aria-label={`Increase quantity of ${productName}`}
          >
            <Plus aria-hidden="true" className="size-4" />
          </button>
        </div>
      )}
    </Field>
  );
}

/* eslint-enable @next/next/no-img-element */
