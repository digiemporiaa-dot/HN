"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Check, ClipboardList, Plus } from "lucide-react";

import { buttonStyles } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import {
  MAX_QUANTITY,
  MAX_RFQ_LINES,
  storedBasketSchema,
} from "@/lib/validation/rfq";

const STORAGE_KEY = "hn.quote-basket.v1";

export type BasketLine = {
  productId: string;
  quantity: number;
  notes: string;
};

type BasketValue = {
  lines: BasketLine[];
  /** False until storage has been read, so the server and client first paint agree. */
  ready: boolean;
  add: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  setNotes: (productId: string, notes: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
  has: (productId: string) => boolean;
};

const BasketContext = createContext<BasketValue | null>(null);

function read(): BasketLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = storedBasketSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data.slice(0, MAX_RFQ_LINES) : [];
  } catch {
    // Private browsing, a full quota, or something that is not our JSON. An
    // empty basket is the right answer to all three.
    return [];
  }
}

/**
 * The quotation basket.
 *
 * Kept in the browser rather than on the server: a visitor building a list is
 * not signed in and has given no consent yet, so putting their shortlist in our
 * database before they have asked us for anything would be collecting data we
 * were not offered. It moves server-side at the moment they submit, which is
 * the moment they decide to.
 */
export function QuoteBasketProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<BasketLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLines(read());
    setReady(true);

    // Two tabs, one basket: a product added in one appears in the other.
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setLines(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: BasketLine[]) => {
    setLines(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage refused. The basket still works for this page view, which is
      // better than the button doing nothing at all.
    }
  }, []);

  const value = useMemo<BasketValue>(
    () => ({
      lines,
      ready,
      has: (productId) => lines.some((line) => line.productId === productId),
      add: (productId) => {
        if (lines.some((line) => line.productId === productId)) return;
        if (lines.length >= MAX_RFQ_LINES) return;
        persist([...lines, { productId, quantity: 1, notes: "" }]);
      },
      setQuantity: (productId, quantity) =>
        persist(
          lines.map((line) =>
            line.productId === productId
              ? {
                  ...line,
                  quantity: Math.min(
                    MAX_QUANTITY,
                    Math.max(1, Math.round(quantity) || 1),
                  ),
                }
              : line,
          ),
        ),
      setNotes: (productId, notes) =>
        persist(
          lines.map((line) =>
            line.productId === productId
              ? { ...line, notes: notes.slice(0, 500) }
              : line,
          ),
        ),
      remove: (productId) =>
        persist(lines.filter((line) => line.productId !== productId)),
      clear: () => persist([]),
    }),
    [lines, ready, persist],
  );

  return (
    <BasketContext.Provider value={value}>{children}</BasketContext.Provider>
  );
}

export function useQuoteBasket(): BasketValue {
  const context = useContext(BasketContext);
  if (!context) {
    throw new Error("useQuoteBasket must be used inside <QuoteBasketProvider>");
  }
  return context;
}

/** Adds one product to the list being quoted. */
export function AddToQuoteButton({
  productId,
  size = "md",
  className,
}: {
  productId: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { add, has, ready, lines } = useQuoteBasket();
  const added = ready && has(productId);
  const full = ready && !added && lines.length >= MAX_RFQ_LINES;

  return (
    <button
      type="button"
      onClick={() => add(productId)}
      disabled={!ready || added || full}
      aria-live="polite"
      className={cn(buttonStyles({ variant: "outline", size }), className)}
    >
      {added ? (
        <>
          <Check aria-hidden="true" className="size-4" />
          On your list
        </>
      ) : (
        <>
          <Plus aria-hidden="true" className="size-4" />
          {full ? "List is full" : "Add to quotation"}
        </>
      )}
    </button>
  );
}

/**
 * The header's link to the list.
 *
 * Renders nothing until storage has been read and nothing when the list is
 * empty: a quotation basket with no products in it is a control that explains
 * itself to nobody.
 */
export function QuoteBasketLink() {
  const { lines, ready } = useQuoteBasket();
  if (!ready || lines.length === 0) return null;

  return (
    <Link
      href="/rfq"
      className="text-body-sm text-ink hover:text-primary inline-flex items-center gap-2 font-medium transition-colors"
    >
      <ClipboardList aria-hidden="true" className="size-4" />
      <span className="hidden sm:inline">Quotation list</span>
      <span className="bg-primary flex size-5 items-center justify-center rounded-full text-[11px] leading-none font-semibold text-white">
        {lines.length}
      </span>
    </Link>
  );
}
