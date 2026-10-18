/**
 * Shared short-film rules (plan 01-02, SDATA-01).
 *
 * One browser-safe module owning the vocabularies, the Zod write validators and
 * the D-19 publish-rule evaluator. It is imported by three consumers in
 * different bundles: the server publish guard (01-06), the events-manager admin
 * WorkForm (01-08/01-09) and the importer (01-10). Phase 3 indexing reads the
 * same lists.
 *
 * WHY it imports `zod` only: the admin bundle imports this file, so no
 * `@strapi/*` and no `node:*` import may appear here (same constraint as
 * `website-url.ts`).
 *
 * Errors are CODES, never prose (project-context rule): validators carry
 * `INVALID_COUNTRY_CODES` / `INVALID_LANGUAGE_CODES` as the issue message and
 * the evaluator returns `ShortFilmIssueCode` values with a field path.
 */
import { z } from "zod"

/**
 * The 249 officially assigned ISO 3166-1 alpha-2 codes, uppercase.
 *
 * Vendored on purpose: `Intl` cannot enumerate regions, and enumerating through
 * it over-accepts (279 two-letter codes resolve in `en`, including
 * non-countries such as `EU`, `UN`, `ZZ`). The unit test checks every entry
 * resolves through `Intl.DisplayNames`, which is how names are rendered.
 */
export const ISO_3166_ALPHA2: readonly string[] = [
  "AD",
  "AE",
  "AF",
  "AG",
  "AI",
  "AL",
  "AM",
  "AO",
  "AQ",
  "AR",
  "AS",
  "AT",
  "AU",
  "AW",
  "AX",
  "AZ",
  "BA",
  "BB",
  "BD",
  "BE",
  "BF",
  "BG",
  "BH",
  "BI",
  "BJ",
  "BL",
  "BM",
  "BN",
  "BO",
  "BQ",
  "BR",
  "BS",
  "BT",
  "BV",
  "BW",
  "BY",
  "BZ",
  "CA",
  "CC",
  "CD",
  "CF",
  "CG",
  "CH",
  "CI",
  "CK",
  "CL",
  "CM",
  "CN",
  "CO",
  "CR",
  "CU",
  "CV",
  "CW",
  "CX",
  "CY",
  "CZ",
  "DE",
  "DJ",
  "DK",
  "DM",
  "DO",
  "DZ",
  "EC",
  "EE",
  "EG",
  "EH",
  "ER",
  "ES",
  "ET",
  "FI",
  "FJ",
  "FK",
  "FM",
  "FO",
  "FR",
  "GA",
  "GB",
  "GD",
  "GE",
  "GF",
  "GG",
  "GH",
  "GI",
  "GL",
  "GM",
  "GN",
  "GP",
  "GQ",
  "GR",
  "GS",
  "GT",
  "GU",
  "GW",
  "GY",
  "HK",
  "HM",
  "HN",
  "HR",
  "HT",
  "HU",
  "ID",
  "IE",
  "IL",
  "IM",
  "IN",
  "IO",
  "IQ",
  "IR",
  "IS",
  "IT",
  "JE",
  "JM",
  "JO",
  "JP",
  "KE",
  "KG",
  "KH",
  "KI",
  "KM",
  "KN",
  "KP",
  "KR",
  "KW",
  "KY",
  "KZ",
  "LA",
  "LB",
  "LC",
  "LI",
  "LK",
  "LR",
  "LS",
  "LT",
  "LU",
  "LV",
  "LY",
  "MA",
  "MC",
  "MD",
  "ME",
  "MF",
  "MG",
  "MH",
  "MK",
  "ML",
  "MM",
  "MN",
  "MO",
  "MP",
  "MQ",
  "MR",
  "MS",
  "MT",
  "MU",
  "MV",
  "MW",
  "MX",
  "MY",
  "MZ",
  "NA",
  "NC",
  "NE",
  "NF",
  "NG",
  "NI",
  "NL",
  "NO",
  "NP",
  "NR",
  "NU",
  "NZ",
  "OM",
  "PA",
  "PE",
  "PF",
  "PG",
  "PH",
  "PK",
  "PL",
  "PM",
  "PN",
  "PR",
  "PS",
  "PT",
  "PW",
  "PY",
  "QA",
  "RE",
  "RO",
  "RS",
  "RU",
  "RW",
  "SA",
  "SB",
  "SC",
  "SD",
  "SE",
  "SG",
  "SH",
  "SI",
  "SJ",
  "SK",
  "SL",
  "SM",
  "SN",
  "SO",
  "SR",
  "SS",
  "ST",
  "SV",
  "SX",
  "SY",
  "SZ",
  "TC",
  "TD",
  "TF",
  "TG",
  "TH",
  "TJ",
  "TK",
  "TL",
  "TM",
  "TN",
  "TO",
  "TR",
  "TT",
  "TV",
  "TW",
  "TZ",
  "UA",
  "UG",
  "UM",
  "US",
  "UY",
  "UZ",
  "VA",
  "VC",
  "VE",
  "VG",
  "VI",
  "VN",
  "VU",
  "WF",
  "WS",
  "YE",
  "YT",
  "ZA",
  "ZM",
  "ZW",
]

