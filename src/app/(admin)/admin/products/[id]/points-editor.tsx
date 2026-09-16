"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";

import { Button, Input, Textarea } from "@/components/ui";
import { FormFeedback } from "@/components/admin/form-feedback";
import { RowControls, moveItem } from "@/components/admin/row-controls";
import { useSyncedState } from "@/lib/hooks/use-synced-state";
import type { InfoActionState } from "@/server/products/info-actions";

export type HighlightRow = { title: string };
export type FeatureRow = { title: string; body: string };

type InfoAction = (
  previous: InfoActionState,
  formData: FormData,
) => Promise<InfoActionState>;

const INITIAL: InfoActionState = {};

/**
 * The selling points of a product, in the order they appear on its page.
 *
 * Two lists in one form because they are saved together: a product should
 * never end up with this week's highlights against last week's features.
 */
export function PointsEditor({
  productId,
  highlights: initialHighlights,
  features: initialFeatures,
  version,
  saveAction,
  readOnly,
}: {
  productId: string;
  highlights: HighlightRow[];
  features: FeatureRow[];
  version: string;
  saveAction: InfoAction;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveAction, INITIAL);
  const [highlights, setHighlights] = useSyncedState(
    initialHighlights,
    version,
  );
  const [features, setFeatures] = useSyncedState(initialFeatures, version);

  const updateFeature = (index: number, next: Partial<FeatureRow>) =>
    setFeatures((current) =>
      current.map((row, position) =>
        position === index ? { ...row, ...next } : row,
      ),
    );

  /**
   * A list-level complaint — too many rows, a title too long — has no field of
   * its own to appear beside, and the shared banner only shows `error`. Without
   * this the save would be refused in silence and look like nothing happened.
   */
  const listError = (key: "highlights" | "features") =>
    state.fieldErrors?.[key] ? (
      <p role="alert" className="text-caption text-danger-700">
        {state.fieldErrors[key]}
      </p>
    ) : null;

  return (
    <form action={formAction} className="flex flex-col gap-8" noValidate>
      <input type="hidden" name="productId" value={productId} />
      <input
        type="hidden"
        name="highlights"
        value={JSON.stringify(highlights)}
      />
      <input type="hidden" name="features" value={JSON.stringify(features)} />

      <FormFeedback state={state} />

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-body text-ink font-medium">Highlights</h3>
          <p className="text-body-sm text-ink-muted">
            The four or five things a buyer should see beside the photograph.
            One phrase each — no sentences.
          </p>
        </div>

        {highlights.length === 0 ? (
          <p className="border-line text-body-sm text-ink-muted rounded-md border border-dashed p-6 text-center">
            No highlights yet.
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {highlights.map((row, index) => (
              <li key={index} className="flex items-start gap-3">
                <Input
                  value={row.title}
                  disabled={readOnly}
                  maxLength={160}
                  placeholder="e.g. 160,000 lux at one metre"
                  aria-label={`Highlight ${index + 1}`}
                  onChange={(event) =>
                    setHighlights((current) =>
                      current.map((entry, position) =>
                        position === index
                          ? { title: event.target.value }
                          : entry,
                      ),
                    )
                  }
                />
                <RowControls
                  label={row.title || `highlight ${index + 1}`}
                  index={index}
                  count={highlights.length}
                  disabled={readOnly}
                  onMove={(offset) =>
                    setHighlights((current) => moveItem(current, index, offset))
                  }
                  onRemove={() =>
                    setHighlights((current) =>
                      current.filter((_, position) => position !== index),
                    )
                  }
                />
              </li>
            ))}
          </ol>
        )}

        {listError("highlights")}

        {readOnly ? null : (
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setHighlights((current) => [...current, { title: "" }])
              }
            >
              <Plus aria-hidden="true" className="size-4" />
              Add a highlight
            </Button>
          </div>
        )}
      </section>

      <section className="border-line flex flex-col gap-3 border-t pt-8">
        <div className="flex flex-col gap-1">
          <h3 className="text-body text-ink font-medium">Features</h3>
          <p className="text-body-sm text-ink-muted">
            What the product does and why that matters, a claim and a sentence
            at a time.
          </p>
        </div>

        {features.length === 0 ? (
          <p className="border-line text-body-sm text-ink-muted rounded-md border border-dashed p-6 text-center">
            No features yet.
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {features.map((row, index) => (
              <li
                key={index}
                className="border-line flex flex-col gap-3 rounded-lg border p-4"
              >
                <div className="flex items-start gap-3">
                  <Input
                    value={row.title}
                    disabled={readOnly}
                    maxLength={160}
                    placeholder="Feature"
                    aria-label={`Feature ${index + 1}`}
                    onChange={(event) =>
                      updateFeature(index, { title: event.target.value })
                    }
                  />
                  <RowControls
                    label={row.title || `feature ${index + 1}`}
                    index={index}
                    count={features.length}
                    disabled={readOnly}
                    onMove={(offset) =>
                      setFeatures((current) => moveItem(current, index, offset))
                    }
                    onRemove={() =>
                      setFeatures((current) =>
                        current.filter((_, position) => position !== index),
                      )
                    }
                  />
                </div>
                <Textarea
                  value={row.body}
                  disabled={readOnly}
                  rows={2}
                  maxLength={600}
                  placeholder="What it means for the buyer (optional)"
                  aria-label={`Feature ${index + 1} description`}
                  onChange={(event) =>
                    updateFeature(index, { body: event.target.value })
                  }
                />
              </li>
            ))}
          </ol>
        )}

        {listError("features")}

        {readOnly ? null : (
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setFeatures((current) => [...current, { title: "", body: "" }])
              }
            >
              <Plus aria-hidden="true" className="size-4" />
              Add a feature
            </Button>
          </div>
        )}
      </section>

      {readOnly ? null : (
        <div>
          <Button type="submit" loading={pending}>
            Save highlights and features
          </Button>
        </div>
      )}
    </form>
  );
}
