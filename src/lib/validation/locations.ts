import { z } from "zod";

/**
 * States and cities.
 *
 * City pages live at /locations/<slug>. The slug is unique across India rather
 * than within a state, which keeps the address to one segment; the rare city
 * whose name exists in two states takes a disambiguated slug.
 */

/** Segments a city slug may not take, because /locations/<segment> means something else. */
export const RESERVED_CITY_SLUGS = new Set(["new", "all", "search", "api"]);

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Enter a URL slug")
  .max(80, "Slug must be 80 characters or fewer")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and hyphens only",
  );

export const STATE_KINDS = [
  { value: "STATE", label: "State" },
  { value: "UNION_TERRITORY", label: "Union territory" },
] as const;

export const stateSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(80),
  slug: slugSchema,
  /** ISO 3166-2:IN code, e.g. MH. Optional reference data. */
  code: z
    .string()
    .trim()
    .toUpperCase()
    .max(3)
    .refine(
      (value) => value === "" || /^[A-Z]{2,3}$/.test(value),
      "Two or three letters, like MH",
    )
    .default(""),
  kind: z.enum(["STATE", "UNION_TERRITORY"]),
  active: z.boolean().default(true),
});

export const citySchema = z.object({
  stateId: z.string().trim().min(1, "Choose a state"),
  name: z.string().trim().min(2, "Enter the city's name").max(80),
  slug: slugSchema.refine(
    (value) => !RESERVED_CITY_SLUGS.has(value),
    "That slug is reserved by the application",
  ),
  headline: z.string().trim().max(160).default(""),
  heroImageId: z.string().trim().max(40).default(""),
  intro: z.string().trim().max(600).default(""),
  content: z.string().trim().max(20000).default(""),
  coverage: z.string().trim().max(20000).default(""),
  ctaHeading: z.string().trim().max(160).default(""),
  ctaBody: z.string().trim().max(600).default(""),
  ctaLabel: z.string().trim().max(40).default(""),
  seoTitle: z
    .string()
    .trim()
    .max(70, "Search engines cut titles off after about 60 characters")
    .default(""),
  seoDescription: z
    .string()
    .trim()
    .max(170, "Search engines cut descriptions off after about 155 characters")
    .default(""),
  indexable: z.boolean().default(false),
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]),
});

/** The fields a new city starts with. Everything else is written afterwards. */
export const newCitySchema = citySchema.pick({
  stateId: true,
  name: true,
  slug: true,
});

/** What a city page features, each list in the order it is shown. */
export const MAX_CITY_LINKS = 24;

export const cityLinksSchema = z.object({
  cityId: z.string().min(1),
  categoryIds: z
    .array(z.string().trim().min(1))
    .max(MAX_CITY_LINKS, `${MAX_CITY_LINKS} categories is the limit`),
  productIds: z
    .array(z.string().trim().min(1))
    .max(MAX_CITY_LINKS, `${MAX_CITY_LINKS} products is the limit`),
  specialtyIds: z
    .array(z.string().trim().min(1))
    .max(MAX_CITY_LINKS, `${MAX_CITY_LINKS} specialties is the limit`),
});

export const cityIdSchema = z.object({ cityId: z.string().min(1) });
export const stateIdSchema = z.object({ stateId: z.string().min(1) });
