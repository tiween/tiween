/**
 * Extract the backend SCREAMING_SNAKE error CODE from a thrown API error
 * (Story 6.3).
 *
 * `BaseStrapiClient.fetchAPI` throws `new Error(JSON.stringify(appError))` where
 * `appError.details` carries the `{ code }` our checkout controller returns.
 * The UI translates the code via the `ticketing` i18n namespace, never the raw
 * message (error CODES, not prose).
 */
export function extractErrorCode(err: unknown): string {
  if (err instanceof Error) {
    try {
      const parsed = JSON.parse(err.message) as {
        details?: { code?: unknown }
      }
      const code = parsed?.details?.code
      if (typeof code === "string" && code.length > 0) {
        return code
      }
    } catch {
      // Not a JSON-encoded AppError; fall through.
    }
  }
  return "UNKNOWN_ERROR"
}
