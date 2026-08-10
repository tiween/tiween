/**
 * Server error CODE → UI plumbing.
 *
 * The venues admin API answers a uniform envelope carrying a SCREAMING_SNAKE
 * code (`error.details.code`) and, for validation failures, per-field `issues`
 * whose `message` is itself a CODE. Nothing on the wire is human-readable by
 * design (project rule: codes, not prose) — everything the editor reads is
 * produced HERE, from the plugin's own translation files.
 */

/** The parsed shape of a failed admin-API call. */
export interface ApiError {
  /** e.g. `VALIDATION_FAILED`, `VENUE_NOT_FOUND`. Never shown raw. */
  code: string
  /** Field path → error CODE, for `Field.Error`. */
  fieldErrors: Record<string, string>
}

/** The last-resort code when a failure carries none (network, proxy, HTML 502…). */
export const UNKNOWN_ERROR_CODE = "INTERNAL_ERROR"

/**
 * HTTP status → CODE, for the failures that legitimately carry no envelope of
 * ours.
 *
 * `admin::hasPermissions` (the RBAC gate on every venues admin route) answers a
 * bare Strapi 403 with no `details.code`, so a role missing
 * `plugin::venues.update` used to be told "An unexpected error occurred."
 * instead of that it lacks the permission. 401 is the session-expiry case the
 * admin's own interceptor may not have caught yet.
 */
const CODE_BY_STATUS: Record<number, string> = {
  401: "NOT_AUTHENTICATED",
  403: "VENUE_FORBIDDEN",
}

interface RawIssue {
  path?: unknown
  message?: unknown
}

/**
 * Pull the code and the per-field codes out of whatever `useFetchClient` threw.
 *
 * `useFetchClient` rejects with an Axios-shaped error, so the envelope is at
 * `err.response.data.error`. A non-HTTP failure (offline, DNS, a proxy that
 * answered HTML) has no envelope at all and must NOT surface as a blank toast —
 * hence the {@link UNKNOWN_ERROR_CODE} fallback, which has its own translation.
 */
export function parseApiError(err: unknown): ApiError {
  const response = (
    err as {
      response?: { status?: unknown; data?: { error?: { details?: unknown } } }
    }
  )?.response

  const envelope = response?.data?.error

  const details = envelope?.details as
    | { code?: unknown; issues?: unknown }
    | undefined

  const status = typeof response?.status === "number" ? response.status : 0

  const code =
    typeof details?.code === "string" && details.code
      ? details.code
      : CODE_BY_STATUS[status] ?? UNKNOWN_ERROR_CODE

  const fieldErrors: Record<string, string> = {}
  if (Array.isArray(details?.issues)) {
    for (const issue of details.issues as RawIssue[]) {
      const path = typeof issue?.path === "string" ? issue.path : ""
      const message = typeof issue?.message === "string" ? issue.message : ""
      // A dotted path (`geo.latitude`) is attached to its ROOT field: the form
      // renders one `Field.Error` per input, and an unattachable issue would
      // otherwise be silently dropped.
      const field = path.split(".")[0]
      if (field && message && !fieldErrors[field]) {
        fieldErrors[field] = message
      }
    }
  }

  return { code, fieldErrors }
}

/**
 * The unprefixed translation key for an error CODE.
 *
 * `messages` is react-intl's ACTIVE catalogue (`useIntl().messages`). A code the
 * catalogue does not know — a new server code, or one added to `fr.json` only —
 * degrades to the generic message instead of rendering the raw
 * `VENUE_WEBSITE_INVALID` at the editor, which is exactly the "never render the
 * raw code" rule in the DS binding sheet.
 */
export function errorTranslationKey(
  code: string,
  messages: Record<string, unknown> | undefined
): string {
  const key = `errors.${code}`
  const known = messages?.[`venues.${key}`] !== undefined
  return known ? key : `errors.${UNKNOWN_ERROR_CODE}`
}
