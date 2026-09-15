import { z } from "zod";

import { linkSchema } from "@/cms/sections/fields";

/**
 * Navigation links reuse the CMS link rules rather than defining their own.
 *
 * These values become href attributes on every page of the site, so the scheme
 * allowlist that protects section content has to protect the menu too — one
 * permissive path here would be sitewide.
 */
export const navigationItemSchema = z.object({
  label: z.string().trim().min(1, "Enter a label").max(80),
  href: linkSchema,
  description: z.string().trim().max(160).default(""),
  imageId: z.string().trim().max(40).default(""),
  visible: z.boolean().default(true),
  openInNewTab: z.boolean().default(false),
  highlight: z.boolean().default(false),
});

export const menuKeySchema = z.string().trim().min(1).max(40);
export const itemIdSchema = z.object({ itemId: z.string().min(1) });

export const moveItemSchema = z.object({
  itemId: z.string().min(1),
  direction: z.enum(["up", "down"]),
});

export const addItemSchema = z.object({
  menuKey: menuKeySchema,
  parentId: z.string().trim().max(40).default(""),
});
