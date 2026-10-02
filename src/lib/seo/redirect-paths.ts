/**
 * Redirect addresses.
 *
 * Pure functions shared by the admin form, the server actions and the
 * middleware, so an address is normalised exactly the same way when it is
 * saved as when a visitor's request is matched against it.
 */

/** Prefixes that belong to the application and can never be redirected. */
export const SYSTEM_PREFIXES = [
  "/admin",
  "/api",
  "/_next",
  "/login",
  "/logout",
  "/access-denied",
  "/change-password",
] as const;

const MAX_PATH = 500;
const MAX_TARGET = 1000;

function safeDecode(value: string): string {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
}

/**
 * The canonical form of an old address: lower case, one leading slash, no
 * trailing slash, no query string or fragment. A full URL pasted from an old
 * site is accepted and reduced to its path, since that is the part that
 * arrives here.
 */
export function normalisePath(raw: string): string {
  let value = raw.trim();
  if (/^https?:\/\//i.test(value)) {
    try {
      value = new URL(value).pathname;
    } catch {
      // Left as typed; validation reports it.
    }
  }
  value = value.split(/[?#]/)[0] ?? "";
  value = safeDecode(value).toLowerCase();
  value = `/${value}`.replace(/\/{2,}/g, "/");
  if (value.length > 1) value = value.replace(/\/+$/, "");
  return value || "/";
}

export function isSystemPath(path: string): boolean {
  return SYSTEM_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/** Why an old address cannot be redirected, or null when it can. */
export function fromPathProblem(raw: string): string | null {
  if (!raw.trim()) return "Enter the old address";
  const path = normalisePath(raw);
  if (path === "/") return "The homepage cannot be redirected";
  if (path.length > MAX_PATH) return "That address is too long";
  if (/[\s<>"]/.test(path)) return "Addresses cannot contain spaces";
  if (isSystemPath(path)) {
    return "That address belongs to the application and cannot be redirected";
  }
  return null;
}

export type TargetKind = "internal" | "external";

/**
 * Where a redirect may lead: a path on this site, which may carry a query
 * string or fragment, or a full http(s) address elsewhere. Anything else —
 * protocol-relative URLs, javascript:, mailto: — is refused, so a redirect can
 * never be turned into something other than a page load.
 */
export function targetKind(raw: string): TargetKind | null {
  const value = raw.trim();
  if (!value || value.length > MAX_TARGET || /\s/.test(value)) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return "internal";
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return url.hostname ? "external" : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function targetProblem(raw: string): string | null {
  if (!raw.trim()) return "Enter where it should go";
  return targetKind(raw)
    ? null
    : "Use a path on this site, like /products/name, or a full https:// address";
}

/** The path part of an internal target, normalised for comparison. */
export function internalTargetPath(target: string): string | null {
  return targetKind(target) === "internal" ? normalisePath(target) : null;
}
