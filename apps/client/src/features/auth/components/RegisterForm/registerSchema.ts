import { z } from "zod"

/**
 * Register form validation schema
 *
 * Returns error CODES (not messages) for i18n translation in UI
 * Following project convention: errors are codes like "INVALID_EMAIL"
 */
export const registerSchema = z
  .object({
    name: z.string().min(1, "REQUIRED").min(2, "NAME_TOO_SHORT"),
    email: z.string().min(1, "REQUIRED").email("INVALID_EMAIL"),
    password: z.string().min(1, "REQUIRED").min(8, "PASSWORD_TOO_SHORT"),
    confirmPassword: z.string().min(1, "REQUIRED"),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "TERMS_REQUIRED" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "PASSWORDS_DONT_MATCH",
    path: ["confirmPassword"],
  })

export type RegisterFormData = z.infer<typeof registerSchema>

/**
 * Password strength levels
 */
export type PasswordStrength = "weak" | "medium" | "strong"

/**
 * Calculate password strength based on complexity
 *
 * @param password - The password to evaluate
 * @returns The strength level: "weak", "medium", or "strong"
 */
export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return "weak"

  const hasNumber = /\d/.test(password)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)

  const score = [hasNumber, hasSpecial, hasUpper, hasLower].filter(
    Boolean
  ).length

  if (score >= 3) return "strong"
  if (score >= 2) return "medium"
  return "weak"
}
