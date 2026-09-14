/**
 * Build-time constants only.
 *
 * Everything an administrator can change — company name, contact details,
 * logos, default SEO, brand colours — lives in the Settings module and is read
 * from the database. Nothing belongs here unless it is fixed at deploy time.
 */

export function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

/**
 * Fallback name used before the database is reachable — for example on an error
 * page rendered when a query has failed. The real name comes from settings.
 */
export const FALLBACK_COMPANY_NAME = "HN Medical System";
