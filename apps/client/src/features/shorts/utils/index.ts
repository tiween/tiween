import { toNumeralSafeLocale } from "@/lib/intl-locale"

export * from "./crew"
export * from "./fallbackLang"
export * from "./initials"
export * from "./placeNames"

/**
 * Field limits for the public short-film suggestion form. Shared by the client
 * schema (instant, translated feedback) and the API route (the real gate), so
 * the two can never disagree about what is valid.
 */
export const SUGGESTION_LIMITS = {
  title: 200,
  person: 200,
  synopsis: 2000,
  genres: 300,
  place: 100,
  url: 2048,
  name: 120,
  email: 254,
  notes: 1000,
  yearMin: 1900,
  durationMin: 1,
  durationMax: 60,
} as const

/** The latest release year a suggestion may claim (next year's festival cut). */
export function suggestionYearMax(): number {
  return new Date().getFullYear() + 1
}

/** Streaming platforms a suggestion may name; anything else is "other". */
export const SUGGESTION_PLATFORMS = [
  "youtube",
  "vimeo",
  "dailymotion",
  "mubi",
  "netflix",
  "other",
] as const

/**
 * Normalize a CMS-supplied link to something safe to navigate to: a non-blank,
 * absolute `http(s)` URL. Anything else — an empty string, a relative fragment,
 * or a `javascript:` / `data:` scheme — yields `null` and is never opened or
 * used as an `href`.
 */
export function toSafeExternalUrl(
  url: string | undefined | null
): string | null {
  const trimmed = url?.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? trimmed
      : null
  } catch {
    return null
  }
}

/**
 * Open an external URL in a new tab, after validating it. A popup blocker makes
 * `window.open` return `null`, which would otherwise be a silent dead end — so
 * navigate the current tab instead.
 */
export function openExternal(url: string | undefined | null): void {
  const safe = toSafeExternalUrl(url)
  if (!safe) return
  const opened = window.open(safe, "_blank", "noopener,noreferrer")
  if (!opened) window.location.href = safe
}

/** Strip rich-text markup from a CMS field so it renders as plain text. */
export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "")
}

/**
 * A positive, finite number, or `null`. CMS numerics arrive as `0`, `null` or
 * `NaN` when unset, and a bare `{value && …}` guard would render a literal `0`.
 */
export function positiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null
}

/**
 * A count for an ICU plural's `{display}` slot. ICU's own `#` formats with the
 * message locale and can emit Arabic-Indic digits; this never does
 * (`icu-numerals.test.ts` guards the catalog).
 */
export function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(toNumeralSafeLocale(locale)).format(value)
}
