import { z } from "zod";

/** Slugs that would collide with the application section's own routes. */
export const RESERVED_APPLICATION_SLUGS = new Set(["new", "all"]);

export const applicationSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Enter a URL slug")
  .max(140, "Slug must be 140 characters or fewer")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and hyphens only",
  )
  .refine(
    (value) => !RESERVED_APPLICATION_SLUGS.has(value),
    "That slug is reserved by the application",
  );

export const applicationSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(120),
  slug: applicationSlugSchema,
  description: z.string().trim().max(2000).default(""),
});

export const applicationIdSchema = z.object({
  applicationId: z.string().min(1),
});
