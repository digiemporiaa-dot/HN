"use client";

import { useActionState, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, Lock, RotateCcw, Search, ShieldCheck } from "lucide-react";

import { Badge, Button, Checkbox } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { useUnsavedChanges } from "@/lib/admin/unsaved-changes";
import {
  ACTION_LABELS,
  ACTION_ORDER,
  ALL_PERMISSION_IDS,
  MODULES,
  parsePermissionId,
  permissionId,
} from "@/lib/permissions/registry";
import { groupState, selectionDiff, setGroup, toggleAction, type GroupState } from "@/lib/permissions/selection";
import { updateRolePermissionsAction, type RoleActionState } from "@/server/roles/actions";

const INITIAL: RoleActionState = {};

type Row = {
  key: string;
  label: string;
  description: string;
  actions: Array<{ id: string; label: string }>;
};

type Group = {
  key: string;
  label: string;
  description: string;
  system: boolean;
  resources: Row[];
  ids: string[];
};

const TREE: Group[] = MODULES.map((module) => {
  const resources = module.resources.map((resource) => ({
    key: resource.key,
    label: resource.label,
    description: resource.description,
    actions: ACTION_ORDER.filter((action) => (resource.actions as readonly string[]).includes(action)).map((action) => ({
      id: permissionId(resource.key, action),
      label: ACTION_LABELS[action],
    })),
  }));
  return {
    key: module.key,
    label: module.label,
    description: module.description,
    system: "system" in module && module.system === true,
    resources,
    ids: resources.flatMap((resource) => resource.actions.map((action) => action.id)),
  };
});

