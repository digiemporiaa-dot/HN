"use client";

import { useActionState, useState } from "react";
import { AlertCircle, ShieldCheck } from "lucide-react";

import { Button, Field, Input } from "@/components/ui";
import { loginAction, type LoginState } from "@/server/auth/actions";

const INITIAL_STATE: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    INITIAL_STATE,
  );

  /*
   * Controlled on purpose. React 19 resets an uncontrolled form once its action
   * completes, which would wipe the email and password before the two-factor
   * step re-submits them, and the sign-in would silently fail validation
   * instead of verifying the code.
   */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const awaitingCode = Boolean(state.requiresTwoFactor);

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

      {awaitingCode ? (
        <div className="border-line bg-surface-subtle text-ink-muted text-body-sm flex items-start gap-2.5 rounded-md border p-3.5">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            Enter the 6-digit code from your authenticator app, or one of your
            recovery codes.
          </span>
        </div>
      ) : null}

      {/*
        Both fields stay mounted through the second step, so all three values
        post together and the password is never held anywhere but this form.
      */}
      <Field
        label="Work email"
        error={state.fieldErrors?.email}
        required
        className={awaitingCode ? "hidden" : undefined}
      >
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

      <Field
        label="Password"
        error={state.fieldErrors?.password}
        required
        className={awaitingCode ? "hidden" : undefined}
      >
        {(props) => (
          <Input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            {...props}
          />
        )}
      </Field>

      <Field
        label="Authentication code"
        error={state.fieldErrors?.code}
        required={awaitingCode}
        className={awaitingCode ? undefined : "hidden"}
      >
        {(props) => (
          <Input
            type="text"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus={awaitingCode}
            placeholder="123456"
            {...props}
          />
        )}
      </Field>

      <Button type="submit" size="lg" block loading={pending}>
        {pending ? "Signing in" : awaitingCode ? "Verify and sign in" : "Sign in"}
      </Button>
    </form>
  );
}
