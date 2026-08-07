/**
 * Shared URL-state mechanism for the events listing filters (Story 3.3).
 *
 * This is the small, typed parse/serialize layer the listing route and its
 * client island both go through, and the surface Stories 3.4 (region/city) and
 * 3.5 (venue) extend without a rewrite. It is intentionally
 * dependency-free (no `server-only`, no React) so it runs on the server RSC, in
 * the client island, and in unit tests alike.
 *
 * The `date` (Story 3.3), `region` / `city` (Story 3.4), `venue` (Story 3.5)
 * and `category` (Story 3.2) params are the filters this mechanism *acts on*.
 *
 * `category` is one of the five discovery tokens
 * (`cinema|theater|shorts|music|exhibitions`); anything else is dropped —
 * treated as no filter, like a malformed `date`.
 *
 * `region` / `city` / `venue` are opaque, locale-stable Strapi `documentId`
 * tokens (NOT localized slugs): any non-empty string is accepted and
 * round-tripped so a remembered/shared URL stays valid across FR/EN/AR.
 *
 * `date` grammar (single, extensible param):
 * - preset `today` | `tomorrow` | `weekend`
 * - a single day `YYYY-MM-DD`
 * - a custom range `YYYY-MM-DD..YYYY-MM-DD` (inclusive, `start <= end`)
 * Anything else (malformed / inverted range) is dropped — treated as no filter.
 */

/** The presets exposed by the listing date filter UI. */
export type DatePreset = "today" | "tomorrow" | "weekend"

/**
 * A typed representation of the active date selection, emitted by the filter
 * control and derived from the URL token. `none` means "no date filter".
 */
export type DateFilterValue =
  | { type: "none" }
  | { type: "today" }
  | { type: "tomorrow" }
  | { type: "weekend" }
  | { type: "day"; date: string }
  | { type: "range"; start: string; end: string }

/** The discovery category tokens accepted in the URL (Story 3.2). */
export const CATEGORY_TOKENS = [
  "cinema",
  "theater",
  "shorts",
  "music",
  "exhibitions",
] as const

/** A validated discovery category URL token (Story 3.2). */
export type EventCategoryToken = (typeof CATEGORY_TOKENS)[number]

/** True when `token` is one of the five discovery category tokens. */
export function isCategoryToken(
  token: string | null | undefined
): token is EventCategoryToken {
  return (
    typeof token === "string" &&
    (CATEGORY_TOKENS as readonly string[]).includes(token)
  )
}

/**
 * Parsed, validated filter state. `date` holds the canonical serialized token
 * (preset / `YYYY-MM-DD` / range) or `undefined` when there is no valid filter.
 */
export interface EventFilters {
  date?: string
  /** Story 3.2 — validated discovery token (invalid values dropped), filtered on. */
  category?: EventCategoryToken
  /** Story 3.4 — region `documentId` (opaque, locale-stable), filtered on. */
  region?: string
  /** Story 3.4 — city `documentId` (opaque, locale-stable), filtered on. */
  city?: string
  /** Story 3.5 — venue `documentId` (opaque, locale-stable), filtered on. */
  venue?: string
}

const DATE_PRESETS: readonly DatePreset[] = ["today", "tomorrow", "weekend"]
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

/** True when `token` is a real calendar day (rejects `2026-13-40` etc.). */
function isValidCalendarDay(token: string): boolean {
  if (!DAY_RE.test(token)) return false
  const [y, m, d] = token.split("-").map(Number) as [number, number, number]
  const probe = new Date(Date.UTC(y, m - 1, d))
  return (
    probe.getUTCFullYear() === y &&
    probe.getUTCMonth() === m - 1 &&
    probe.getUTCDate() === d
  )
}

/**
 * Normalize a raw `date` URL token into a typed {@link DateFilterValue}.
 * Invalid, empty, or inverted values resolve to `{ type: "none" }`.
 */
export function parseDateValue(token?: string | null): DateFilterValue {
  if (!token) return { type: "none" }

  if ((DATE_PRESETS as readonly string[]).includes(token)) {
    return { type: token as DatePreset }
  }

  if (token.includes("..")) {
    const parts = token.split("..")
    if (parts.length !== 2) return { type: "none" }
    const [start, end] = parts as [string, string]
    if (!isValidCalendarDay(start) || !isValidCalendarDay(end)) {
      return { type: "none" }
    }
    // Inverted range → no filter.
    if (start > end) return { type: "none" }
    return { type: "range", start, end }
  }

  if (isValidCalendarDay(token)) return { type: "day", date: token }

  return { type: "none" }
}

/** Serialize a {@link DateFilterValue} back to its canonical URL token. */
export function serializeDateValue(value: DateFilterValue): string | undefined {
  switch (value.type) {
    case "none":
      return undefined
    case "today":
    case "tomorrow":
    case "weekend":
      return value.type
    case "day":
      return value.date
    case "range":
      return `${value.start}..${value.end}`
  }
}

/** Shape that exposes `get(name)` (URLSearchParams / ReadonlyURLSearchParams). */
interface SearchParamGetter {
  get(name: string): string | null
}

/** Anything the RSC or client island can hand us as "the search params". */
export type EventFiltersInput =
  | SearchParamGetter
  | Record<string, string | string[] | undefined>

function hasGet(input: EventFiltersInput): input is SearchParamGetter {
  return (
    typeof input === "object" &&
    input !== null &&
    typeof (input as { get?: unknown }).get === "function"
  )
}

/** Read a single param value from either a URLSearchParams or a plain record. */
function readParam(input: EventFiltersInput, key: string): string | undefined {
  if (hasGet(input)) {
    return input.get(key) ?? undefined
  }
  const value = input[key]
  if (Array.isArray(value)) return value[0]
  return value ?? undefined
}

function readReserved(
  input: EventFiltersInput,
  key: string
): string | undefined {
  const value = readParam(input, key)
  return value && value.length > 0 ? value : undefined
}

/**
 * Parse the raw search params into a validated {@link EventFilters}. The `date`
 * and `category` tokens are validated (invalid values dropped ⇒ no filter);
 * `region`/`city`/`venue` are opaque non-empty documentId tokens.
 */
export function parseEventFilters(input: EventFiltersInput): EventFilters {
  const date = serializeDateValue(parseDateValue(readParam(input, "date")))
  const rawCategory = readParam(input, "category")
  const category = isCategoryToken(rawCategory) ? rawCategory : undefined
  const region = readReserved(input, "region")
  const city = readReserved(input, "city")
  const venue = readReserved(input, "venue")
  return {
    ...(date ? { date } : {}),
    ...(category ? { category } : {}),
    ...(region ? { region } : {}),
    ...(city ? { city } : {}),
    ...(venue ? { venue } : {}),
  }
}

/**
 * Serialize {@link EventFilters} into a `URLSearchParams`, omitting empty keys.
 * Every sibling filter is round-tripped so changing one axis never drops
 * another.
 */
export function serializeEventFilters(filters: EventFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.date) params.set("date", filters.date)
  if (filters.category) params.set("category", filters.category)
  if (filters.region) params.set("region", filters.region)
  if (filters.city) params.set("city", filters.city)
  if (filters.venue) params.set("venue", filters.venue)
  return params
}
