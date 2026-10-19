import { z } from "zod";

/** A downloadable PDF catalogue, as the admin form posts it. */
export const catalogueSchema = z.object({
  title: z.string().trim().min(2, "Enter a title").max(160),
  description: z.string().trim().max(600).default(""),
  fileId: z.string().trim().min(1, "Choose or upload the PDF").max(40),
  coverId: z.string().trim().max(40).default(""),
  gated: z.boolean().default(true),
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]),
});

export const catalogueIdSchema = z.object({ catalogueId: z.string().min(1).max(40) });
