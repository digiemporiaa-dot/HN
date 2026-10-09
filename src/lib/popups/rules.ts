/**
 * Popup rules: page targeting, schedule, device, frequency and choosing one.
 *
 * Pure functions with no server or browser imports, so the admin editor, the
 * server that serves the public list, the dialog host and the tests all apply
 * exactly the same rules.
 *
 * How page targeting works
 * ------------------------
 * A rule is a site path, stored normalised: lower case, a leading slash, no
 * trailing slash, no query string or fragment.
 *
 *   /contact        exact: only /contact itself
 *   /products/*     prefix: /products and every address under it
 *   /*              every page
 *
 * A `*` is accepted only as the final segment. The visitor's path is
 * normalised the same way before it is compared, so "/Products/" and
 * "/products" are the same page.
 *
 * Mode EXCLUDE shows the popup everywhere except pages matching a rule (no
 * rules means every page). Mode INCLUDE shows it only on pages matching a rule
 * (and needs at least one). Either way, the paths in ALWAYS_EXCLUDED are never
 * covered: staff screens, sign-in, and the quotation and contact forms a
 * visitor is already filling in.
 */

export type PopupTargetMode = "INCLUDE" | "EXCLUDE";
export type PopupDevice = "ALL" | "DESKTOP" | "MOBILE";
export type PopupTrigger = "DELAY" | "SCROLL" | "EXIT_INTENT" | "IMMEDIATE";

export const MAX_TARGET_RULES = 50;
const MAX_RULE_LENGTH = 200;

/** Pages no popup may cover, whatever its rules say. */
export const ALWAYS_EXCLUDED = [
  "/admin/*",
  "/login/*",
  "/change-password/*",
  "/access-denied/*",
  "/reset-password/*",
  "/api/*",
  "/rfq/*",
  "/contact/*",
] as const;

