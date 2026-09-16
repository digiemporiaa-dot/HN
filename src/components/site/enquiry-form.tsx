"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Mail } from "lucide-react";

import {
  Button,
  Checkbox,
  Field,
  Input,
  Modal,
  Textarea,
} from "@/components/ui";
import { CONSENT_TEXT } from "@/lib/validation/leads";
import type { RfqLine } from "@/lib/validation/rfq";
import type { EnquiryState } from "@/server/leads/actions";

type EnquiryAction = (
  previous: EnquiryState,
  formData: FormData,
) => Promise<EnquiryState>;

const INITIAL: EnquiryState = {};

/**
 * The enquiry form.
 *
 * Short on purpose. Every extra question costs enquiries, and a name, a way to
 * reply and what they want to know is enough to start the conversation the rest
 * of the form would have been guessing at.
 */
export function EnquiryForm({
  action,
  productId,
  documentId,
  lines,
  submitLabel,
  onDone,
}: {
  action: EnquiryAction;
  productId?: string;
  /** Set when the enquiry is the price of a gated document. */
  documentId?: string;
  /**
   * The quotation list, when this form is sending one.
   *
   * Posted as JSON from the caller's state rather than as named inputs: the
   * quantity and note controls live in the list above the form, outside it, and
   * a control outside a form does not submit with it.
   */
  lines?: RfqLine[];
  submitLabel: string;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  // Stamped on the client at mount: the server measures how long the form was
  // open, and a submission that arrives instantly was not typed by anyone.
  const [startedAt] = useState(() => String(Date.now()));
  /**
   * Held in state rather than left to the DOM.
   *
   * React resets a form once its action returns, so an enquiry the server
   * refuses — a mistyped address, an unticked box — would come back empty and
   * the visitor would have to type the whole thing again. On this form that
   * loses a sales enquiry, not a keystroke.
   */
  const [values, setValues] = useState({
    name: "",
    email: "",
    phone: "",
    organisation: "",
    city: "",
    message: "",
    consent: false,
  });
  const set = (key: keyof typeof values, value: string | boolean) =>
    setValues((current) => ({ ...current, [key]: value }));

  const done = state.reference !== undefined;
  const notified = useRef(false);

  useEffect(() => {
    if (done && !notified.current) {
      notified.current = true;
      onDone?.();
    }
  }, [done, onDone]);

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <div className="border-success-100 bg-success-50 text-success-700 text-body-sm flex items-start gap-2.5 rounded-md border p-4">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <span>
            Thank you — your enquiry has reached our sales team
            {state.reference ? (
              <>
                {" "}
                as <span className="font-medium">{state.reference}</span>
              </>
            ) : null}
            . We normally reply within one working day.
          </span>
        </div>

        {state.downloadUrl ? (
          <a
            href={state.downloadUrl}
            className="border-line bg-surface hover:border-line-strong flex items-center gap-3 rounded-md border p-4 transition-colors"
          >
            <Download
              aria-hidden="true"
              className="text-primary size-5 shrink-0"
            />
            <span className="text-body-sm text-ink font-medium">
              Download your document
            </span>
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {productId ? (
        <input type="hidden" name="productId" value={productId} />
      ) : null}
      {documentId ? (
        <input type="hidden" name="documentId" value={documentId} />
      ) : null}
      {lines ? (
        <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      ) : null}
      <input type="hidden" name="startedAt" value={startedAt} />

      {/* A field no person ever sees. Hidden from assistive technology and
          taken out of the tab order, so filling it in identifies a machine. */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor="website">Do not fill this in</label>
        <input
          id="website"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {state.error ? (
        <div
          role="alert"
          className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm rounded-md border p-3.5"
        >
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" required error={state.fieldErrors?.name}>
          {(control) => (
            <Input
              name="name"
              autoComplete="name"
              value={values.name}
              onChange={(event) => set("name", event.target.value)}
              {...control}
            />
          )}
        </Field>

        <Field label="Email" required error={state.fieldErrors?.email}>
          {(control) => (
            <Input
              name="email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={(event) => set("email", event.target.value)}
              {...control}
            />
          )}
        </Field>

        <Field label="Phone" error={state.fieldErrors?.phone}>
          {(control) => (
            <Input
              name="phone"
              type="tel"
              autoComplete="tel"
              value={values.phone}
              onChange={(event) => set("phone", event.target.value)}
              {...control}
            />
          )}
        </Field>

        <Field
          label="Hospital or organisation"
          error={state.fieldErrors?.organisation}
        >
          {(control) => (
            <Input
              name="organisation"
              autoComplete="organization"
              value={values.organisation}
              onChange={(event) => set("organisation", event.target.value)}
              {...control}
            />
          )}
        </Field>

        <Field
          label="City"
          error={state.fieldErrors?.city}
          className="sm:col-span-2"
        >
          {(control) => (
            <Input
              name="city"
              autoComplete="address-level2"
              value={values.city}
              onChange={(event) => set("city", event.target.value)}
              {...control}
            />
          )}
        </Field>

        <Field
          label="What do you need?"
          help="Quantities, configuration, timelines — whatever helps us quote accurately."
          error={state.fieldErrors?.message}
          className="sm:col-span-2"
        >
          {(control) => (
            <Textarea
              name="message"
              rows={4}
              maxLength={4000}
              value={values.message}
              onChange={(event) => set("message", event.target.value)}
              {...control}
            />
          )}
        </Field>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-body-sm text-ink flex items-start gap-2.5">
          <Checkbox
            name="consent"
            className="mt-0.5"
            checked={values.consent}
            onChange={(event) => set("consent", event.target.checked)}
          />
          <span>{CONSENT_TEXT}</span>
        </label>
        {state.fieldErrors?.consent ? (
          <p className="text-caption text-danger-700">
            {state.fieldErrors.consent}
          </p>
        ) : null}
      </div>

      <div>
        <Button type="submit" size="lg" loading={pending}>
          <Mail aria-hidden="true" className="size-4" />
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** The enquiry form behind a button, for pages that should not open with one. */
export function EnquiryDialog({
  action,
  productId,
  documentId,
  triggerLabel,
  triggerClassName,
  title,
  description,
  submitLabel,
}: {
  action: EnquiryAction;
  productId?: string;
  documentId?: string;
  /** The label and the styling of the button that opens the dialog. Passed as
   *  a class rather than an element so no button ends up inside another. */
  triggerLabel: string;
  triggerClassName: string;
  title: string;
  description: string;
  submitLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        {triggerLabel}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        size="lg"
      >
        <EnquiryForm
          action={action}
          productId={productId}
          documentId={documentId}
          submitLabel={submitLabel}
        />
      </Modal>
    </>
  );
}