/** D-02 curated language list; the tail (es, it, de) is the discretionary short tail. */
export const SHORT_FILM_LANGUAGE_CODES = [
  "aeb",
  "ar",
  "fr",
  "en",
  "ber",
  "none",
  "es",
  "it",
  "de",
] as const

/** D-18: the directory pins Tunisia / Tunisian Arabic first in its pickers. */
export const PINNED_COUNTRY_CODE = "TN"
export const PINNED_LANGUAGE_CODE = "aeb"

/** D-03 (platform list is discretionary beyond the locked entries). */
export const STREAMING_PLATFORMS = [
  "youtube",
  "vimeo",
  "dailymotion",
  "artify",
  "arte",
  "mubi",
  "netflix",
  "shahid",
  "tv5monde",
  "other",
] as const

export const STREAMING_ACCESS_TYPES = [
  "free",
  "included",
  "subscription",
  "rental",
] as const

/** Credit-role SLUGS that count as directing. Never matched by localized name. */
export const DIRECTING_ROLE_SLUGS = ["director"] as const

/** Distinction results that count as an award (D-04 `hasAwards`). */
export const AWARD_RESULTS = [
  "winner",
  "grand-prize",
  "special-mention",
  "honorable-mention",
] as const

/** D-19: a duration above this is a warning only, never a blocker. */
export const SHORT_FILM_DURATION_WARNING_MINUTES = 40

export const SHORT_FILM_ISSUE_CODES = [
  "SLUG_REQUIRED",
  "SLUG_RESERVED",
  "POSTER_REQUIRED",
  "DIRECTOR_REQUIRED",
  "DIRECTOR_UNPUBLISHED",
  "WATCH_SOURCE_REQUIRED",
] as const

export type ShortFilmIssueCode = (typeof SHORT_FILM_ISSUE_CODES)[number]

/** Slugs that would collide with a literal route segment (`/short-films/featured`). */
export const RESERVED_SHORT_FILM_SLUGS = ["featured"] as const

/** The only rule the D-20 bypass may skip. */
const SKIPPABLE_ISSUE_CODES: readonly ShortFilmIssueCode[] = ["POSTER_REQUIRED"]

const MAX_CODES = 10
const ISO_SET: ReadonlySet<string> = new Set(ISO_3166_ALPHA2)
const LANGUAGE_SET: ReadonlySet<string> = new Set(SHORT_FILM_LANGUAGE_CODES)

/**
 * `null`/`undefined` are valid (omitted = unknown). Otherwise: an array of at
 * most MAX_CODES unique entries, each an exact member of `allowed`. Codes are
 * never normalized: `tn` is rejected, not upgraded to `TN`.
 */
function isValidCodeList(value: unknown, allowed: ReadonlySet<string>) {
  if (value === null || value === undefined) return true
  if (!Array.isArray(value)) return false
  if (value.length > MAX_CODES) return false
  if (new Set(value).size !== value.length) return false
  return value.every((code) => typeof code === "string" && allowed.has(code))
}

/**
 * True only for an absolute `https:` URL. Streaming-link URLs are rendered as
 * public links, so `javascript:`, `data:` and `http:` must never pass: the
 * admin form, the server write guard and the public projection all use this.
 */
export function isHttpsUrl(value: unknown): boolean {
  if (typeof value !== "string") return false
  try {
    return new URL(value.trim()).protocol === "https:"
  } catch {
    return false
  }
}

/** null, undefined or an array (max 10, unique) of ISO 3166-1 alpha-2 codes. */
export const countryCodesSchema = z.custom<string[] | null | undefined>(
  (value) => isValidCodeList(value, ISO_SET),
  { message: "INVALID_COUNTRY_CODES" }
)

/**
 * null, undefined or an array (max 10, unique) of curated language codes.
 * `none` means "no spoken language" and must be the only entry.
 */
export const languageCodesSchema = z.custom<string[] | null | undefined>(
  (value) =>
    isValidCodeList(value, LANGUAGE_SET) &&
    !(Array.isArray(value) && value.includes("none") && value.length > 1),
  { message: "INVALID_LANGUAGE_CODES" }
)

export interface ShortFilmRuleInput {
  slug?: string | null
  poster?: unknown
  credits?: Array<{
    creditRole?: { slug?: string | null } | null
    person?: { documentId?: string | null } | null
  }> | null
  streamingLinks?: unknown[] | null
  videos?: Array<{ videoType?: string | null }> | null
  duration?: number | null
}

