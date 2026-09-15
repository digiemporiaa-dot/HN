import { AlertCircle, CheckCircle2 } from "lucide-react";

/** The shape every admin server action returns. */
export type ActionFeedback = {
  error?: string;
  success?: string;
};

/**
 * The success and failure banner every admin form shows.
 *
 * A server action's outcome should look and read the same wherever it appears;
 * seven hand-rolled copies is how a "Saved" on one screen ends up styled as a
 * warning on another.
 */
export function FormFeedback({ state }: { state: ActionFeedback }) {
  if (state.error) {
    return (
      <div
        role="alert"
        className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3"
      >
        <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>{state.error}</span>
      </div>
    );
  }

  if (state.success) {
    return (
      <div className="border-success-100 bg-success-50 text-success-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>{state.success}</span>
      </div>
    );
  }

  return null;
}
