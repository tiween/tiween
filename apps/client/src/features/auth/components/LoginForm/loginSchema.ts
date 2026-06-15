import { z } from "zod"

/**
 * Login form validation schema
 *
 * Returns error CODES (not messages) for i18n translation in UI
 * Following project convention: errors are codes like "INVALID_EMAIL"
 */
export const loginSchema = z.object({
  email: z.string().min(1, "REQUIRED").email("INVALID_EMAIL"),
  password: z.string().min(1, "REQUIRED"),
})

export type LoginFormData = z.infer<typeof loginSchema>
