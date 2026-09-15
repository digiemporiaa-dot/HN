import { z } from "zod";

import { ANCHOR_ID_PATTERN } from "@/lib/design/section-options";

/**
 * Slugs that a CMS page may not claim.
 *
 * The public site resolves CMS pages through a catch-all route, so a page
 * created at one of these would either shadow a real route or be permanently
 * unreachable behind it. Refusing them at creation is clearer than letting an
 * editor produce a page that silently never appears.
 */
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "login",
  "logout",
  "access-denied",
  "change-password",
  "design-system",
  "products",
  "categories",
  "brands",
  "specialties",
  "solutions",
  "applications",
  "locations",
  "blog",
  "resources",
  "search",
  "compare",
  "rfq",
  "sitemap.xml",
  "robots.txt",
  "_next",
  "home",
]);

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter a URL slug")
  .max(120, "Slug must be 120 characters or fewer")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and hyphens only",
  )
  .refine(
    (value) => !RESERVED_SLUGS.has(value),
    "That slug is reserved by the application",
  );

export const pageSchema = z.object({
  title: z.string().trim().min(2, "Enter a page title").max(200),
  slug: slugSchema,
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]),
});

export const pageIdSchema = z.object({ pageId: z.string().min(1) });

export const addSectionSchema = z.object({
  pageId: z.string().min(1),
  type: z.string().min(1),
});

export const sectionIdSchema = z.object({ sectionId: z.string().min(1) });

export const moveSectionSchema = z.object({
  sectionId: z.string().min(1),
  direction: z.enum(["up", "down"]),
});

export const anchorIdSchema = z
  .string()
  .trim()
  .max(64)
  .refine(
    (value) => value === "" || ANCHOR_ID_PATTERN.test(value),
    "Use lowercase letters, numbers and hyphens, starting with a letter",
  );
