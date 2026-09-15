import { z } from "zod";

/** Slugs that would collide with the brand section's own routes. */
export const RESERVED_BRAND_SLUGS = new Set(["new", "all", "search", "api"]);

export const brandSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Enter a URL slug")
  .max(120, "Slug must be 120 characters or fewer")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and hyphens only",
  )
  .refine(
    (value) => !RESERVED_BRAND_SLUGS.has(value),
    "That slug is reserved by the application",
  );

/**
 * A manufacturer's own website.
 *
 * Only absolute https is accepted — this is an outbound link to a third party,
 * so a relative path would be meaningless and any other scheme is a risk on a
 * public page.
 */
export const websiteUrlSchema = z
  .string()
  .trim()
  .max(300)
  .refine(
    (value) => value === "" || /^https:\/\/[^\s]+\.[^\s]+$/i.test(value),
    "Enter a full https:// address, or leave it empty",
  );

export const brandSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(120),
  slug: brandSlugSchema,
  shortDescription: z.string().trim().max(300).default(""),
  description: z.string().trim().max(20000).default(""),
  websiteUrl: websiteUrlSchema.default(""),
  logoId: z.string().trim().max(40).default(""),
  bannerId: z.string().trim().max(40).default(""),
  featured: z.boolean().default(false),
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]),
  /** Category ids the brand supplies, as posted by the checkbox grid. */
  categoryIds: z.array(z.string().min(1)).max(200).default([]),
});

export const brandIdSchema = z.object({ brandId: z.string().min(1) });
