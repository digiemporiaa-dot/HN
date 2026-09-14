"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Button, Checkbox } from "@/components/ui";
import {
  updateRolePermissionsAction,
  type RoleActionState,
} from "@/server/roles/actions";

const INITIAL: RoleActionState = {};

export function RolePermissionsForm({
  roleId,
  modules,
  assigned,
  readOnly,
}: {
  roleId: string;
  modules: Array<{
    module: string;
    label: string;
    actions: Array<{ action: string; label: string; key: string }>;
  }>;
  assigned: string[];
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateRolePermissionsAction,
    INITIAL,
  );

  const [selected, setSelected] = useState<Set<string>>(new Set(assigned));

  const toggle = (key: string, on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  const toggleModule = (keys: string[], on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      for (const key of keys) {
        if (on) next.add(key);
        else next.delete(key);
      }
      return next;
    });

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="roleId" value={roleId} />
      {[...selected].map((key) => (
        <input key={key} type="hidden" name="permissions" value={key} />
      ))}

      {state.error ? (
        <div
          role="alert"
          className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3.5"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      {state.success ? (
        <div className="border-success-100 bg-success-50 text-success-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3.5">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{state.success}</span>
        </div>
      ) : null}

      <p className="text-caption text-ink-subtle">
        {selected.size} permissions selected
      </p>

      <div className="flex flex-col gap-5">
        {modules.map((group) => {
          const keys = group.actions.map((action) => action.key);
          const allOn = keys.every((key) => selected.has(key));

          return (
            <fieldset
              key={group.module}
              className="border-line flex flex-col gap-3 rounded-lg border p-4"
            >
              <legend className="text-label text-ink px-1 font-medium">
                {group.label}
              </legend>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
                {!readOnly ? (
                  <label className="text-caption text-ink-subtle flex items-center gap-2">
                    <Checkbox
                      checked={allOn}
                      onChange={(event) =>
                        toggleModule(keys, event.target.checked)
                      }
                    />
                    All
                  </label>
                ) : null}

                {group.actions.map((action) => (
                  <label
                    key={action.key}
                    className="text-body-sm text-ink-muted flex items-center gap-2"
                  >
                    <Checkbox
                      checked={selected.has(action.key)}
                      disabled={readOnly}
                      onChange={(event) =>
                        toggle(action.key, event.target.checked)
                      }
                    />
                    {action.label}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
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
