/**
 * Build-time constants only.
 *
 * Everything an administrator must be able to change — contact details, social
 * profiles, logos, default SEO — belongs in the Settings module (Phase 9) and is
 * read from the database. Do not add such values here.
 */
export const siteConfig = {
  name: "HN Medical System",
  shortDescription:
    "B2B supplier of medical, surgical and hospital equipment to healthcare institutions across India.",
  url: process.env.APP_URL ?? "http://localhost:3000",
} as const;
