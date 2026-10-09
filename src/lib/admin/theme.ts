/**
 * The admin's light/dark appearance.
 *
 * The visitor's choice (light, dark or system) is kept in localStorage; the
 * theme in effect is always light or dark and lives on
 * <html data-admin-theme>. Every rule that reads it is scoped to `.admin-ui`,
 * so a leftover attribute after leaving the admin changes nothing on the
 * public site.
 */

export type AdminThemePreference = "light" | "dark" | "system";
export type AdminAppliedTheme = "light" | "dark";

export const ADMIN_THEME_KEY = "hn:admin:theme";
export const ADMIN_THEME_ATTRIBUTE = "data-admin-theme";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

export function isThemePreference(value: unknown): value is AdminThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function resolveTheme(preference: AdminThemePreference, systemPrefersDark: boolean): AdminAppliedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

/**
 * Runs before the first paint (inline, with the request's CSP nonce), so the
 * admin never flashes the wrong theme. First visit: the operating system's.
 */
export const ADMIN_THEME_SCRIPT = `(function(){try{var p=localStorage.getItem(${JSON.stringify(ADMIN_THEME_KEY)});if(p!=="light"&&p!=="dark")p="system";var d=p==="dark"||(p==="system"&&matchMedia(${JSON.stringify(DARK_QUERY)}).matches);document.documentElement.setAttribute(${JSON.stringify(ADMIN_THEME_ATTRIBUTE)},d?"dark":"light");}catch(e){}})();`;
