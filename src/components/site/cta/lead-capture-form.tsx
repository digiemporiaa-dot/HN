"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, Send } from "lucide-react";

import { Button } from "@/components/ui";
import { fieldErrorsFrom } from "@/lib/validation/field-errors";
import { submissionSchema } from "@/lib/cta/fields";
import type { EffectiveCta } from "@/lib/cta/effective";
import { submitCtaLeadAction, type CtaState } from "@/server/cta/actions";
import { LeadContextFields } from "../lead-context";
import { ConsentField, CtaFields, emptyValues, Honeypot, newSubmissionKey } from "./cta-fields";

export type LeadTarget = {
  placement?: string;
  configKey?: string;
  productId?: string;
  documentId?: string;
};

const INITIAL: CtaState = {};

/**
 * The form inside a lead-capture or gated-download popup.
 *
 * Validated here for a quick answer and again on the server, which is the
 * check that counts. A download starts only from the address the server
 * returns after the lead is stored; the page never holds a gated file's
 * address before that.
 */
export function LeadCaptureForm({ cta, target }: { cta: EffectiveCta; target: LeadTarget }) {
  const [state, formAction, pending] = useActionState(submitCtaLeadAction, INITIAL);
  const router = useRouter();
  const [startedAt] = useState(() => String(Date.now()));
  const [submissionKey] = useState(newSubmissionKey);
  const [values, setValues] = useState(emptyValues);
  const [consent, setConsent] = useState(false);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const acted = useRef(false);

  const done = state.reference !== undefined;
  const errors = { ...state.fieldErrors, ...clientErrors };

  useEffect(() => {
    if (!done || acted.current) return;
    acted.current = true;
    if (state.redirectHref) {
      if (state.redirectHref.startsWith("/")) router.push(state.redirectHref);
      else window.location.assign(state.redirectHref);
      return;
    }
    // The grant's address answers with the file as an attachment, so the
    // page stays where it is and the success message stays on screen.
    if (state.downloadUrl && cta.afterSubmit === "DOWNLOAD") window.location.assign(state.downloadUrl);
  }, [done, state.redirectHref, state.downloadUrl, cta.afterSubmit, router]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const parsed = submissionSchema(cta.fields).safeParse({ ...values, consent });
    if (!parsed.success) {
      event.preventDefault();
      setClientErrors(fieldErrorsFrom(parsed.error));
      // Focus the first field the visitor has to fix, once it is marked.
      const form = event.currentTarget;
      requestAnimationFrame(() => form.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    setClientErrors({});
  };

  if (done) {
    return (
      <div role="status" className="flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <span className="bg-success-50 text-success-700 ring-success-100 flex size-11 shrink-0 items-center justify-center rounded-full ring-8">
            <CheckCircle2 aria-hidden="true" className="size-5" />
          </span>
          <div className="flex flex-col gap-1.5">
            <p className="text-body text-ink font-semibold">{cta.successMessage}</p>
            {state.reference ? (
              <p className="text-body-sm text-ink-muted">
                Your reference is <span className="text-ink font-mono font-semibold">{state.reference}</span>.
              </p>
            ) : null}
          </div>
        </div>
        {state.downloadUrl ? (
          <a
            href={state.downloadUrl}
            className="border-line bg-surface hover:border-primary/40 group flex items-center gap-3 rounded-xl border p-4 transition-colors"
          >
            <span className="bg-medical-50 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
              <Download aria-hidden="true" className="size-5" />
            </span>
            <span className="text-body-sm text-ink group-hover:text-primary font-semibold transition-colors">
              {cta.afterSubmit === "DOWNLOAD" ? "Download did not start? Download it here" : "Download your file"}
            </span>
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="kind" value={cta.kind} />
      {target.placement ? <input type="hidden" name="placement" value={target.placement} /> : null}
      {target.configKey ? <input type="hidden" name="configKey" value={target.configKey} /> : null}
      {target.productId ? <input type="hidden" name="productId" value={target.productId} /> : null}
      {target.documentId ? <input type="hidden" name="documentId" value={target.documentId} /> : null}
      <input type="hidden" name="submissionKey" value={submissionKey} />
      <input type="hidden" name="startedAt" value={startedAt} />
      <LeadContextFields />
      <Honeypot />

      {state.error ? (
        <div role="alert" className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm rounded-lg border p-4">
          {state.error}
        </div>
      ) : null}

      <CtaFields
        settings={cta.fields}
        values={values}
        errors={errors}
        onChange={(key, value) => {
          setValues((current) => ({ ...current, [key]: value }));
          if (clientErrors[key]) setClientErrors(({ [key]: _gone, ...rest }) => rest);
        }}
      />

      <ConsentField
        text={cta.consentText}
        privacyHref={cta.privacyHref}
        checked={consent}
        error={errors.consent}
        onChange={(checked) => {
          setConsent(checked);
          if (clientErrors.consent) setClientErrors(({ consent: _gone, ...rest }) => rest);
        }}
      />

      <div>
        <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto">
          {cta.popupType === "GATED_DOWNLOAD" ? (
            <Download aria-hidden="true" className="size-4" />
          ) : (
            <Send aria-hidden="true" className="size-4" />
          )}
          {cta.submitLabel}
        </Button>
      </div>
    </form>
  );
}
