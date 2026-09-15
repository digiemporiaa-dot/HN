import { z } from "zod";

/**
 * Slugs that would collide with the catalogue's own routes.
 *
 * A category lives at /categories/<slug>, so these are only a problem where a
 * segment is reserved beneath that prefix rather than site-wide.
 */
export const RESERVED_CATEGORY_SLUGS = new Set(["new", "all", "search", "api"]);

export const categorySlugSchema = z
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
    (value) => !RESERVED_CATEGORY_SLUGS.has(value),
    "That slug is reserved by the application",
  );

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(120),
  slug: categorySlugSchema,
  shortDescription: z.string().trim().max(300).default(""),
  description: z.string().trim().max(20000).default(""),
  imageId: z.string().trim().max(40).default(""),
  bannerId: z.string().trim().max(40).default(""),
  featured: z.boolean().default(false),
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]),
});

export const createCategorySchema = categorySchema.extend({
  /** Empty for a top-level category. */
  parentId: z.string().trim().max(40).default(""),
});

export const categoryIdSchema = z.object({
  categoryId: z.string().min(1),
});

export const moveCategorySchema = z.object({
  categoryId: z.string().min(1),
  direction: z.enum(["up", "down"]),
});
