"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, MailCheck } from "lucide-react";

import { Button, Field, Input } from "@/components/ui";
import {
  requestPasswordResetAction,
  type ForgotPasswordState,
} from "@/server/auth/actions";

const INITIAL_STATE: ForgotPasswordState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    INITIAL_STATE,
  );
  // Controlled, so a refused request does not empty the box.
  const [email, setEmail] = useState("");

  if (state.sent) {
    return (
      <div className="flex flex-col gap-5">
        <div
          role="status"
          className="border-success-100 bg-success-50 text-success-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3.5"
        >
          <MailCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            If <strong className="font-semibold">{email}</strong> belongs to an
            active staff account, a link to choose a new password is on its
            way. It works once, for 30 minutes.
          </span>
        </div>
        <p className="text-body-sm text-ink-muted">
          Nothing after a few minutes? Check your spam folder, or ask an
          administrator to reset your password from Staff in the admin.
        </p>
        <Link
          href="/login"
          className="text-body-sm text-primary inline-flex items-center gap-1.5 font-medium hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {state.error ? (
        <div
          role="alert"
          className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3.5"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Field label="Work email" error={state.fieldErrors?.email} required>
        {(props) => (
          <Input
            type="email"
            name="email"
            autoComplete="username"
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            {...props}
          />
        )}
      </Field>

      <Button type="submit" size="lg" block loading={pending}>
        {pending ? "Sending" : "Send reset link"}
      </Button>

      <Link
        href="/login"
        className="text-body-sm text-ink-muted hover:text-ink inline-flex items-center justify-center gap-1.5"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to sign in
      </Link>
    </form>
  );
}
