"use client";

import { useActionState } from "react";

import { Button, Field, Select, Textarea } from "@/components/ui";
import { FormFeedback } from "@/components/admin/form-feedback";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import { LEAD_PRIORITIES, LEAD_STATUSES } from "@/lib/validation/leads";
import type { LeadActionState } from "@/server/leads/actions";

type LeadAction = (
  previous: LeadActionState,
  formData: FormData,
) => Promise<LeadActionState>;

const INITIAL: LeadActionState = {};

/** Stage, priority and ownership — what anyone actually changes on a lead. */
export function LeadWorkflowForm({
  leadId,
  status,
  priority,
  assignedToId,
  version,
  staff,
  action,
  readOnly,
  canAssign,
}: {
  leadId: string;
  status: string;
  priority: string;
  assignedToId: string;
  version: string;
  staff: Array<{ id: string; name: string; email: string }>;
  action: LeadAction;
  readOnly: boolean;
  canAssign: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const [form, setForm] = useSyncedState(
    { status, priority, assignedToId },
    version,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="leadId" value={leadId} />
      <FormFeedback state={state} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Status" error={state.fieldErrors?.status}>
          {(control) => (
            <Select
              name="status"
              value={form.status}
              disabled={readOnly}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
              {...control}
            >
              {LEAD_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Priority" error={state.fieldErrors?.priority}>
          {(control) => (
            <Select
              name="priority"
              value={form.priority}
              disabled={readOnly}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  priority: event.target.value,
                }))
              }
              {...control}
            >
              {LEAD_PRIORITIES.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          label="Owner"
          help={canAssign ? undefined : "You cannot reassign enquiries."}
          error={state.fieldErrors?.assignedToId}
        >
          {(control) => (
            <Select
              name="assignedToId"
              value={form.assignedToId}
              disabled={readOnly || !canAssign}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  assignedToId: event.target.value,
                }))
              }
              {...control}
            >
              <option value="">Unassigned</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      {readOnly ? null : (
        <div>
          <Button type="submit" loading={pending}>
            Save
          </Button>
        </div>
      )}
    </form>
  );
}

/** A note on the conversation so far. */
export function LeadNoteForm({
  leadId,
  action,
  version,
}: {
  leadId: string;
  action: LeadAction;
  /** Changes when a note lands, which is what clears the box. */
  version: string;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const [body, setBody] = useSyncedState("", version);

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="leadId" value={leadId} />
      <FormFeedback state={state} />

      <Textarea
        name="body"
        value={body}
        rows={3}
        maxLength={4000}
        placeholder="Called and left a message with reception…"
        aria-label="Add a note"
        onChange={(event) => setBody(event.target.value)}
      />
      {state.fieldErrors?.body ? (
        <p className="text-caption text-danger-700">{state.fieldErrors.body}</p>
      ) : null}

      <div>
        <Button type="submit" variant="outline" size="sm" loading={pending}>
          Add note
        </Button>
      </div>
    </form>
  );
}
