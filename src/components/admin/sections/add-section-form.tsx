"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

import { Button, Field, Select } from "@/components/ui";
import { FormFeedback } from "@/components/admin/form-feedback";
import { addSectionAction, type CmsActionState } from "@/server/cms/actions";
import type { OwnerRef } from "@/server/cms/section-owner";

const INITIAL: CmsActionState = {};

/**
 * Adds a section to whatever owns it — a page or a city.
 *
 * The owner is posted as one of two named fields rather than a kind-and-id
 * pair, and the server confirms it exists and checks the permission that owner
 * requires. Nothing here decides who may add a section; it only says where.
 */
export function AddSectionForm({
  owner,
  options,
}: {
  owner: OwnerRef;
  options: Array<{ value: string; label: string; description: string }>;
}) {
  const [state, formAction, pending] = useActionState(
    addSectionAction,
    INITIAL,
  );
  const [type, setType] = useState(options[0]?.value ?? "");

  const selected = options.find((option) => option.value === type);

  return (
    <form
      action={formAction}
      className="border-line bg-surface-subtle flex flex-col gap-4 rounded-lg border border-dashed p-4"
    >
      <input
        type="hidden"
        name={
          owner.kind === "page"
            ? "pageId"
            : owner.kind === "post"
              ? "postId"
              : "cityId"
        }
        value={owner.id}
      />
      <FormFeedback state={state} />

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Add a section" className="min-w-60 flex-1">
          {(control) => (
            <Select
              name="type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              {...control}
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Button type="submit" loading={pending}>
          <Plus aria-hidden="true" className="size-4" />
          Add section
        </Button>
      </div>

      {selected ? (
        <p className="text-caption text-ink-subtle">{selected.description}</p>
      ) : null}
    </form>
  );
}
