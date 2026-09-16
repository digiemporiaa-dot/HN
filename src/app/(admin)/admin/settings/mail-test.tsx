"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui";
import { FormFeedback } from "@/components/admin/form-feedback";
import type { MailTestState } from "@/server/mail/actions";

const INITIAL: MailTestState = {};

/**
 * Proves the mail settings work, or says why they do not.
 *
 * Mail configuration is the one thing here whose correctness cannot be checked
 * by reading it back. Without this, the first time anyone finds out the
 * password is wrong is when an enquiry goes unanswered.
 */
export function MailTestForm({
  action,
  recipients,
}: {
  action: (
    previous: MailTestState,
    formData: FormData,
  ) => Promise<MailTestState>;
  recipients: string;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormFeedback state={state} />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="outline" loading={pending}>
          <Send aria-hidden="true" className="size-4" />
          Send a test message
        </Button>
        <span className="text-caption text-ink-subtle">
          {recipients
            ? `Goes to ${recipients}`
            : "No recipient is configured yet."}
        </span>
      </div>
    </form>
  );
}
