import dayjs from "dayjs"

import "dayjs/locale/ar"
import "dayjs/locale/fr"

import localizedFormat from "dayjs/plugin/localizedFormat"
import timezone from "dayjs/plugin/timezone"
import utc from "dayjs/plugin/utc"

export const DATE_FORMAT = "DD/MM/YYYY"
export const TIME_FORMAT = "HH:mm"
export const DATE_TIME_FORMAT = "DD/MM/YYYY HH:mm"

// Tunisia timezone
const TIMEZONE = "Africa/Tunis"

export const setupDayJs = () => {
  dayjs.extend(utc)
  dayjs.extend(timezone)
  dayjs.extend(localizedFormat)
  dayjs.tz.setDefault(TIMEZONE)
}

// Initialize dayjs plugins
setupDayJs()

/**
 * Format a date string for display
 * Uses Western numerals for Arabic locale as per Tunisian convention
 */
export function formatDate(
  date: string | Date | undefined,
  locale?: string,
  format = DATE_FORMAT
): string {
  if (!date) return ""

  const d = dayjs(date)

  // For Arabic, we still use Western numerals (Tunisian convention)
  // but can use Arabic locale for day/month names if needed
  if (locale === "ar") {
    // Use French locale formatting with Western numerals
    return d.locale("fr").format(format)
  }

  return d.locale(locale || "fr").format(format)
}

/**
 * Format a date range
 */
export function formatDateRange(
  startDate: string,
  endDate: string,
  locale?: string,
  format = DATE_FORMAT
): string {
  const start = dayjs(startDate)
  const end = dayjs(endDate)

  if (end.isSame(start, "day")) {
    return formatDate(startDate, locale, format)
  }

  if (end.isSame(start, "month")) {
    return `${start.format("DD")}–${formatDate(endDate, locale, format)}`
  }

  if (!end.isSame(start, "month") && end.isSame(start, "year")) {
    return `${start.format("DD/MM")}–${formatDate(endDate, locale, format)}`
  }

  return `${formatDate(startDate, locale, format)}–${formatDate(endDate, locale, format)}`
}

/**
 * Format time for display
 */
export function formatTime(
  time: string | Date | undefined,
  _locale?: string
): string {
  if (!time) return ""
  return dayjs(time).format(TIME_FORMAT)
}

/**
 * Get today's date formatted
 */
export function getToday(format = DATE_FORMAT): string {
  return dayjs().format(format)
}

/**
 * Get difference in days between two dates
 */
export function getDiffInDays(startDate: string, endDate: string): number {
  const start = dayjs(startDate)
  const end = dayjs(endDate)
  return end.diff(start, "day")
}

/**
 * Check if a date is today
 */
export function isToday(date: string | Date): boolean {
  return dayjs(date).isSame(dayjs(), "day")
}

/**
 * Check if a date is in the past
 */
export function isPast(date: string | Date): boolean {
  return dayjs(date).isBefore(dayjs(), "day")
}

/**
 * Format an ISO timestamp as a localized relative time (e.g. "il y a 5 minutes",
 * "5 minutes ago") for the offline "last synced X ago" line (Story 5.4).
 *
 * Built on `Intl.RelativeTimeFormat` and picks the largest sensible unit
 * (minute/hour/day). Forces a Latin-numeral locale for `ar` (mirrors
 * `formatDate`'s `d.locale("fr")` rule) so Arabic renders Western numerals per
 * Tunisian convention — never Arabic-Indic digits.
 *
 * `now` is injectable (default `new Date()`) so bucketing is deterministically
 * unit-testable. An unparseable / null / undefined `iso` yields `""`.
 */
export function formatRelativeTime(
  iso: string | null | undefined,
  locale: string,
  now: Date = new Date()
): string {
  if (!iso) return ""

  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return ""

  // Arabic keeps its own wording but MUST use Western (Latin) numerals per
  // Tunisian convention — force the `latn` numbering system via the Unicode
  // extension rather than swapping to French words (which would print "il y a…"
  // inside an Arabic sentence).
  const resolvedLocale = locale === "ar" ? "ar-u-nu-latn" : locale
  const rtf = new Intl.RelativeTimeFormat(resolvedLocale, { numeric: "auto" })

  // A "last synced" time is always in the past; clamp future skew (a fast client
  // clock) to 0 so the banner never reads "synced in the future".
  const diffMs = Math.min(0, then.getTime() - now.getTime())
  const diffSeconds = Math.round(diffMs / 1000)
  const absSeconds = Math.abs(diffSeconds)

  const minute = 60
  const hour = 60 * minute
  const day = 24 * hour

  if (absSeconds < minute) {
    return rtf.format(diffSeconds, "second")
  }
  if (absSeconds < hour) {
    return rtf.format(Math.round(diffSeconds / minute), "minute")
  }
  if (absSeconds < day) {
    return rtf.format(Math.round(diffSeconds / hour), "hour")
  }
  return rtf.format(Math.round(diffSeconds / day), "day")
}

/**
 * Get a human-readable relative date (e.g., "Today", "Tomorrow", "In 3 days")
 */
export function getRelativeDate(date: string | Date, locale?: string): string {
  const d = dayjs(date)
  const today = dayjs()
  const diff = d.diff(today, "day")

  const labels = {
    ar: { today: "اليوم", tomorrow: "غداً", yesterday: "أمس" },
    fr: { today: "Aujourd'hui", tomorrow: "Demain", yesterday: "Hier" },
    en: { today: "Today", tomorrow: "Tomorrow", yesterday: "Yesterday" },
  }

  const t = labels[locale as keyof typeof labels] || labels.fr

  if (diff === 0) return t.today
  if (diff === 1) return t.tomorrow
  if (diff === -1) return t.yesterday

  return formatDate(date, locale)
}