/** Lower case, leading slash, no trailing slash, no query or fragment. */
export function normalizePath(raw: string): string {
  let path = raw.trim().split(/[?#]/)[0] ?? "";
  try {
    path = decodeURI(path);
  } catch {
    // A malformed escape is compared as written.
  }
  path = path.toLowerCase().replace(/\/{2,}/g, "/");
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return path || "/";
}

export type RuleResult = { ok: true; rule: string } | { ok: false; reason: string };

/**
 * Checks and normalises one rule as an editor typed it. Full addresses are
 * refused rather than guessed at: a rule for another site would silently
 * never match.
 */
export function normalizeRule(raw: string): RuleResult {
  const value = raw.trim();
  if (!value) return { ok: false, reason: "Empty rule" };
  if (value.length > MAX_RULE_LENGTH) {
    return { ok: false, reason: `Keep each rule under ${MAX_RULE_LENGTH} characters` };
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//")) {
    return { ok: false, reason: `Use a site path such as /products/*, not a full address (${value})` };
  }
  if (/[\s<>"'`\\]/.test(value)) {
    return { ok: false, reason: `Paths cannot contain spaces, quotes or backslashes (${value})` };
  }
  if (/[?#]/.test(value)) {
    return { ok: false, reason: `Leave out the query string and fragment (${value})` };
  }

  const wildcard = value === "*" || value.endsWith("/*");
  const body = value === "*" ? "/" : wildcard ? value.slice(0, -2) || "/" : value;
  if (body.includes("*")) {
    return { ok: false, reason: `A * may only end a rule, as in /products/* (${value})` };
  }

  const path = normalizePath(body);
  return { ok: true, rule: wildcard ? (path === "/" ? "/*" : `${path}/*`) : path };
}

/**
 * Parses the editor's rule list (one per line, or comma separated). Every
 * problem is reported; duplicates are dropped silently.
 */
export function parseRules(text: string): { rules: string[]; errors: string[] } {
  const rules: string[] = [];
  const errors: string[] = [];
  for (const part of text.split(/[\n,]/)) {
    if (!part.trim()) continue;
    const result = normalizeRule(part);
    if (!result.ok) errors.push(result.reason);
    else if (!rules.includes(result.rule)) rules.push(result.rule);
  }
  if (rules.length > MAX_TARGET_RULES) {
    errors.push(`Use at most ${MAX_TARGET_RULES} rules`);
  }
  return { rules: rules.slice(0, MAX_TARGET_RULES), errors };
}

/** Reads stored rules defensively: anything that is not a valid rule is ignored. */
export function storedRules(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => normalizeRule(item))
    .flatMap((result) => (result.ok ? [result.rule] : []))
    .slice(0, MAX_TARGET_RULES);
}

export function matchesRule(path: string, rule: string): boolean {
  const page = normalizePath(path);
  if (rule === "/*") return true;
  if (rule.endsWith("/*")) {
    const base = rule.slice(0, -2);
    return page === base || page.startsWith(`${base}/`);
  }
  return page === rule;
}

export function isAlwaysExcluded(path: string): boolean {
  return ALWAYS_EXCLUDED.some((rule) => matchesRule(path, rule));
}

export function matchesTargeting(
  path: string,
  mode: PopupTargetMode,
  rules: string[],
): boolean {
  if (isAlwaysExcluded(path)) return false;
  const hit = rules.some((rule) => matchesRule(path, rule));
  return mode === "INCLUDE" ? hit : !hit;
}

/** One line for the admin table. */
export function targetingSummary(mode: PopupTargetMode, rules: string[]): string {
  if (rules.length === 0) return mode === "INCLUDE" ? "No pages" : "All pages";
  const first = rules.slice(0, 2).join(", ");
  const more = rules.length > 2 ? ` +${rules.length - 2}` : "";
  return `${mode === "INCLUDE" ? "Only" : "All except"} ${first}${more}`;
}

/* ------------------------------------------------------------ schedule -- */

export type PopupState = "live" | "scheduled" | "expired" | "inactive";

/**
 * Where a popup stands. `inactive` wins over the dates: a switched-off popup
 * is off whatever its schedule says. The start is inclusive, the end
 * exclusive, so back-to-back schedules never overlap.
 */
export function popupState(
  popup: { active: boolean; startsAt: Date | string | null; endsAt: Date | string | null },
  now: Date = new Date(),
): PopupState {
  if (!popup.active) return "inactive";
  const time = now.getTime();
  if (popup.endsAt && new Date(popup.endsAt).getTime() <= time) return "expired";
  if (popup.startsAt && new Date(popup.startsAt).getTime() > time) return "scheduled";
  return "live";
}

export function withinSchedule(
  popup: { startsAt: Date | string | null; endsAt: Date | string | null },
  now: Date = new Date(),
): boolean {
  return popupState({ ...popup, active: true }, now) === "live";
}

/* -------------------------------------------------------------- device -- */

export function matchesDevice(device: PopupDevice, isMobile: boolean): boolean {
  if (device === "ALL") return true;
  return device === "MOBILE" ? isMobile : !isMobile;
}

/** Exit intent needs a pointer leaving the window; a phone has neither. */
export function triggerSupported(trigger: PopupTrigger, isMobile: boolean): boolean {
  return trigger !== "EXIT_INTENT" || !isMobile;
}

/* ----------------------------------------------------------- frequency -- */

const DAY_MS = 24 * 60 * 60 * 1000;

export type DismissalRecord = {
  /** When the visitor closed it, or completed its form. */
  at: number;
  /** The browser session it happened in. */
  session: string;
};

/**
 * Whether a popup the visitor has already closed may open again.
 *
 * frequencyDays 0 means "next visit": never again in the same browser
 * session, and again in a new one. Anything above waits that many days.
 */
export function frequencyAllows(
  record: DismissalRecord | null,
  frequencyDays: number,
  now: number,
  session: string,
): boolean {
  if (!record) return true;
  if (frequencyDays <= 0) return record.session !== session;
  return now - record.at >= frequencyDays * DAY_MS;
}

/* --------------------------------------------------------- choosing one -- */

export type CandidatePopup = {
  id: string;
  priority: number;
  device: PopupDevice;
  trigger: PopupTrigger;
  frequencyDays: number;
  startsAt: string | null;
  endsAt: string | null;
  targetMode: PopupTargetMode;
  targetRules: string[];
};

export type VisitContext = {
  path: string;
  isMobile: boolean;
  now: number;
  session: string;
  dismissals: Record<string, DismissalRecord | undefined>;
};

export function isEligible(popup: CandidatePopup, context: VisitContext): boolean {
  return (
    withinSchedule(popup, new Date(context.now)) &&
    matchesTargeting(context.path, popup.targetMode, popup.targetRules) &&
    matchesDevice(popup.device, context.isMobile) &&
    triggerSupported(popup.trigger, context.isMobile) &&
    frequencyAllows(
      context.dismissals[popup.id] ?? null,
      popup.frequencyDays,
      context.now,
      context.session,
    )
  );
}

/**
 * The one popup this page may show, or null. Highest priority first; ties go
 * to the lower id, so the choice never depends on the order rows arrived in.
 */
export function choosePopup<T extends CandidatePopup>(
  popups: T[],
  context: VisitContext,
): T | null {
  const eligible = popups.filter((popup) => isEligible(popup, context));
  eligible.sort((a, b) => b.priority - a.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return eligible[0] ?? null;
}
