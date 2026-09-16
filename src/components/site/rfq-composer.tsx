"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, Loader2, Trash2 } from "lucide-react";

import {
  buttonStyles,
  EmptyState,
  Field,
  Input,
  Textarea,
} from "@/components/ui";
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
      <p className="text-body-sm text-ink-muted flex items-center gap-2">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        Loading your list…
      </p>
    );
  }

  if (!submitted && lookupFailed) {
    return (
      <p
        role="alert"
        className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm rounded-md border p-3.5"
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
        description="Add products from the catalogue and send them to us as one request."
        action={
          <Link href="/products" className={buttonStyles({})}>
            Browse products
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {submitted ? null : (
        <ul className="border-line divide-line divide-y rounded-lg border">
          {rows.map(({ line, product }) => (
            <li
              key={line.productId}
              className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start"
            >
              {product?.image ? (
                <img
                  src={product.image.url}
                  alt={product.image.alt}
                  loading="lazy"
                  className="bg-surface-muted size-20 shrink-0 rounded-md object-contain"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="bg-surface-muted size-20 shrink-0 rounded-md"
                />
              )}

              <div className="flex flex-1 flex-col gap-3">
                {product ? (
                  <div className="flex flex-col gap-0.5">
                    <Link
                      href={`/products/${product.slug}`}
                      className="text-body text-ink hover:text-primary font-medium transition-colors"
                    >
                      {product.name}
                    </Link>
                    <span className="text-caption text-ink-subtle">
                      {[product.brandName, product.modelNumber]
                        .filter(Boolean)
                        .join(" · ") || product.categoryName}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-body text-ink-muted font-medium">
                      No longer available
                    </span>
                    <span className="text-caption text-ink-subtle">
                      This product has been withdrawn and will not be sent with
                      your request.
                    </span>
                  </div>
                )}

                {product ? (
                  <div className="grid gap-3 sm:grid-cols-[7rem_1fr]">
                    <Field label="Quantity">
                      {(control) => (
                        <Input
                          type="number"
                          min={1}
                          max={MAX_QUANTITY}
                          step={1}
                          inputMode="numeric"
                          value={String(line.quantity)}
                          onChange={(event) =>
                            setQuantity(
                              line.productId,
                              Number(event.target.value),
                            )
                          }
                          {...control}
                        />
                      )}
                    </Field>

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
              </div>

              <button
                type="button"
                onClick={() => remove(line.productId)}
                // Labelled at every width. A bare icon at the end of a stacked
                // row on a phone is a control nobody is sure of pressing.
                className="text-body-sm text-ink-muted hover:text-danger-700 inline-flex shrink-0 items-center gap-1.5 self-end transition-colors sm:self-start"
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Remove
                <span className="sr-only">
                  {product ? product.name : "this product"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {available.length === 0 && !submitted ? (
        <p className="text-body-sm text-ink-muted">
          Nothing on your list is still available to quote.{" "}
          <Link href="/products" className="text-primary underline">
            Browse products
          </Link>
          .
        </p>
      ) : (
        <div className={submitted ? undefined : "border-line border-t pt-8"}>
          {submitted ? null : (
            <>
              <h2 className="text-h4 text-ink font-display mb-1">
                Where should we send the quotation?
              </h2>
              <p className="text-body-sm text-ink-muted mb-6">
                {available.length === 1
                  ? "One product on this request."
                  : `${available.length} products on this request.`}{" "}
                We reply within one working day.
              </p>
            </>
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
            <p className="text-body-sm text-ink-muted mt-6">
              <Link href="/products" className="text-primary underline">
                Browse more products
              </Link>{" "}
              to start another list.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* eslint-enable @next/next/no-img-element */