export interface ShortFilmRuleResult {
  ok: boolean
  issues: Array<{ code: ShortFilmIssueCode; path: string }>
  warnings: Array<{ code: "DURATION_OVER_40_MINUTES"; path: "duration" }>
}

type Credit = NonNullable<ShortFilmRuleInput["credits"]>[number]

/** True when the credit's credit-role SLUG is a directing role. */
export function isDirectingCredit(credit: Credit): boolean {
  const slug = credit?.creditRole?.slug
  return (
    typeof slug === "string" &&
    (DIRECTING_ROLE_SLUGS as readonly string[]).includes(slug)
  )
}

function hasPoster(poster: unknown): boolean {
  if (typeof poster === "number") return poster > 0
  return typeof poster === "object" && poster !== null
}

function hasStreamingLink(input: Pick<ShortFilmRuleInput, "streamingLinks">) {
  return Array.isArray(input.streamingLinks) && input.streamingLinks.length > 0
}

function hasVideoOfType(
  input: Pick<ShortFilmRuleInput, "videos">,
  videoType: string
) {
  return (
    Array.isArray(input.videos) &&
    input.videos.some((video) => video?.videoType === videoType)
  )
}

/**
 * D-19 publish rules for a short film. Issues come back in a fixed order:
 * slug, poster, director, watch source.
 *
 * `options.publishedPersonIds`, when supplied, enables the DIRECTOR_UNPUBLISHED
 * check (a directing credit whose person is not published). Without it that
 * check is skipped, so callers that cannot resolve person state still work.
 *
 * `options.skip` may only contain POSTER_REQUIRED (the D-20 bypass); anything
 * else throws `SKIP_NOT_ALLOWED` so the bypass cannot widen.
 */
export function evaluateShortFilmPublishRules(
  input: ShortFilmRuleInput,
  options: {
    skip?: readonly ShortFilmIssueCode[]
    publishedPersonIds?: ReadonlySet<string>
  } = {}
): ShortFilmRuleResult {
  const skip = options.skip ?? []
  if (skip.some((code) => !SKIPPABLE_ISSUE_CODES.includes(code))) {
    throw new Error("SKIP_NOT_ALLOWED")
  }

  const issues: ShortFilmRuleResult["issues"] = []
  const warnings: ShortFilmRuleResult["warnings"] = []

  const slug = typeof input.slug === "string" ? input.slug.trim() : ""
  if (slug === "") {
    issues.push({ code: "SLUG_REQUIRED", path: "slug" })
  } else if ((RESERVED_SHORT_FILM_SLUGS as readonly string[]).includes(slug)) {
    issues.push({ code: "SLUG_RESERVED", path: "slug" })
  }

  if (!hasPoster(input.poster) && !skip.includes("POSTER_REQUIRED")) {
    issues.push({ code: "POSTER_REQUIRED", path: "poster" })
  }

  const directing = (input.credits ?? []).filter(isDirectingCredit)
  if (directing.length === 0) {
    issues.push({ code: "DIRECTOR_REQUIRED", path: "credits" })
  } else if (options.publishedPersonIds) {
    const published = options.publishedPersonIds
    const anyPublished = directing.some((credit) => {
      const id = credit.person?.documentId
      return typeof id === "string" && published.has(id)
    })
    if (!anyPublished) {
      issues.push({ code: "DIRECTOR_UNPUBLISHED", path: "credits" })
    }
  }

  if (!hasStreamingLink(input) && !hasVideoOfType(input, "trailer")) {
    issues.push({ code: "WATCH_SOURCE_REQUIRED", path: "streamingLinks" })
  }

  if (
    typeof input.duration === "number" &&
    input.duration > SHORT_FILM_DURATION_WARNING_MINUTES
  ) {
    warnings.push({ code: "DURATION_OVER_40_MINUTES", path: "duration" })
  }

  return { ok: issues.length === 0, issues, warnings }
}

/**
 * D-04 derived, never stored: a short film is available online when it has a
 * streaming link or a `full-length` video.
 */
export function isAvailableOnline(input: {
  streamingLinks?: unknown[] | null
  videos?: Array<{ videoType?: string | null }> | null
}): boolean {
  return hasStreamingLink(input) || hasVideoOfType(input, "full-length")
}

/** D-04 derived, never stored: any distinction whose result is an award. */
export function hasAwards(input: {
  distinctions?: Array<{ result?: string | null }> | null
}): boolean {
  return (
    Array.isArray(input.distinctions) &&
    input.distinctions.some((distinction) =>
      (AWARD_RESULTS as readonly string[]).includes(distinction?.result ?? "")
    )
  )
}
