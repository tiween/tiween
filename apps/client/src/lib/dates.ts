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
  locale?: string
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
