"use client";

import { useActionState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Laptop,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";

import { Badge, Button, Field, Input } from "@/components/ui";
import {
  confirmTwoFactorAction,
  disableTwoFactorAction,
  regenerateRecoveryCodesAction,
  revokeOtherSessionsAction,
  revokeSessionAction,
  startTwoFactorEnrolmentAction,
  updateProfileAction,
  type ProfileState,
  type TwoFactorState,
} from "@/server/profile/actions";

const INITIAL: ProfileState = {};
const INITIAL_2FA: TwoFactorState = {};

function Feedback({ state }: { state: ProfileState }) {
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

function RecoveryCodeList({ codes }: { codes: string[] }) {
  return (
    <div className="border-warning-100 bg-warning-50 flex flex-col gap-3 rounded-md border p-4">
      <p className="text-warning-700 text-body-sm font-medium">
        Recovery codes — shown once
      </p>
      <ul className="grid grid-cols-2 gap-2">
        {codes.map((code) => (
          <li
            key={code}
            className="bg-surface border-line text-ink rounded-md border px-3 py-2 text-center font-mono text-sm"
          >
            {code}
          </li>
        ))}
      </ul>
      <p className="text-caption text-warning-700">
        Store these somewhere safe and offline. Each one works once, and they
        are the only way in if you lose your authenticator.
      </p>
    </div>
  );
}

export function ProfileDetailsForm({
  name,
  phone,
  email,
}: {
  name: string;
  phone: string | null;
  email: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    INITIAL,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <Feedback state={state} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" error={state.fieldErrors?.name} required>
          {(props) => <Input name="name" defaultValue={name} {...props} />}
        </Field>

        <Field label="Phone" error={state.fieldErrors?.phone}>
          {(props) => (
            <Input type="tel" name="phone" defaultValue={phone ?? ""} {...props} />
          )}
        </Field>
      </div>

      <Field
        label="Work email"
        help="Your email is your sign-in identifier. An administrator changes it for you."
      >
        {(props) => <Input value={email} disabled readOnly {...props} />}
      </Field>

      <div>
        <Button type="submit" loading={pending}>
          {pending ? "Saving" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

export function TwoFactorSetup({ enabled }: { enabled: boolean }) {
  const [startState, startAction, starting] = useActionState(
    startTwoFactorEnrolmentAction,
    INITIAL_2FA,
  );
  const [confirmState, confirmAction, confirming] = useActionState(
    confirmTwoFactorAction,
    INITIAL_2FA,
  );
  const [disableState, disableAction, disabling] = useActionState(
    disableTwoFactorAction,
    INITIAL_2FA,
  );
  const [codesState, codesAction, regenerating] = useActionState(
    regenerateRecoveryCodesAction,
    INITIAL_2FA,
  );

  if (enabled && !confirmState.recoveryCodes) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="success">
            <ShieldCheck aria-hidden="true" className="size-3.5" />
            Enabled
          </Badge>
          <span className="text-body-sm text-ink-muted">
            Sign-in requires a code from your authenticator app.
          </span>
        </div>

        <form action={codesAction} className="flex flex-col gap-4">
          <Feedback state={codesState} />
          {codesState.recoveryCodes ? (
            <RecoveryCodeList codes={codesState.recoveryCodes} />
          ) : null}
          <Field
            label="Confirm your password to generate new recovery codes"
            error={codesState.fieldErrors?.password}
          >
            {(props) => (
              <Input
                type="password"
                name="password"
                autoComplete="current-password"
                {...props}
              />
            )}
          </Field>
          <div>
            <Button type="submit" variant="outline" loading={regenerating}>
              {regenerating ? "Generating" : "Regenerate recovery codes"}
            </Button>
          </div>
        </form>

        <form
          action={disableAction}
          className="border-line flex flex-col gap-4 border-t pt-6"
        >
          <Feedback state={disableState} />
          <Field
            label="Confirm your password to turn off two-factor authentication"
            error={disableState.fieldErrors?.password}
          >
            {(props) => (
              <Input
                type="password"
                name="password"
                autoComplete="current-password"
                {...props}
              />
            )}
          </Field>
          <div>
            <Button type="submit" variant="danger" loading={disabling}>
              <ShieldOff aria-hidden="true" className="size-4" />
              {disabling ? "Disabling" : "Turn off two-factor"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  if (confirmState.recoveryCodes) {
    return (
      <div className="flex flex-col gap-5">
        <Feedback state={confirmState} />
        <RecoveryCodeList codes={confirmState.recoveryCodes} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-body-sm text-ink-muted">
        Two-factor authentication adds a one-time code to sign-in. Works with
        Microsoft Authenticator, Google Authenticator, 1Password and any other
        standards-based app.
      </p>

      {!startState.qrCodeDataUrl ? (
        <form action={startAction}>
          <Button type="submit" loading={starting}>
            {starting ? "Preparing" : "Set up two-factor authentication"}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-5">
          <ol className="text-body-sm text-ink-muted flex list-decimal flex-col gap-2 pl-5">
            <li>Open your authenticator app and add a new account.</li>
            <li>Scan this QR code, or enter the key below by hand.</li>
            <li>Enter the 6-digit code it shows to finish.</li>
          </ol>

          <div className="flex flex-wrap items-start gap-6">
            {/* eslint-disable-next-line @next/next/no-img-element -- generated data URI, not a remote asset */}
            <img
              src={startState.qrCodeDataUrl}
              alt="QR code for two-factor authentication setup"
              width={200}
              height={200}
              className="border-line rounded-md border bg-white p-2"
            />

            <div className="flex flex-col gap-1.5">
              <span className="text-label text-ink-subtle">
                Or enter this key manually
              </span>
              <code className="bg-surface-muted text-ink rounded-md px-3 py-2 font-mono text-sm break-all">
                {startState.manualKey}
              </code>
            </div>
          </div>

          <form action={confirmAction} className="flex flex-col gap-4">
            <Feedback state={confirmState} />
            <Field
              label="6-digit code"
              error={confirmState.fieldErrors?.code}
              required
            >
              {(props) => (
                <Input
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  {...props}
                />
              )}
            </Field>
            <div>
              <Button type="submit" loading={confirming}>
                {confirming ? "Verifying" : "Verify and enable"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export function SessionList({
  sessions,
  currentSessionId,
}: {
  sessions: Array<{
    id: string;
    device: string;
    ipAddress: string | null;
    lastSeen: string;
    signedInAt: string;
  }>;
  currentSessionId: string;
}) {
  const [revokeState, revokeAction] = useActionState(
    revokeSessionAction,
    INITIAL,
  );
  const [othersState, othersAction, revokingOthers] = useActionState(
    revokeOtherSessionsAction,
    INITIAL,
  );

  const hasOthers = sessions.some((s) => s.id !== currentSessionId);

  return (
    <div className="flex flex-col gap-5">
      <Feedback state={revokeState} />
      <Feedback state={othersState} />

      <ul className="border-line divide-line divide-y rounded-lg border">
        {sessions.map((session) => {
          const isCurrent = session.id === currentSessionId;
          return (
            <li
              key={session.id}
              className="flex flex-wrap items-center justify-between gap-4 p-4"
            >
              <div className="flex items-start gap-3">
                <Laptop
                  aria-hidden="true"
                  className="text-ink-subtle mt-0.5 size-4 shrink-0"
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-body-sm text-ink flex items-center gap-2 font-medium">
                    {session.device}
                    {isCurrent ? (
                      <Badge tone="success">This device</Badge>
                    ) : null}
                  </span>
                  <span className="text-caption text-ink-muted">
                    {session.ipAddress ?? "Unknown address"} &middot; last active{" "}
                    {session.lastSeen}
                  </span>
                  <span className="text-caption text-ink-subtle">
                    Signed in {session.signedInAt}
                  </span>
                </div>
              </div>

              {!isCurrent ? (
                <form action={revokeAction}>
                  <input type="hidden" name="sessionId" value={session.id} />
                  <Button type="submit" variant="outline" size="sm">
                    Sign out
                  </Button>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>

      {hasOthers ? (
        <form action={othersAction}>
          <Button type="submit" variant="danger" loading={revokingOthers}>
            {revokingOthers ? "Signing out" : "Sign out all other devices"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
