import { z } from "zod";

/**
 * Length is the control that actually matters; composition rules push people
 * towards predictable substitutions. 12 characters minimum, no character-class
 * requirements, with an upper bound because bcrypt silently truncates past 72
 * bytes and a longer input would give a false sense of strength.
 */
export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(72, "Password must be 72 characters or fewer");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .max(254)
  .email("Enter a valid email address");

export const loginSchema = z.object({
  email: emailSchema,
  // Not validated against the password policy: an existing account may predate
  // a policy change, and echoing rules back on sign-in leaks nothing useful.
  password: z.string().min(1, "Password is required").max(72),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password").max(72),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
