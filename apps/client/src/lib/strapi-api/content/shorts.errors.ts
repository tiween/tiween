/**
 * Typed errors for the short-film fetchers (D-07, D-08).
 *
 * `BaseStrapiClient.fetchAPI` reports every failure as
 * `new Error(JSON.stringify({ name, message, details, status }))`, so callers
 * cannot branch on anything without parsing it. This module does that once:
 *
 * - only the API's own `SHORT_FILM_NOT_FOUND` (404) is a not-found;
 * - a network failure, abort or timeout is a `NETWORK` error;
 * - everything else (400, 429, 5xx, a non-JSON body, malformed data, even a
 *   404 that did not come from the short-film controller) is an `UPSTREAM`
 *   `INTERNAL_ERROR`, so an outage is never mistaken for a missing film.
 *
 * No `server-only` import: the route handler, the layout and the tests share it.
 */

export type ShortFilmApiErrorKind = "NOT_FOUND" | "NETWORK" | "UPSTREAM"

export type ShortFilmApiErrorCode =
  | "SHORT_FILM_NOT_FOUND"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR"

/** The only error codes a visitor can ever be shown. */
export type ShortFilmUserErrorCode = ShortFilmApiErrorCode

export interface ShortFilmApiErrorInit {
  code: ShortFilmApiErrorCode
  kind: ShortFilmApiErrorKind
  status?: number
  /** The API's own `error.details.code`, kept for logs only. */
  apiCode?: string
  cause?: unknown
}

export class ShortFilmApiError extends Error {
  readonly code: ShortFilmApiErrorCode
  readonly kind: ShortFilmApiErrorKind
  readonly status?: number
  readonly apiCode?: string

  constructor(init: ShortFilmApiErrorInit) {
    super(
      init.code,
      init.cause === undefined ? undefined : { cause: init.cause }
    )
    this.name = "ShortFilmApiError"
    this.code = init.code
    this.kind = init.kind
    this.status = init.status
    this.apiCode = init.apiCode
  }
}

/** Errors a `fetch` call throws when the request never produced a response. */
const NETWORK_ERROR_NAMES = new Set(["TypeError", "AbortError", "TimeoutError"])

interface ParsedFetchFailure {
  status?: number
  apiCode?: string
}

/** Parse the JSON message `BaseStrapiClient.fetchAPI` throws, never throwing. */
function parseFetchFailure(error: Error): ParsedFetchFailure | null {
  try {
    const parsed: unknown = JSON.parse(error.message)
    if (!parsed || typeof parsed !== "object") return null
    const record = parsed as {
      status?: unknown
      details?: { code?: unknown } | null
    }
    return {
      status: typeof record.status === "number" ? record.status : undefined,
      apiCode:
        record.details && typeof record.details.code === "string"
          ? record.details.code
          : undefined,
    }
  } catch {
    return null
  }
}

/** True for a `ShortFilmApiError`, also across duplicated module instances. */
function isShortFilmApiError(error: unknown): error is ShortFilmApiError {
  return (
    error instanceof ShortFilmApiError ||
    (error instanceof Error && error.name === "ShortFilmApiError")
  )
}

/** Collapse anything a fetch can throw into a `ShortFilmApiError`. */
export function toShortFilmApiError(error: unknown): ShortFilmApiError {
  if (isShortFilmApiError(error)) return error

  if (error instanceof Error && NETWORK_ERROR_NAMES.has(error.name)) {
    return new ShortFilmApiError({
      code: "NETWORK_ERROR",
      kind: "NETWORK",
      cause: error,
    })
  }

  const failure = error instanceof Error ? parseFetchFailure(error) : null
  if (failure?.status === 404 && failure.apiCode === "SHORT_FILM_NOT_FOUND") {
    return new ShortFilmApiError({
      code: "SHORT_FILM_NOT_FOUND",
      kind: "NOT_FOUND",
      status: 404,
      apiCode: failure.apiCode,
      cause: error,
    })
  }

  return new ShortFilmApiError({
    code: "INTERNAL_ERROR",
    kind: "UPSTREAM",
    status: failure?.status,
    apiCode: failure?.apiCode,
    cause: error,
  })
}

/** True only for the API's `SHORT_FILM_NOT_FOUND` (or a slug that can never match). */
export function isShortFilmNotFound(error: unknown): boolean {
  return isShortFilmApiError(error) && error.kind === "NOT_FOUND"
}

/**
 * The code a visitor may be shown. Validation and locale codes are our own
 * bug, not something a visitor can act on, so they collapse to
 * `INTERNAL_ERROR`; so does anything unknown.
 */
export function toUserErrorCode(code: string): ShortFilmUserErrorCode {
  switch (code) {
    case "NETWORK_ERROR":
    case "SHORT_FILM_NOT_FOUND":
    case "INTERNAL_ERROR":
      return code
    default:
      return "INTERNAL_ERROR"
  }
}