function TriStateCheckbox({
  state,
  onChange,
  disabled,
  label,
}: {
  state: GroupState;
  onChange: (on: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  // Every render: React resets a form after its action runs, which puts the
  // DOM back to its first-render state behind React's back.
  useLayoutEffect(() => {
    if (!ref.current) return;
    ref.current.indeterminate = state === "some";
    ref.current.checked = state === "all";
  });
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={state === "all"}
      disabled={disabled}
      // Mixed selects the rest; a full box clears.
      onChange={() => onChange(state !== "all")}
      className="border-line-strong accent-primary size-[1.05rem] shrink-0 cursor-pointer rounded disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}

/**
 * The role permission editor: modules, their resources and the actions on
 * each, with search, group selection, a summary of what will change, and an
 * unsaved-changes guard. Permissions the editor does not hold are locked —
 * the server refuses to change them anyway.
 */
export function RolePermissionsForm({
  roleId,
  roleName,
  version: initialVersion,
  assigned,
  editable,
  readOnly,
}: {
  roleId: string;
  roleName: string;
  version: string;
  /** Ids the role holds now. */
  assigned: string[];
  /** Ids this editor may change, or "*" for all. */
  editable: string[] | "*";
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateRolePermissionsAction, INITIAL);
  const [baseline, setBaseline] = useState(() => new Set(assigned));
  const [selected, setSelected] = useState(() => new Set(assigned));
  const [version, setVersion] = useState(initialVersion);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [showChanges, setShowChanges] = useState(false);
  const searchId = useId();

  const locked = useMemo(
    () => new Set(editable === "*" ? [] : ALL_PERMISSION_IDS.filter((id) => !editable.includes(id))),
    [editable],
  );

  // A save moves the baseline, so the summary and the guard start again.
  const savedVersion = state.version;
  const [seenVersion, setSeenVersion] = useState<string | undefined>(undefined);
  if (savedVersion && savedVersion !== seenVersion) {
    setSeenVersion(savedVersion);
    setVersion(savedVersion);
    setBaseline(new Set(selected));
  }

  const diff = selectionDiff(baseline, selected);
  const dirty = diff.granted.length + diff.revoked.length > 0;
  useUnsavedChanges(dirty && !readOnly);

  const needle = query.trim().toLowerCase();
  const visible = TREE.map((group) => {
    if (!needle) return group;
    const groupHit = group.label.toLowerCase().includes(needle);
    const resources = group.resources.filter(
      (resource) =>
        groupHit ||
        resource.label.toLowerCase().includes(needle) ||
        resource.description.toLowerCase().includes(needle) ||
        resource.actions.some((action) => action.label.toLowerCase().includes(needle)),
    );
    return { ...group, resources, ids: resources.flatMap((resource) => resource.actions.map((action) => action.id)) };
  }).filter((group) => group.resources.length > 0);

  const total = ALL_PERMISSION_IDS.length;
  const disabled = readOnly || pending;
  const apply = (next: Set<string>) => setSelected(next);

  const toggleCollapse = (key: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const describe = (id: string) => {
    const parsed = parsePermissionId(id);
    return parsed ? `${parsed.resource.label}: ${ACTION_LABELS[parsed.action]}` : id;
  };

  return (
    <form action={formAction} className="flex flex-col gap-5" data-unsaved-ignore>
      <input type="hidden" name="roleId" value={roleId} />
      <input type="hidden" name="version" value={version} />
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="permissions" value={id} />
      ))}

      {state.error ? (
        <div role="alert" className="border-danger-100 bg-danger-50 text-danger-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3.5">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}
      {state.success && !dirty ? (
        <div role="status" className="border-success-100 bg-success-50 text-success-700 text-body-sm flex items-start gap-2.5 rounded-md border p-3.5">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{state.success}</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm" role="search">
          <label htmlFor={searchId} className="sr-only">
            Search modules, resources and actions
          </label>
          <Search aria-hidden="true" className="text-ink-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search modules, resources and actions"
            className="border-line-strong bg-surface text-ink placeholder:text-ink-muted focus:border-primary focus:ring-primary/25 h-10 w-full rounded-lg border pr-3 pl-9 text-[0.875rem] outline-none focus:ring-2"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption text-ink-muted mr-1 tabular-nums" aria-live="polite">
            {selected.size} of {total} selected
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setCollapsed(new Set())}>
            Expand all
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setCollapsed(new Set(TREE.map((group) => group.key)))}>
            Collapse all
          </Button>
          {!readOnly ? (
            <>
              <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => apply(setGroup(selected, ALL_PERMISSION_IDS, true, locked))}>
                Select all
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => apply(setGroup(selected, ALL_PERMISSION_IDS, false, locked))}>
                Clear all
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {locked.size > 0 && !readOnly ? (
        <p className="text-caption text-ink-muted flex items-center gap-1.5">
          <Lock aria-hidden="true" className="size-3.5" />
          Locked permissions are ones you do not hold yourself, so you cannot grant or remove them.
        </p>
      ) : null}

      {visible.length === 0 ? (
        <p className="border-line text-body-sm text-ink-muted rounded-lg border border-dashed p-6 text-center">
          Nothing matches “{query}”.
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {visible.map((group) => {
          const open = needle !== "" || !collapsed.has(group.key);
          const state = groupState(selected, group.ids);
          const count = group.ids.filter((id) => selected.has(id)).length;
          const panelId = `perm-group-${group.key}`;
          return (
            <section key={group.key} className="border-line bg-surface overflow-hidden rounded-xl border">
              <div className="bg-surface-subtle flex items-center gap-3 px-4 py-3">
                {!readOnly ? (
                  <TriStateCheckbox
                    state={state}
                    disabled={disabled}
                    label={`Select every ${group.label} permission`}
                    onChange={(on) => apply(setGroup(selected, group.ids, on, locked))}
                  />
                ) : null}
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => toggleCollapse(group.key)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="text-ink flex items-center gap-2 text-[0.9375rem] font-semibold">
                      {group.label}
                      {group.system ? <ShieldCheck aria-label="System module" className="text-warning-700 size-4" /> : null}
                    </span>
                    <span className="text-caption text-ink-muted truncate">{group.description}</span>
                  </span>
                  <span className="text-caption text-ink-muted ml-auto shrink-0 tabular-nums">
                    {count}/{group.ids.length}
                  </span>
                  <ChevronDown aria-hidden="true" className={cn("text-ink-muted size-4 shrink-0 transition-transform", open && "rotate-180")} />
                </button>
              </div>
              {open ? (
                <ul id={panelId} className="divide-line divide-y">
                  {group.resources.map((resource) => {
                    const ids = resource.actions.map((action) => action.id);
                    const resourceState = groupState(selected, ids);
                    return (
                      <li key={resource.key} className="flex flex-col gap-3 px-4 py-3.5 md:flex-row md:items-start md:gap-6">
                        <div className="flex min-w-0 items-start gap-3 md:w-[19rem] md:shrink-0">
                          {!readOnly ? (
                            <span className="pt-0.5">
                              <TriStateCheckbox
                                state={resourceState}
                                disabled={disabled}
                                label={`Select every ${resource.label} permission`}
                                onChange={(on) => apply(setGroup(selected, ids, on, locked))}
                              />
                            </span>
                          ) : null}
                          <div className="min-w-0">
                            <p className="text-ink text-[0.875rem] font-medium">{resource.label}</p>
                            <p className="text-caption text-ink-muted">{resource.description}</p>
                          </div>
                        </div>
                        <fieldset className="flex flex-wrap gap-2">
                          <legend className="sr-only">{resource.label} actions</legend>
                          {resource.actions.map((action) => {
                            const isLocked = locked.has(action.id);
                            const on = selected.has(action.id);
                            const changed = on !== baseline.has(action.id);
                            return (
                              <label
                                key={action.id}
                                title={isLocked ? "You do not hold this permission" : undefined}
                                className={cn(
                                  "inline-flex min-h-9 items-center gap-2 rounded-lg border px-2.5 text-[0.8125rem] select-none",
                                  on ? "border-primary/40 bg-primary-subtle text-ink" : "border-line text-ink-muted",
                                  changed && "ring-primary/50 ring-2",
                                  (readOnly || isLocked) && "cursor-not-allowed opacity-70",
                                  !readOnly && !isLocked && "cursor-pointer",
                                )}
                              >
                                <Checkbox
                                  checked={on}
                                  disabled={disabled || isLocked}
                                  onChange={(event) => apply(toggleAction(selected, action.id, event.target.checked, locked))}
                                />
                                {action.label}
                                {isLocked ? <Lock aria-hidden="true" className="size-3" /> : null}
                                {changed ? <span className="sr-only">(changed)</span> : null}
                              </label>
                            );
                          })}
                        </fieldset>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>

      {!readOnly ? (
        <div className="bg-surface/95 border-line sticky bottom-3 z-[5] flex flex-col gap-3 rounded-2xl border p-3 shadow-[var(--shadow-md)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 px-1" aria-live="polite">
            {dirty ? (
              <>
                <Badge tone="success">+{diff.granted.length} granted</Badge>
                <Badge tone="danger">−{diff.revoked.length} revoked</Badge>
                <button type="button" onClick={() => setShowChanges((value) => !value)} aria-expanded={showChanges} className="text-caption text-primary font-medium underline-offset-4 hover:underline">
                  {showChanges ? "Hide changes" : "Review changes"}
                </button>
              </>
            ) : (
              <span className="text-caption text-ink-muted">No unsaved changes to {roleName}.</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full sm:w-auto"
              disabled={!dirty || pending}
              onClick={() => {
                setSelected(new Set(baseline));
                setShowChanges(false);
              }}
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Undo<span className="hidden sm:inline">&nbsp;changes</span>
            </Button>
            <Button type="submit" size="sm" className="w-full sm:w-auto" loading={pending} disabled={!dirty}>
              {pending ? (
                "Saving"
              ) : (
                <>
                  Save<span className="hidden sm:inline">&nbsp;permissions</span>
                </>
              )}
            </Button>
          </div>
          {showChanges && dirty ? (
            <ChangeList granted={diff.granted.map(describe)} revoked={diff.revoked.map(describe)} />
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

function ChangeList({ granted, revoked }: { granted: string[]; revoked: string[] }) {
  const column = (title: string, items: string[], tone: string): ReactNode => (
    <div className="min-w-0 flex-1">
      <p className={cn("text-caption mb-1 font-semibold", tone)}>{title}</p>
      {items.length === 0 ? (
        <p className="text-caption text-ink-muted">None</p>
      ) : (
        <ul className="text-caption text-ink max-h-40 overflow-y-auto">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
  return (
    <div className="border-line flex w-full basis-full flex-col gap-3 border-t pt-3 sm:flex-row">
      {column("Will be granted", granted, "text-success-700")}
      {column("Will be revoked", revoked, "text-danger-700")}
    </div>
  );
}
