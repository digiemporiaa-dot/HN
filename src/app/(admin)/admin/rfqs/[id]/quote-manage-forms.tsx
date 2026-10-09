"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button, Field, Select, Textarea } from "@/components/ui";
import { FormFeedback } from "@/components/admin/form-feedback";
import { QUOTE_STATUSES } from "@/lib/quotes/status";
import {
  addQuoteNoteAction,
  assignQuoteAction,
  updateQuoteStatusAction,
  type QuoteActionState,
} from "@/server/quotes/admin-actions";

const INITIAL: QuoteActionState = {};

export function QuoteStatusForm({ leadId, status, disabled }: { leadId: string; status: string; disabled: boolean }) {
  const [state, action, pending] = useActionState(updateQuoteStatusAction, INITIAL);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="leadId" value={leadId} />
      <Field label="Quotation status" help="Quoted, Won and Lost also move the lead's stage. Nothing here creates an order.">
        {(control) => (
          <Select name="status" defaultValue={status} disabled={disabled || pending} key={status} {...control}>
            {QUOTE_STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <FormFeedback state={state} />
      {disabled ? null : (
        <div>
          <Button type="submit" size="sm" loading={pending}>
            Update status
          </Button>
        </div>
      )}
    </form>
  );
}

export function QuoteAssignForm({
  leadId,
  assignedToId,
  staff,
}: {
  leadId: string;
  assignedToId: string | null;
  staff: Array<{ id: string; name: string }>;
}) {
  const [state, action, pending] = useActionState(assignQuoteAction, INITIAL);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="leadId" value={leadId} />
      <Field label="Owner" error={state.fieldErrors?.assignedToId}>
        {(control) => (
          <Select name="assignedToId" defaultValue={assignedToId ?? ""} key={assignedToId ?? ""} disabled={pending} {...control}>
            <option value="">Unassigned</option>
            {staff.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <FormFeedback state={state.fieldErrors ? {} : state} />
      <div>
        <Button type="submit" size="sm" variant="outline" loading={pending}>
          Save owner
        </Button>
      </div>
    </form>
  );
}

export function QuoteNoteForm({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState(addQuoteNoteAction, INITIAL);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="leadId" value={leadId} />
      <Field label="Internal note" help="For the team only. Never exported and never sent to the customer." error={state.fieldErrors?.body}>
        {(control) => <Textarea name="body" rows={3} maxLength={4000} disabled={pending} {...control} />}
      </Field>
      <FormFeedback state={state.fieldErrors ? {} : state} />
      <div>
        <Button type="submit" size="sm" variant="outline" loading={pending}>
          Add note
        </Button>
      </div>
    </form>
  );
}
