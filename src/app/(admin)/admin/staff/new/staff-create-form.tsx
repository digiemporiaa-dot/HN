"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";

import { Button, Field, Input, Select } from "@/components/ui";
import {
  createStaffAction,
  type StaffActionState,
} from "@/server/staff/actions";

const INITIAL_STATE: StaffActionState = {};

export function StaffCreateForm({
  roles,
}: {
  roles: Array<{ id: string; name: string; description: string | null }>;
}) {
  const [state, formAction, pending] = useActionState(
    createStaffAction,
    INITIAL_STATE,
  );

  if (state.success) {
    return (
      <div className="flex flex-col gap-5">
        <div className="border-success-100 bg-success-50 text-success-700 text-body-sm flex items-start gap-2.5 rounded-md border p-4">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{state.success}</span>
        </div>

        {state.temporaryPassword ? (
          <div className="border-warning-100 bg-warning-50 flex flex-col gap-2 rounded-md border p-4">
            <div className="text-warning-700 text-body-sm flex items-center gap-2 font-medium">
              <KeyRound aria-hidden="true" className="size-4" />
              Temporary password — shown once
            </div>
            <code className="text-body bg-surface border-line text-ink block rounded-md border px-3 py-2 font-mono break-all">
              {state.temporaryPassword}
            </code>
            <p className="text-caption text-warning-700">
              Share it over a secure channel. The account must change it at
              first sign-in, and it cannot be retrieved again.
            </p>
          </div>
        ) : null}
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

      <Field label="Full name" error={state.fieldErrors?.name} required>
        {(props) => <Input name="name" autoComplete="off" {...props} />}
      </Field>

      <Field label="Work email" error={state.fieldErrors?.email} required>
        {(props) => <Input type="email" name="email" autoComplete="off" {...props} />}
      </Field>

      <Field label="Phone" error={state.fieldErrors?.phone}>
        {(props) => <Input type="tel" name="phone" autoComplete="off" {...props} />}
      </Field>

      <Field label="Role" error={state.fieldErrors?.roleId} required>
        {(props) => (
          <Select name="roleId" defaultValue="" {...props}>
            <option value="" disabled>
              Select a role
            </option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field
        label="Temporary password"
        help="Leave blank to generate a strong password. Either way the account must change it at first sign-in."
        error={state.fieldErrors?.password}
      >
        {(props) => (
          <Input type="text" name="password" autoComplete="off" {...props} />
        )}
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending}>
          {pending ? "Creating" : "Create account"}
        </Button>
      </div>
    </form>
  );
}
