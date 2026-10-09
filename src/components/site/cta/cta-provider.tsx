"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { Modal } from "@/components/ui";
import { BuiltForm } from "@/components/site/built-form";
import { submitFormAction } from "@/server/forms/submit";
import type { ClientForm } from "@/server/forms/service";
import { effectiveCta, opensPopup, type EffectiveCta, type PublicCtaConfig } from "@/lib/cta/effective";
import { isDownloadKind, type CtaKind } from "@/lib/cta/kinds";
import { resolveCta } from "@/lib/cta/resolve";
import { useQuoteBasket } from "../quote-basket";
import { emptyValues, newSubmissionKey } from "./cta-fields";
import { LeadCaptureForm } from "./lead-capture-form";
import { QuoteRequestFlow, type QuoteDraft } from "./quote-request";

/**
 * The one controller behind every configurable button on the public site.
 *
 * A button says what it is (its kind and stable placement) and what it sits
 * beside (a product, a document); it never decides what to ask. The
 * controller resolves the live configuration, then opens the single shared
 * dialog — always a centered modal — or acts straight away. With no
 * configuration a button keeps its built-in behaviour, so nothing changes on
 * the site until an administrator configures something.
 */
export type CtaRequest = {
  kind: CtaKind;
  /** A stable placement id from src/lib/cta/placements.ts. */
  placement?: string;
  /** A configuration chosen explicitly (page-builder buttons). */
  configKey?: string;
  productId?: string;
  productName?: string;
  documentId?: string;
  documentTitle?: string;
  /** The document is released only after the form. */
  gated?: boolean;
  /** Where the button goes without a popup: a file or a page. */
  href?: string | null;
  /** A page-builder button's override of the configuration's popup-or-direct choice. */
  mode?: "POPUP" | "DIRECT";
};

type Payload = { configs: PublicCtaConfig[]; forms: Record<string, ClientForm> };
const EMPTY: Payload = { configs: [], forms: {} };

type Active =
  | { type: "lead"; cta: EffectiveCta; request: CtaRequest }
  | { type: "form"; cta: EffectiveCta; request: CtaRequest; form: ClientForm }
  | { type: "quote"; cta: EffectiveCta; request: CtaRequest; notice: string | null };

type Controller = {
  trigger: (request: CtaRequest) => void;
  /** The effective configuration for a button, for components that render it. */
  resolve: (request: CtaRequest) => EffectiveCta;
  quoteDraft: QuoteDraft;
  setQuoteDraft: (draft: QuoteDraft) => void;
  resetQuoteDraft: () => void;
  ready: boolean;
};

const CtaContext = createContext<Controller | null>(null);

/** The controller, or null outside the public site (an admin preview). */
export function useCta(): Controller | null {
  return useContext(CtaContext);
}

const freshDraft = (): QuoteDraft => ({ values: emptyValues(), consent: false, submissionKey: newSubmissionKey() });

function navigate(href: string, router: ReturnType<typeof useRouter>, newTab = false) {
  if (newTab) {
    window.open(href, "_blank", "noopener");
    return;
  }
  if (href.startsWith("/") && !href.startsWith("//")) router.push(href);
  else window.location.assign(href);
}

