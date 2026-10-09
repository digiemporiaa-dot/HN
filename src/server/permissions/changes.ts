import type { PermissionAction, PermissionModule } from "@/generated/prisma/enums";
import {
  ACTION_LABELS,
  ALL_PERMISSION_IDS,
  idForStorage,
  parsePermissionId,
  requiredFor,
  type ParsedPermission,
} from "@/lib/permissions/registry";

/**
 * Deciding whether a change to a role's permissions, or to one person's
 * overrides, may be saved — and exactly what it changes. Pure, so every rule
 * here is covered by tests without a database.
 *
 * Rules:
 *   - Only identifiers the registry defines are accepted; anything else is
 *     refused by name, never silently dropped.
 *   - Every action other than View needs the same resource's View.
 *   - An actor who is not Super Admin may only change permissions they hold
 *     themselves — adding or removing. Permissions they do not hold stay as
 *     they are.
 *   - Retired pairs (in the database, but no longer grantable or checked)
 *     are dropped and listed, so the drop is visible in the audit log.
 */

export type Actor = {
  isSuperAdmin: boolean;
  /** Storage keys ("PRODUCTS:EDIT"), or "*" for everything. */
  permissions: ReadonlySet<string>;
};

export type StoredPair = { module: PermissionModule; action: PermissionAction };

type Failure = { ok: false; error: string };

const label = (parsed: ParsedPermission) => `${parsed.resource.label}: ${ACTION_LABELS[parsed.action]}`;
const labelOf = (id: string) => {
  const parsed = parsePermissionId(id);
  return parsed ? label(parsed) : id;
};

function holds(actor: Actor, storageKey: string): boolean {
  return actor.isSuperAdmin || actor.permissions.has("*") || actor.permissions.has(storageKey);
}

function listed(ids: string[], max = 3): string {
  const shown = ids.slice(0, max).map(labelOf).join(", ");
  return ids.length > max ? `${shown} and ${ids.length - max} more` : shown;
}

function parseAll(input: unknown[]): { parsed: ParsedPermission[]; invalid: string[] } {
  const parsed: ParsedPermission[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  for (const value of input) {
    const result = parsePermissionId(value);
    if (!result) invalid.push(String(value).slice(0, 80));
    else if (!seen.has(result.id)) {
      seen.add(result.id);
      parsed.push(result);
    }
  }
  return { parsed, invalid };
}

function missingViews(ids: ReadonlySet<string>): string[] {
  return [...ids].filter((id) => {
    const view = requiredFor(id);
    return view !== null && !ids.has(view);
  });
}

/** Splits stored pairs into grantable ids and retired storage keys. */
function classify(pairs: StoredPair[]): { ids: Set<string>; retired: string[] } {
  const ids = new Set<string>();
  const retired: string[] = [];
  for (const pair of pairs) {
    const id = idForStorage(pair.module, pair.action);
    if (id) ids.add(id);
    else retired.push(`${pair.module}:${pair.action}`);
  }
  return { ids, retired };
}

export type RoleChange = {
  ok: true;
  /** Storage keys the role holds after saving. */
  desired: string[];
  added: string[];
  removed: string[];
  /** Retired storage keys dropped from the role. */
  retired: string[];
};

export function planRoleChange(params: {
  current: StoredPair[];
  submitted: unknown[];
  actor: Actor;
}): RoleChange | Failure {
  if (params.submitted.length > ALL_PERMISSION_IDS.length * 2) {
    return { ok: false, error: "Too many permissions in one request." };
  }
  const { parsed, invalid } = parseAll(params.submitted);
  if (invalid.length > 0) {
    return { ok: false, error: `Unknown or unsupported permission: ${invalid.slice(0, 3).join(", ")}` };
  }

  const desiredIds = new Set(parsed.map((entry) => entry.id));
  const lacking = missingViews(desiredIds);
  if (lacking.length > 0) {
    return { ok: false, error: `These need View on the same resource: ${listed(lacking)}` };
  }

  const current = classify(params.current);
  const added = [...desiredIds].filter((id) => !current.ids.has(id));
  const removed = [...current.ids].filter((id) => !desiredIds.has(id));

  const forbidden = [...added, ...removed].filter((id) => !holds(params.actor, parsePermissionId(id)!.storageKey));
  if (forbidden.length > 0) {
    return { ok: false, error: `You can only change permissions you hold yourself: ${listed(forbidden)}` };
  }

  return {
    ok: true,
    desired: parsed.map((entry) => entry.storageKey),
    added,
    removed,
    retired: current.retired,
  };
}

export type OverrideChange = {
  ok: true;
  rows: Array<{ storageKey: string; effect: "GRANT" | "REVOKE" }>;
  /** Ids whose override was added, removed or flipped. */
  changed: string[];
  retired: string[];
};

/**
 * One person's overrides. Only real differences from the role are stored:
 * granting what the role already has, or revoking what it lacks, is dropped.
 * A REVOKE always wins at check time; here, asking for both on one
 * permission is refused as contradictory.
 */
export function planOverrideChange(params: {
  role: StoredPair[];
  current: Array<StoredPair & { effect: "GRANT" | "REVOKE" }>;
  granted: unknown[];
  revoked: unknown[];
  actor: Actor;
  roleIsSuperAdmin?: boolean;
}): OverrideChange | Failure {
  if (params.roleIsSuperAdmin) {
    return { ok: false, error: "Super Admin holds every permission; overrides do not apply." };
  }
  const grants = parseAll(params.granted);
  const revokes = parseAll(params.revoked);
  const invalid = [...grants.invalid, ...revokes.invalid];
  if (invalid.length > 0) {
    return { ok: false, error: `Unknown or unsupported permission: ${invalid.slice(0, 3).join(", ")}` };
  }
  const revokeIds = new Set(revokes.parsed.map((entry) => entry.id));
  const both = grants.parsed.filter((entry) => revokeIds.has(entry.id)).map((entry) => entry.id);
  if (both.length > 0) {
    return { ok: false, error: `Cannot both grant and revoke: ${listed(both)}` };
  }

  const role = classify(params.role).ids;
  const desired = new Map<string, "GRANT" | "REVOKE">();
  for (const entry of grants.parsed) if (!role.has(entry.id)) desired.set(entry.id, "GRANT");
  for (const entry of revokes.parsed) if (role.has(entry.id)) desired.set(entry.id, "REVOKE");

  const effective = new Set(role);
  for (const [id, effect] of desired) {
    if (effect === "GRANT") effective.add(id);
    else effective.delete(id);
  }
  const lacking = missingViews(effective);
  if (lacking.length > 0) {
    return { ok: false, error: `These would be left without View on the same resource: ${listed(lacking)}` };
  }

  const existing = new Map<string, "GRANT" | "REVOKE">();
  const retired: string[] = [];
  for (const override of params.current) {
    const id = idForStorage(override.module, override.action);
    if (id) existing.set(id, override.effect);
    else retired.push(`${override.module}:${override.action}`);
  }
  const keys = new Set([...existing.keys(), ...desired.keys()]);
  const changed = [...keys].filter((id) => existing.get(id) !== desired.get(id));

  const forbidden = changed.filter((id) => !holds(params.actor, parsePermissionId(id)!.storageKey));
  if (forbidden.length > 0) {
    return { ok: false, error: `You can only change permissions you hold yourself: ${listed(forbidden)}` };
  }

  return {
    ok: true,
    rows: [...desired].map(([id, effect]) => ({ storageKey: parsePermissionId(id)!.storageKey, effect })),
    changed,
    retired,
  };
}
