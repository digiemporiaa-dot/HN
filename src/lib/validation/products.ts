import { z } from "zod";

/** Slugs that would collide with the product section's own routes. */
export const RESERVED_PRODUCT_SLUGS = new Set([
  "new",
  "all",
  "search",
  "compare",
  "api",
]);

export const productSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Enter a URL slug")
  .max(160, "Slug must be 160 characters or fewer")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and hyphens only",
  )
  .refine(
    (value) => !RESERVED_PRODUCT_SLUGS.has(value),
    "That slug is reserved by the application",
  );

export const productSchema = z.object({
  name: z.string().trim().min(2, "Enter a product name").max(200),
  slug: productSlugSchema,
  modelNumber: z.string().trim().max(80).default(""),
  shortDescription: z.string().trim().max(400).default(""),
  description: z.string().trim().max(40000).default(""),
  /** Required: a product's category decides its URL and its spec template. */
  categoryId: z.string().min(1, "Choose a category"),
  brandId: z.string().trim().max(40).default(""),
  primaryImageId: z.string().trim().max(40).default(""),
  /** Gallery media ids in display order, posted as JSON. */
  galleryIds: z.array(z.string().min(1)).max(24).default([]),
  specialtyIds: z.array(z.string().min(1)).max(100).default([]),
  solutionIds: z.array(z.string().min(1)).max(100).default([]),
  featured: z.boolean().default(false),
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]),
});

export const productIdSchema = z.object({ productId: z.string().min(1) });