export function CtaProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const basket = useQuoteBasket();
  const [payload, setPayload] = useState<Payload | null>(null);
  const loading = useRef<Promise<Payload> | null>(null);
  const [active, setActive] = useState<Active | null>(null);
  const [open, setOpen] = useState(false);
  // Each opening is a fresh dialog, so a submitted form does not greet the
  // next press with its old success message.
  const [opening, setOpening] = useState(0);
  const show = useCallback((next: Active) => {
    setActive(next);
    setOpening((count) => count + 1);
    setOpen(true);
  }, []);
  const [quoteDraft, setQuoteDraft] = useState<QuoteDraft>(() => ({ values: {}, consent: false, submissionKey: "" }));

  // The submission key needs crypto, which the server render does not have.
  useEffect(() => {
    setQuoteDraft((current) => (current.submissionKey ? current : freshDraft()));
  }, []);

  const load = useCallback((): Promise<Payload> => {
    if (!loading.current) {
      loading.current = fetch("/api/public/cta", { credentials: "same-origin" })
        .then((response) => (response.ok ? (response.json() as Promise<Payload>) : EMPTY))
        .catch(() => EMPTY)
        .then((data) => {
          const safe = { configs: Array.isArray(data.configs) ? data.configs : [], forms: data.forms ?? {} };
          setPayload(safe);
          return safe;
        });
    }
    return loading.current;
  }, []);

  // Fetched once the page is idle, so the first press is usually instant.
  useEffect(() => {
    const start = () => void load();
    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(start, { timeout: 3000 });
      return () => window.cancelIdleCallback(handle);
    }
    const timer = globalThis.setTimeout(start, 1500);
    return () => globalThis.clearTimeout(timer);
  }, [load]);

  const resolveWith = useCallback((data: Payload, request: CtaRequest): EffectiveCta => {
    const config = resolveCta(data.configs, {
      kind: request.kind,
      placement: request.placement ?? null,
      configKey: request.configKey ?? null,
      productId: request.productId ?? null,
      // Resolved during render too (the /rfq page), where there is no window.
      path: typeof window === "undefined" ? "/rfq" : window.location.pathname,
    });
    return effectiveCta(request.kind, config);
  }, []);

  const act = useCallback(
    (data: Payload, request: CtaRequest) => {
      const resolved = resolveWith(data, request);
      const cta = request.mode ? { ...resolved, mode: request.mode } : resolved;

      if (cta.popupType === "REQUEST_QUOTATION") {
        let notice: string | null = null;
        if (request.productId) {
          const name = request.productName ?? "This product";
          if (basket.has(request.productId)) notice = `${name} is already on your list — adjust its quantity below.`;
          else if (basket.lines.length >= 50) notice = "Your list is full. Remove a product to add another.";
          else {
            basket.add(request.productId);
            notice = `${name} has been added to your list.`;
          }
        }
        if (cta.mode === "DIRECT") {
          navigate(cta.directHref || request.href || "/rfq", router);
          return;
        }
        show({ type: "quote", cta, request, notice });
        return;
      }

      if (!opensPopup(cta, { gatedDocument: request.gated })) {
        const download = isDownloadKind(request.kind);
        const target = download ? (request.href ?? cta.fileHref) : (cta.directHref ?? request.href);
        if (target) navigate(target, router, download);
        return;
      }

      // A catalogue popup with no file to release would take details for
      // nothing: the button does nothing rather than mislead.
      if (request.kind === "DOWNLOAD_CATALOGUE" && !cta.hasFile) {
        if (request.href) navigate(request.href, router);
        return;
      }

      if (cta.popupType === "CUSTOM_FORM") {
        const form = cta.formKey ? data.forms[cta.formKey] : undefined;
        if (form) {
          show({ type: "form", cta, request, form });
          return;
        }
      }

      show({ type: "lead", cta: cta.popupType === "CUSTOM_FORM" ? { ...cta, popupType: "LEAD_CAPTURE" } : cta, request });
    },
    [basket, resolveWith, router, show],
  );

  const trigger = useCallback(
    (request: CtaRequest) => {
      if (payload) act(payload, request);
      else {
        // Not loaded yet: wait briefly, then fall back to built-in behaviour.
        const timeout = new Promise<Payload>((resolve) => window.setTimeout(() => resolve(EMPTY), 2500));
        void Promise.race([load(), timeout]).then((data) => act(data, request));
      }
    },
    [payload, act, load],
  );

  const resolve = useCallback((request: CtaRequest) => resolveWith(payload ?? EMPTY, request), [payload, resolveWith]);
  const close = useCallback(() => setOpen(false), []);
  const resetQuoteDraft = useCallback(() => setQuoteDraft(freshDraft()), []);

  const value = useMemo<Controller>(
    () => ({ trigger, resolve, quoteDraft, setQuoteDraft, resetQuoteDraft, ready: payload !== null }),
    [trigger, resolve, quoteDraft, resetQuoteDraft, payload],
  );

  const description = active
    ? active.request.documentTitle && active.type === "lead"
      ? `${active.request.documentTitle}. ${active.cta.description}`.trim()
      : active.cta.description
    : undefined;

  return (
    <CtaContext.Provider value={value}>
      {children}
      {active ? (
        <Modal
          key={opening}
          open={open}
          onClose={close}
          title={active.cta.heading}
          description={description || undefined}
          size={active.type === "quote" ? "xl" : "md"}
        >
          {active.type === "quote" ? (
            <QuoteRequestFlow
              cta={active.cta}
              placement={active.request.placement}
              configKey={active.request.configKey}
              draft={quoteDraft}
              onDraftChange={setQuoteDraft}
              onSent={() => {
                basket.clear();
                // Nothing personal is kept once it has been sent.
                setQuoteDraft(freshDraft());
              }}
              onClose={close}
              notice={active.notice}
            />
          ) : active.type === "form" ? (
            <BuiltForm form={active.form} action={submitFormAction} compact ctaKey={active.cta.key ?? undefined} ctaPlacement={active.request.placement} />
          ) : (
            <LeadCaptureForm
              cta={active.cta}
              target={{
                placement: active.request.placement,
                configKey: active.request.configKey,
                productId: active.request.productId,
                documentId: active.request.documentId,
              }}
            />
          )}
        </Modal>
      ) : null}
    </CtaContext.Provider>
  );
}
