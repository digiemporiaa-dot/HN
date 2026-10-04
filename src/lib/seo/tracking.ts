/**
 * Formats for the identifiers that end up inside a script tag or a meta tag.
 *
 * Checked when the setting is saved and again before anything is rendered, so
 * a value edited straight into the database still cannot inject markup: only
 * strings that match are ever written into the page.
 */
export const GA4_ID = /^G-[A-Z0-9]{4,20}$/;
export const GTM_ID = /^GTM-[A-Z0-9]{4,12}$/;
/** Search Console and Bing tokens: letters, digits, dashes and underscores. */
export const VERIFICATION_TOKEN = /^[A-Za-z0-9_-]{8,100}$/;

export function validId(value: string | null | undefined, pattern: RegExp) {
  const trimmed = value?.trim();
  return trimmed && pattern.test(trimmed) ? trimmed : null;
}
