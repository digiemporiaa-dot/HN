"use client";

import { useActionState, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Minus,
  Package,
  Plus,
  Search,
  Send,
  Trash2,
} from "lucide-react";

import { Button, buttonStyles, Field, Input, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { fieldErrorsFrom } from "@/lib/validation/field-errors";
import { FIELD_DEFINITIONS, submissionSchema } from "@/lib/cta/fields";
import type { EffectiveCta } from "@/lib/cta/effective";
import { MAX_QUANTITY, MAX_RFQ_LINES } from "@/lib/validation/rfq";
import type { QuoteLineProduct } from "@/server/products/public";
import { lookupQuoteLinesAction } from "@/server/rfq/actions";
import { searchQuoteProductsAction, submitQuotationAction, type QuoteState } from "@/server/quotes/actions";
import { useQuoteBasket } from "../quote-basket";
import { LeadContextFields } from "../lead-context";
import { ConsentField, CtaFields, Honeypot } from "./cta-fields";

/* eslint-disable @next/next/no-img-element -- catalogue images are served from
   our own media route at their stored size. */

/**
 * What the visitor has typed, held in memory by the controller so closing and
 * reopening the modal keeps it. Never written to storage: the basket in
 * localStorage holds product ids, quantities and notes, and nothing personal.
 */
export type QuoteDraft = {
  values: Record<string, string>;
  consent: boolean;
  /** One per request being built; a new one once a request is sent. */
  submissionKey: string;
};

type Step = "items" | "details" | "review";
const STEPS: Array<{ id: Step; label: string }> = [
  { id: "items", label: "Products" },
  { id: "details", label: "Your details" },
  { id: "review", label: "Review & send" },
];

const INITIAL: QuoteState = {};

export function QuoteRequestFlow({
  cta,
  placement,
  configKey,
  draft,
  onDraftChange,
  onSent,
  onClose,
  notice,
  layout = "modal",
}: {
  cta: EffectiveCta;
  placement?: string;
  configKey?: string;
  draft: QuoteDraft;
  onDraftChange: (draft: QuoteDraft) => void;
  /** Called once the request is stored. */
  onSent: () => void;
  /** Modal only: closes it. */
  onClose?: () => void;
  /** A message for the top of the list, such as "already on your list". */
  notice?: string | null;
  layout?: "modal" | "page";
}) {
  const basket = useQuoteBasket();
  const router = useRouter();
  const [step, setStep] = useState<Step>("items");
  const [state, formAction, pending] = useActionState(submitQuotationAction, INITIAL);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [startedAt] = useState(() => String(Date.now()));
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Products known to the page: from the lookup of the basket's ids and from
  // search results, so adding from a search needs no second round trip.
  const [known, setKnown] = useState<Map<string, QuoteLineProduct>>(new Map());
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [lookupFailed, setLookupFailed] = useState(false);
  const remember = (products: QuoteLineProduct[]) =>
    setKnown((current) => {
      const next = new Map(current);
      for (const product of products) next.set(product.id, product);
      return next;
    });

  const unknownIds = basket.lines
    .map((line) => line.productId)
    .filter((id) => !known.has(id) && !missing.has(id));
  const unknownKey = unknownIds.join(",");

  useEffect(() => {
    if (!basket.ready || !unknownKey) return;
    let cancelled = false;
    const ids = unknownKey.split(",");
    setLookupFailed(false);
    lookupQuoteLinesAction(ids)
      .then((products) => {
        if (cancelled) return;
        remember(products);
        const found = new Set(products.map((product) => product.id));
        setMissing((current) => new Set([...current, ...ids.filter((id) => !found.has(id))]));
      })
      .catch(() => {
        if (!cancelled) setLookupFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [basket.ready, unknownKey]);

  const rows = basket.lines.map((line) => ({ line, product: known.get(line.productId) ?? null }));
  const available = rows.filter((row) => row.product !== null);
  const loading = !basket.ready || (unknownIds.length > 0 && !lookupFailed);
  const units = available.reduce((sum, row) => sum + row.line.quantity, 0);

  const errors = { ...state.fieldErrors, ...clientErrors };
  const sent = state.reference !== undefined;
  const reported = useRef(false);

  useEffect(() => {
    if (!sent || reported.current) return;
    reported.current = true;
    onSent();
    if (state.redirectHref) {
      if (state.redirectHref.startsWith("/")) router.push(state.redirectHref);
      else window.location.assign(state.redirectHref);
    }
  }, [sent, state.redirectHref, onSent, router]);

  // A server refusal of a field sends the visitor back to the field.
  useEffect(() => {
    if (state.fieldErrors && Object.keys(state.fieldErrors).some((key) => key !== "consent")) setStep("details");
  }, [state.fieldErrors]);

  const go = (next: Step) => {
    setStep(next);
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const setValue = (key: string, value: string) => {
    onDraftChange({ ...draft, values: { ...draft.values, [key]: value } });
    if (clientErrors[key]) setClientErrors(({ [key]: _gone, ...rest }) => rest);
  };

  const detailsErrors = () => {
    const parsed = submissionSchema(cta.fields).safeParse({ ...draft.values, consent: true });
    return parsed.success ? {} : fieldErrorsFrom(parsed.error);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const parsed = submissionSchema(cta.fields).safeParse({ ...draft.values, consent: draft.consent });
    if (!parsed.success) {
      event.preventDefault();
      const found = fieldErrorsFrom(parsed.error);
      setClientErrors(found);
      if (Object.keys(found).some((key) => key !== "consent")) go("details");
    }
  };

  if (sent) {
    return (
      <div role="status" className="flex flex-col gap-6 py-2">
        <div className="flex items-start gap-4">
          <span className="bg-success-50 text-success-700 ring-success-100 flex size-12 shrink-0 items-center justify-center rounded-full ring-8">
            <CheckCircle2 aria-hidden="true" className="size-6" />
          </span>
          <div className="flex flex-col gap-2">
            <p className="text-h4 text-ink">{cta.successMessage}</p>
            <p className="text-body-sm text-ink-muted max-w-[52ch]">
              We have emailed you a confirmation. This is a request for a quotation: no order has been placed and
              nothing is charged.
            </p>
            {state.reference ? (
              <span className="border-line bg-surface-pearl text-body-sm text-ink mt-1 inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-1.5">
                <span className="text-ink-subtle">Reference</span>
                <span className="font-mono font-semibold tracking-wide">{state.reference}</span>
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          {onClose ? (
            <Button type="button" onClick={onClose}>
              Continue browsing
            </Button>
          ) : (
            <Link href="/products" className={buttonStyles({})}>
              Browse more products
            </Link>
          )}
        </div>
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((entry) => entry.id === step);
  const navClass =
    layout === "modal"
      ? "bg-surface border-line sticky -bottom-6 -mx-6 -mb-6 mt-2 flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4"
      : "border-line mt-2 flex flex-wrap items-center justify-between gap-3 border-t pt-5";

  return (
    <div className="flex flex-col gap-5">
      <ol aria-label="Steps" className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {STEPS.map((entry, index) => (
          <li key={entry.id} className="flex items-center gap-2">
            <span
              aria-current={entry.id === step ? "step" : undefined}
              className={cn(
                "text-caption inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold",
                index === stepIndex
                  ? "bg-ink text-white"
                  : index < stepIndex
                    ? "bg-surface-panel text-ink"
                    : "text-ink-subtle",
              )}
            >
              {index < stepIndex ? <Check aria-hidden="true" className="size-3.5" /> : <span aria-hidden="true">{index + 1}</span>}
              {entry.label}
            </span>
            {index < STEPS.length - 1 ? <span aria-hidden="true" className="bg-line h-px w-4" /> : null}
          </li>
        ))}
      </ol>

      <h3 ref={headingRef} tabIndex={-1} className="text-body text-ink font-semibold outline-none">
        {step === "items"
          ? `Your list — ${basket.lines.length} ${basket.lines.length === 1 ? "product" : "products"}${units ? `, ${units} ${units === 1 ? "unit" : "units"}` : ""}`
          : step === "details"
            ? "Where should we send the quotation?"
            : "Check your request"}
      </h3>

      {step === "items" ? (
        <>
          {notice ? (
            <p role="status" className="border-line bg-surface-pearl text-body-sm text-ink rounded-lg border px-4 py-3">
              {notice}
            </p>
          ) : null}
          <ProductSearch onFound={remember} />
          {lookupFailed ? (
            <p role="alert" className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm rounded-lg border p-4">
              We could not load your list just now. Please try again in a moment.
            </p>
          ) : loading ? (
            <p className="text-body-sm text-ink-muted flex items-center gap-2 py-4">
              <Loader2 aria-hidden="true" className="text-primary size-4 animate-spin" />
              Loading your list…
            </p>
          ) : rows.length === 0 ? (
            <p className="border-line text-body-sm text-ink-muted rounded-xl border border-dashed p-6 text-center">
              Your list is empty. Search above to add products, or{" "}
              <Link href="/products" className="text-primary underline underline-offset-4" onClick={onClose}>
                browse the catalogue
              </Link>
              .
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {rows.map(({ line, product }) => (
                <LineEditor
                  key={line.productId}
                  product={product}
                  quantity={line.quantity}
                  notes={line.notes}
                  onQuantity={(quantity) => basket.setQuantity(line.productId, quantity)}
                  onNotes={(notes) => basket.setNotes(line.productId, notes)}
                  onRemove={() => basket.remove(line.productId)}
                />
              ))}
            </ul>
          )}
          <div className={navClass}>
            <p className="text-body-sm text-ink-muted">
              {available.length} {available.length === 1 ? "product" : "products"} · {units} {units === 1 ? "unit" : "units"}
            </p>
            <Button type="button" onClick={() => go("details")} disabled={available.length === 0 || loading}>
              Continue
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </>
      ) : null}

      {step === "details" ? (
        <>
          <CtaFields settings={cta.fields} values={draft.values} errors={errors} onChange={setValue} />
          <div className={navClass}>
            <Button type="button" variant="ghost" onClick={() => go("items")}>
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back
            </Button>
            <Button
              type="button"
              onClick={() => {
                const found = detailsErrors();
                setClientErrors(found);
                if (Object.keys(found).length === 0) go("review");
              }}
            >
              Review request
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </>
      ) : null}

      {step === "review" ? (
        <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <input type="hidden" name="lines" value={JSON.stringify(available.map(({ line }) => line))} />
          {Object.entries(draft.values).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
          {placement ? <input type="hidden" name="placement" value={placement} /> : null}
          {configKey ? <input type="hidden" name="configKey" value={configKey} /> : null}
          <input type="hidden" name="submissionKey" value={draft.submissionKey} />
          <input type="hidden" name="startedAt" value={startedAt} />
          <LeadContextFields />
          <Honeypot />

          {state.error ? (
            <div role="alert" className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm rounded-lg border p-4">
              {state.error}
            </div>
          ) : null}

          <section aria-label="Products" className="border-line rounded-xl border">
            <ul className="divide-line divide-y">
              {available.map(({ line, product }) => (
                <li key={line.productId} className="flex flex-col gap-1 px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-body-sm text-ink font-semibold break-words">{product!.name}</span>
                    <span className="text-body-sm text-ink shrink-0 font-semibold tabular-nums">× {line.quantity}</span>
                  </div>
                  {product!.modelNumber ? <span className="text-caption text-ink-subtle">Model {product!.modelNumber}</span> : null}
                  {line.notes ? <span className="text-caption text-ink-muted break-words whitespace-pre-line">{line.notes}</span> : null}
                </li>
              ))}
            </ul>
            <p className="border-line text-body-sm text-ink-muted border-t px-4 py-2.5">
              {available.length} {available.length === 1 ? "product" : "products"}, {units} {units === 1 ? "unit" : "units"}
            </p>
          </section>

          <dl className="text-body-sm grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-[11rem_1fr]">
            {[
              ["Full name", draft.values.name],
              ["Email", draft.values.email],
              ...cta.fields
                .filter((setting) => setting.enabled)
                .map((setting) => [FIELD_DEFINITIONS[setting.key].label, draft.values[setting.key]] as const),
            ].map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-ink-muted">{label}</dt>
                <dd className="text-ink break-words whitespace-pre-line">{value || "—"}</dd>
              </div>
            ))}
          </dl>

          <ConsentField
            text={cta.consentText}
            privacyHref={cta.privacyHref}
            checked={draft.consent}
            error={errors.consent}
            onChange={(checked) => {
              onDraftChange({ ...draft, consent: checked });
              if (clientErrors.consent) setClientErrors(({ consent: _gone, ...rest }) => rest);
            }}
          />

          <div className={navClass}>
            <Button type="button" variant="ghost" onClick={() => go("details")} disabled={pending}>
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back
            </Button>
            <Button type="submit" loading={pending}>
              <Send aria-hidden="true" className="size-4" />
              {cta.submitLabel}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

/** Search the catalogue and add to the list. */
function ProductSearch({ onFound }: { onFound: (products: QuoteLineProduct[]) => void }) {
  const basket = useQuoteBasket();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QuoteLineProduct[] | null>(null);
  const [searching, setSearching] = useState(false);
  const listId = useId();
  const full = basket.lines.length >= MAX_RFQ_LINES;

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setResults(null);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(() => {
      searchQuoteProductsAction(text)
        .then((found) => {
          if (cancelled) return;
          setResults(found);
          onFound(found);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // onFound is stable in intent; re-running on its identity would search twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="flex flex-col gap-2">
      <Field label="Add products" help="Search by product name, model number or brand.">
        {(control) => (
          <div className="relative">
            <Search aria-hidden="true" className="text-ink-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. ventilator"
              className="pl-9"
              autoComplete="off"
              aria-controls={listId}
              {...control}
            />
          </div>
        )}
      </Field>
      <div id={listId} aria-live="polite">
        {searching ? (
          <p className="text-caption text-ink-muted flex items-center gap-2 py-1">
            <Loader2 aria-hidden="true" className="size-3.5 animate-spin" /> Searching…
          </p>
        ) : results && results.length === 0 ? (
          <p className="text-caption text-ink-muted py-1">No products match “{query.trim()}”.</p>
        ) : results ? (
          <ul className="border-line divide-line max-h-60 divide-y overflow-y-auto rounded-xl border">
            {results.map((product) => {
              const added = basket.has(product.id);
              return (
                <li key={product.id} className="flex items-center gap-3 px-3 py-2">
                  <Thumb product={product} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="text-body-sm text-ink block truncate font-medium">{product.name}</span>
                    <span className="text-caption text-ink-subtle block truncate">
                      {[product.brandName, product.modelNumber].filter(Boolean).join(" · ") || product.categoryName}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => basket.add(product.id)}
                    disabled={added || full}
                    className={cn(
                      buttonStyles({ variant: "outline", size: "sm" }),
                      "h-8 shrink-0 px-2.5",
                      added && "border-success-600/40 text-success-700",
                    )}
                  >
                    {added ? <Check aria-hidden="true" className="size-3.5" /> : <Plus aria-hidden="true" className="size-3.5" />}
                    {added ? "On your list" : full ? "List full" : "Add"}
                    <span className="sr-only">: {product.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function Thumb({ product, size = "md" }: { product: QuoteLineProduct | null; size?: "sm" | "md" }) {
  const box = size === "sm" ? "size-10 rounded-lg" : "size-16 rounded-xl sm:size-20";
  return product?.image ? (
    <img
      src={product.image.url}
      alt=""
      loading="lazy"
      className={cn("border-line bg-surface-pearl shrink-0 border object-contain p-1", box)}
    />
  ) : (
    <span aria-hidden="true" className={cn("border-line bg-surface-pearl text-ink-subtle flex shrink-0 items-center justify-center border", box)}>
      <Package className="size-5" />
    </span>
  );
}

function LineEditor({
  product,
  quantity,
  notes,
  onQuantity,
  onNotes,
  onRemove,
}: {
  product: QuoteLineProduct | null;
  quantity: number;
  notes: string;
  onQuantity: (value: number) => void;
  onNotes: (value: string) => void;
  onRemove: () => void;
}) {
  const name = product?.name ?? "this product";
  const step =
    "text-ink-muted hover:bg-surface-pearl hover:text-ink flex size-10 items-center justify-center transition-colors disabled:pointer-events-none disabled:opacity-40";
  const quantityId = useId();
  const meta = useMemo(
    () => (product ? [product.brandName, product.modelNumber].filter(Boolean).join(" · ") : ""),
    [product],
  );

  return (
    <li className={cn("bg-surface-panel flex flex-col gap-4 rounded-xl p-4", !product && "bg-surface-pearl")}>
      <div className="flex items-start gap-3">
        <Thumb product={product} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {product ? (
            <>
              <span className="text-caption text-primary font-semibold tracking-[0.08em] uppercase">{product.categoryName}</span>
              <span className="text-body-sm text-ink font-semibold break-words">{product.name}</span>
              {meta ? <span className="text-caption text-ink-subtle">{meta}</span> : null}
            </>
          ) : (
            <>
              <span className="text-body-sm text-ink-muted font-semibold">No longer available</span>
              <span className="text-caption text-ink-subtle">This product has been withdrawn and will not be sent.</span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-ink-subtle hover:bg-danger-50 hover:text-danger-700 -m-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors"
        >
          <Trash2 aria-hidden="true" className="size-4" />
          <span className="sr-only">Remove {name}</span>
        </button>
      </div>
      {product ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor={quantityId} className="text-label text-ink font-medium">
              Quantity
            </label>
            <div className="border-line-strong focus-within:border-primary focus-within:ring-primary/15 inline-flex h-11 w-fit items-center overflow-hidden rounded-lg border bg-white focus-within:ring-4">
              <button type="button" className={step} onClick={() => onQuantity(quantity - 1)} disabled={quantity <= 1} aria-label={`Decrease quantity of ${name}`}>
                <Minus aria-hidden="true" className="size-4" />
              </button>
              <input
                id={quantityId}
                type="number"
                min={1}
                max={MAX_QUANTITY}
                step={1}
                inputMode="numeric"
                value={String(quantity)}
                onChange={(event) => onQuantity(Number(event.target.value))}
                className="text-body-sm text-ink h-full w-14 [appearance:textfield] bg-transparent text-center font-semibold tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button type="button" className={step} onClick={() => onQuantity(quantity + 1)} disabled={quantity >= MAX_QUANTITY} aria-label={`Increase quantity of ${name}`}>
                <Plus aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>
          <Field label="Notes for this product" help="Configuration, accessories, specifications — anything that affects the quote.">
            {(control) => (
              <Textarea rows={2} maxLength={500} value={notes} onChange={(event) => onNotes(event.target.value)} {...control} />
            )}
          </Field>
        </div>
      ) : null}
    </li>
  );
}

/* eslint-enable @next/next/no-img-element */
