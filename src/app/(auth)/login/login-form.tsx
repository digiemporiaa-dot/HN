"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";

import { Button, Field, Input } from "@/components/ui";
import { loginAction, type LoginState } from "@/server/auth/actions";

const INITIAL_STATE: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    INITIAL_STATE,
  );

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
            {...props}
          />
        )}
      </Field>

      <Field label="Password" error={state.fieldErrors?.password} required>
        {(props) => (
          <Input
            type="password"
            name="password"
            autoComplete="current-password"
            {...props}
          />
        )}
      </Field>

      <Button type="submit" size="lg" block loading={pending}>
        {pending ? "Signing in" : "Sign in"}
      </Button>
    </form>
  );
}
