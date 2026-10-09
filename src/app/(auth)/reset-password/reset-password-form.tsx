"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";

import { Button, Field, Input } from "@/components/ui";
import {
  resetPasswordAction,
  type ResetPasswordState,
} from "@/server/auth/actions";

const INITIAL_STATE: ResetPasswordState = {};

export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const [state, formAction, pending] = useActionState(
    resetPasswordAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="token" value={token} />
      {/* Lets a password manager file the new password under the right account. */}
      <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />

      {state.error ? (
        <div
          role="alert"
          className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3.5"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Field
        label="New password"
        help="At least 12 characters. Longer passphrases are stronger than short complex ones."
        error={state.fieldErrors?.newPassword}
        required
      >
        {(props) => (
          <Input type="password" name="newPassword" autoComplete="new-password" autoFocus {...props} />
        )}
      </Field>

      <Field label="Confirm new password" error={state.fieldErrors?.confirmPassword} required>
        {(props) => (
          <Input type="password" name="confirmPassword" autoComplete="new-password" {...props} />
        )}
      </Field>

      <Button type="submit" size="lg" block loading={pending}>
        {pending ? "Saving" : "Set new password"}
      </Button>
    </form>
  );
}
