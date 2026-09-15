import { z } from "zod";

/** Slugs that would collide with the solution section's own routes. */
export const RESERVED_SOLUTION_SLUGS = new Set(["new", "all", "search", "api"]);

export const solutionSlugSchema = z
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
    (value) => !RESERVED_SOLUTION_SLUGS.has(value),
    "That slug is reserved by the application",
  );

export const solutionSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(120),
  slug: solutionSlugSchema,
  shortDescription: z.string().trim().max(300).default(""),
  description: z.string().trim().max(20000).default(""),
  imageId: z.string().trim().max(40).default(""),
  bannerId: z.string().trim().max(40).default(""),
  featured: z.boolean().default(false),
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]),
  /** Category ids this solution includes, posted from the picker's state. */
  categoryIds: z.array(z.string().min(1)).max(200).default([]),
});

export const solutionIdSchema = z.object({ solutionId: z.string().min(1) });
