"use client";

import { useActionState } from "react";
import { RotateCcw } from "lucide-react";

import { Button, Field, Input } from "@/components/ui";
import { FormFeedback } from "@/components/admin/form-feedback";
import { RESTORE_CONFIRMATION } from "@/lib/backups/constants";
import {
  restoreBackupAction,
  type BackupActionState,
} from "@/server/backups/actions";

const INITIAL: BackupActionState = {};

/** On success the action signs everyone out, so this form never sees it. */
export function RestoreForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(restoreBackupAction, INITIAL);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormFeedback state={state} />
      <input type="hidden" name="id" value={id} />
      <Field label="Your password" error={state.fieldErrors?.password} required>
        {(props) => (
          <Input
            {...props}
            type="password"
            name="password"
            autoComplete="current-password"
          />
        )}
      </Field>
      <Field
        label={`Type ${RESTORE_CONFIRMATION} to confirm`}
        error={state.fieldErrors?.confirmation}
        required
      >
        {(props) => (
          <Input
            {...props}
            name="confirmation"
            autoComplete="off"
            spellCheck={false}
          />
        )}
      </Field>
      <div>
        <Button type="submit" variant="danger" disabled={pending}>
          <RotateCcw aria-hidden="true" className="size-4" />
          {pending
            ? "Restoring… do not close this page"
            : "Restore this backup"}
        </Button>
      </div>
    </form>
  );
}
