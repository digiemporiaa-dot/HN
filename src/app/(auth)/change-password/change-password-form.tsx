"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";

import { Button, Field, Input } from "@/components/ui";
import {
  changePasswordAction,
  type ChangePasswordState,
} from "@/server/auth/actions";

const INITIAL_STATE: ChangePasswordState = {};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
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

      <Field
        label="Current password"
        error={state.fieldErrors?.currentPassword}
        required
      >
        {(props) => (
          <Input
            type="password"
            name="currentPassword"
            autoComplete="current-password"
            {...props}
          />
        )}
      </Field>

      <Field
        label="New password"
        help="At least 12 characters. Longer passphrases are stronger than short complex ones."
        error={state.fieldErrors?.newPassword}
        required
      >
        {(props) => (
          <Input
            type="password"
            name="newPassword"
            autoComplete="new-password"
            {...props}
          />
        )}
      </Field>

      <Field
        label="Confirm new password"
        error={state.fieldErrors?.confirmPassword}
        required
      >
        {(props) => (
          <Input
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            {...props}
          />
        )}
      </Field>

      <Button type="submit" size="lg" block loading={pending}>
        {pending ? "Updating" : "Update password"}
      </Button>
    </form>
  );
}
