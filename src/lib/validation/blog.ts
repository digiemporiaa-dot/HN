import { z } from "zod";

/** /blog/new is the admin's, and /blog/page/2 is pagination. */
export const RESERVED_POST_SLUGS = new Set(["new", "page", "feed", "all"]);

export const postSlugSchema = z
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
    (value) => !RESERVED_POST_SLUGS.has(value),
    "That slug is reserved by the application",
  );

export const postSchema = z.object({
  title: z.string().trim().min(2, "Enter a title").max(200),
  slug: postSlugSchema,
  excerpt: z
    .string()
    .trim()
    .max(300, "Keep the summary under 300 characters")
    .transform((value) => value || null),
  authorName: z
    .string()
    .trim()
    .max(120)
    .transform((value) => value || null),
  coverId: z
    .string()
    .trim()
    .max(40)
    .transform((value) => value || null),
  featured: z.boolean(),
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]),
});

export type PostInput = z.infer<typeof postSchema>;
