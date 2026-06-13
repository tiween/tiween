/**
 * Shared server-side validation kit.
 *
 * First piece of the shared server kit that story 2C.5 expands. Kept minimal
 * and dependency-free apart from Zod + @strapi/utils so any plugin can reuse it.
 *
 * Usage:
 *   const input = validate(createOrderSchema, ctxBody)
 *
 * On failure it throws a Strapi `ValidationError` carrying an error CODE in
 * `details.code` (project-context rule: error CODES, not prose).
 */
import { errors } from "@strapi/utils"

import type { ZodType } from "zod"

const { ValidationError } = errors

/** Stable error code attached to every validation failure. */
export const VALIDATION_FAILED = "VALIDATION_FAILED"

/**
 * Validate `data` against a Zod schema.
 *
 * @returns the parsed, typed value on success.
 * @throws  Strapi `ValidationError` with `details.code = VALIDATION_FAILED`
 *          (plus the per-field Zod issues) on failure.
 */
export function validate<TSchema extends ZodType>(
  schema: TSchema,
  data: unknown
): ReturnType<TSchema["parse"]> {
  const result = schema.safeParse(data)

  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }))

    throw new ValidationError("Validation failed", {
      code: VALIDATION_FAILED,
      issues,
    })
  }

  return result.data as ReturnType<TSchema["parse"]>
}
