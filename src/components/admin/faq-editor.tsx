"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";

import { Button, Input, Textarea } from "@/components/ui";
import { FormFeedback } from "./form-feedback";
import { RowControls, moveItem } from "./row-controls";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import type { InfoActionState } from "@/server/products/info-actions";

export type FaqEntityType = "Product" | "Category";

export type FaqRow = { question: string; answer: string };

type InfoAction = (
  previous: InfoActionState,
  formData: FormData,
) => Promise<InfoActionState>;

const INITIAL: InfoActionState = {};

/**
 * Questions buyers ask, in the order they should appear.
 *
 * Shared by every screen that owns FAQs, because the FAQ table is keyed by
 * entity type and id rather than by product: one editor and one save action,
 * so a question attached to a category behaves exactly like one attached to a
 * product. The entity type is posted, but it is not trusted — the action maps
 * it to the permission it requires.
 */
export function FaqEditor({
  entityType,
  entityId,
  faqs: initial,
  version,
  saveAction,
  readOnly,
}: {
  entityType: "Product" | "Category";
  entityId: string;
  faqs: FaqRow[];
  version: string;
  saveAction: InfoAction;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveAction, INITIAL);
  const [rows, setRows] = useSyncedState(initial, version);

  const update = (index: number, next: Partial<FaqRow>) =>
    setRows((current) =>
      current.map((row, position) =>
        position === index ? { ...row, ...next } : row,
      ),
    );

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="entityType" value={entityType} />
      <input type="hidden" name="entityId" value={entityId} />
      <input type="hidden" name="faqs" value={JSON.stringify(rows)} />

      <FormFeedback state={state} />

      {rows.length === 0 ? (
        <p className="border-line text-body-sm text-ink-muted rounded-md border border-dashed p-6 text-center">
          No questions yet.
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {rows.map((row, index) => (
            <li
              key={index}
              className="border-line flex flex-col gap-3 rounded-lg border p-4"
            >
              <div className="flex items-start gap-3">
                <Input
                  value={row.question}
                  disabled={readOnly}
                  placeholder="Question"
                  aria-label={`Question ${index + 1}`}
                  onChange={(event) =>
                    update(index, { question: event.target.value })
                  }
                />
                <RowControls
                  label={row.question || `question ${index + 1}`}
                  index={index}
                  count={rows.length}
                  disabled={readOnly}
                  onMove={(offset) =>
                    setRows((current) => moveItem(current, index, offset))
                  }
                  onRemove={() =>
                    setRows((current) =>
                      current.filter((_, position) => position !== index),
                    )
                  }
                />
              </div>
              <Textarea
                value={row.answer}
                disabled={readOnly}
                rows={3}
                maxLength={4000}
                placeholder="Answer"
                aria-label={`Answer ${index + 1}`}
                onChange={(event) =>
                  update(index, { answer: event.target.value })
                }
              />
            </li>
          ))}
        </ol>
      )}

      {readOnly ? null : (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={pending}>
            Save questions
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setRows((current) => [...current, { question: "", answer: "" }])
            }
          >
            <Plus aria-hidden="true" className="size-4" />
            Add a question
          </Button>
        </div>
      )}
    </form>
  );
}
