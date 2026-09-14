"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";

import { Badge, Button, Checkbox, Field, Input, Select } from "@/components/ui";
import {
  resetStaffPasswordAction,
  resetStaffTwoFactorAction,
  setStaffStatusAction,
  updateStaffAction,
  updateStaffOverridesAction,
  type StaffActionState,
} from "@/server/staff/actions";

const INITIAL: StaffActionState = {};

function Feedback({ state }: { state: StaffActionState }) {
  if (state.error) {
    return (
      <div
        role="alert"
        className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3.5"
      >
        <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>{state.error}</span>
      </div>
    );
  }
  if (state.success) {
    return (
      <div className="border-success-100 bg-success-50 text-success-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3.5">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>{state.success}</span>
      </div>
    );
  }
  return null;
}

export function StaffDetailsForm({
  staff,
  roles,
  readOnly,
}: {
  staff: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    roleId: string;
  };
  roles: Array<{ id: string; name: string }>;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateStaffAction,
    INITIAL,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="staffId" value={staff.id} />
      <Feedback state={state} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" error={state.fieldErrors?.name} required>
          {(props) => (
            <Input
              name="name"
              defaultValue={staff.name}
              disabled={readOnly}
              {...props}
            />
          )}
        </Field>

        <Field label="Work email" error={state.fieldErrors?.email} required>
          {(props) => (
            <Input
              type="email"
              name="email"
              defaultValue={staff.email}
              disabled={readOnly}
              {...props}
            />
          )}
        </Field>

        <Field label="Phone" error={state.fieldErrors?.phone}>
          {(props) => (
            <Input
              type="tel"
              name="phone"
              defaultValue={staff.phone ?? ""}
              disabled={readOnly}
              {...props}
            />
          )}
        </Field>

        <Field label="Role" error={state.fieldErrors?.roleId} required>
          {(props) => (
            <Select
              name="roleId"
              defaultValue={staff.roleId}
              disabled={readOnly}
              {...props}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      {!readOnly ? (
        <div>
          <Button type="submit" loading={pending}>
            {pending ? "Saving" : "Save changes"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

export function StaffStatusForm({
  staffId,
  status,
  disabled,
  disabledReason,
}: {
  staffId: string;
  status: string;
  disabled: boolean;
  disabledReason?: string;
}) {
  const [state, formAction, pending] = useActionState(
    setStaffStatusAction,
    INITIAL,
  );
  const nextStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="staffId" value={staffId} />
      <input type="hidden" name="status" value={nextStatus} />
      <Feedback state={state} />

      <p className="text-body-sm text-ink-muted">
        {status === "ACTIVE"
          ? "Deactivating immediately ends every active session for this account and blocks sign-in."
          : "Reactivating restores sign-in. The account keeps its existing role and overrides."}
      </p>

      {disabled ? (
        <p className="text-caption text-ink-subtle">{disabledReason}</p>
      ) : (
        <div>
          <Button
            type="submit"
            variant={status === "ACTIVE" ? "danger" : "primary"}
            loading={pending}
          >
            {status === "ACTIVE" ? "Deactivate account" : "Activate account"}
          </Button>
        </div>
      )}
    </form>
  );
}

export function StaffPasswordResetForm({
  staffId,
  disabled,
}: {
  staffId: string;
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    resetStaffPasswordAction,
    INITIAL,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="staffId" value={staffId} />
      <Feedback state={state} />

      {state.temporaryPassword ? (
        <div className="border-warning-100 bg-warning-50 flex flex-col gap-2 rounded-md border p-4">
          <div className="text-warning-700 text-body-sm flex items-center gap-2 font-medium">
            <KeyRound aria-hidden="true" className="size-4" />
            Temporary password — shown once
          </div>
          <code className="text-body bg-surface border-line text-ink block rounded-md border px-3 py-2 font-mono break-all">
            {state.temporaryPassword}
          </code>
        </div>
      ) : (
        <p className="text-body-sm text-ink-muted">
          Generates a new temporary password, ends every active session, and
          requires a change at next sign-in.
        </p>
      )}

      {!disabled ? (
        <div>
          <Button type="submit" variant="outline" loading={pending}>
            {pending ? "Resetting" : "Reset password"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

export function StaffTwoFactorResetForm({
  staffId,
  enabled,
  disabled,
}: {
  staffId: string;
  enabled: boolean;
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    resetStaffTwoFactorAction,
    INITIAL,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="staffId" value={staffId} />
      <Feedback state={state} />

      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={enabled ? "success" : "neutral"}>
          {enabled ? "Enabled" : "Not enabled"}
        </Badge>
        <span className="text-body-sm text-ink-muted">
          {enabled
            ? "Clear this only if they have lost their authenticator."
            : "This account signs in with a password only."}
        </span>
      </div>

      {enabled && !disabled ? (
        <div>
          <Button type="submit" variant="danger" loading={pending}>
            {pending ? "Clearing" : "Reset two-factor"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

export function StaffOverridesForm({
  staffId,
  modules,
  rolePermissions,
  overrides,
  readOnly,
}: {
  staffId: string;
  modules: Array<{
    module: string;
    label: string;
    actions: Array<{ action: string; label: string; key: string }>;
  }>;
  rolePermissions: string[];
  overrides: Record<string, "GRANT" | "REVOKE">;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateStaffOverridesAction,
    INITIAL,
  );
  const roleSet = new Set(rolePermissions);

  const [selection, setSelection] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of modules) {
      for (const action of group.actions) {
        const override = overrides[action.key];
        initial[action.key] =
          override === "GRANT"
            ? true
            : override === "REVOKE"
              ? false
              : roleSet.has(action.key);
      }
    }
    return initial;
  });

  /**
   * The form posts only the differences from the role, so a later change to the
   * role flows through to this account instead of being frozen by a snapshot.
   */
  const granted = Object.entries(selection)
    .filter(([key, on]) => on && !roleSet.has(key))
    .map(([key]) => key);
  const revoked = Object.entries(selection)
    .filter(([key, on]) => !on && roleSet.has(key))
    .map(([key]) => key);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="staffId" value={staffId} />
      {granted.map((key) => (
        <input key={`g-${key}`} type="hidden" name="granted" value={key} />
      ))}
      {revoked.map((key) => (
        <input key={`r-${key}`} type="hidden" name="revoked" value={key} />
      ))}

      <Feedback state={state} />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="info">{granted.length} added</Badge>
        <Badge tone="warning">{revoked.length} removed</Badge>
        <span className="text-caption text-ink-subtle">
          Ticks matching the role are inherited and are not stored as overrides.
        </span>
      </div>

      <div className="flex flex-col gap-5">
        {modules.map((group) => (
          <fieldset
            key={group.module}
            className="border-line flex flex-col gap-3 rounded-lg border p-4"
          >
            <legend className="text-label text-ink px-1 font-medium">
              {group.label}
            </legend>
            <div className="flex flex-wrap gap-x-6 gap-y-2.5">
              {group.actions.map((action) => {
                const inRole = roleSet.has(action.key);
                const checked = selection[action.key] ?? false;
                const changed = checked !== inRole;

                return (
                  <label
                    key={action.key}
                    className="text-body-sm text-ink-muted flex items-center gap-2"
                  >
                    <Checkbox
                      checked={checked}
                      disabled={readOnly}
                      onChange={(event) =>
                        setSelection((current) => ({
                          ...current,
                          [action.key]: event.target.checked,
                        }))
                      }
                    />
                    <span className={changed ? "text-ink font-medium" : ""}>
                      {action.label}
                      {changed ? (
                        <span className="text-primary ml-1" aria-label="changed">
                          *
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {!readOnly ? (
        <div>
          <Button type="submit" loading={pending}>
            {pending ? "Saving" : "Save permissions"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
