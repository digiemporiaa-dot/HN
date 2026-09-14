import { z } from "zod";

import { emailSchema, passwordSchema } from "./auth";

const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(120, "Name must be 120 characters or fewer");

const phoneSchema = z
  .string()
  .trim()
  .max(32, "Phone number is too long")
  .regex(/^[0-9+()\-.\s]*$/, "Phone number contains invalid characters")
  .optional()
  .transform((value) => (value ? value : null));

export const createStaffSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  roleId: z.string().min(1, "Select a role"),
  // Optional: when omitted a strong temporary password is generated and the
  // account is flagged for a change at first sign-in.
  password: z.union([passwordSchema, z.literal("")]).optional(),
});

export const updateStaffSchema = z.object({
  staffId: z.string().min(1),
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  roleId: z.string().min(1, "Select a role"),
});

export const staffStatusSchema = z.object({
  staffId: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});

export const staffIdSchema = z.object({
  staffId: z.string().min(1),
});

export const permissionOverrideSchema = z.object({
  staffId: z.string().min(1),
  // "MODULE:ACTION" keys, split into explicit grants and revokes.
  granted: z.array(z.string()).max(200),
  revoked: z.array(z.string()).max(200),
});

export const rolePermissionsSchema = z.object({
  roleId: z.string().min(1),
  permissions: z.array(z.string()).max(400),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
