/**
 * Number and date formatting for the venues admin.
 *
 * PROJECT RULE (project-context.md → i18n): **Western numerals in every locale,
 * including Arabic**, and dates as `DD/MM/YYYY`.
 *
 * Both helpers are deliberately locale-INDEPENDENT. `Intl.NumberFormat("ar")`
 * and `Intl.DateTimeFormat("ar")` emit Arabic-Indic digits (٢٥) and a
 * non-`DD/MM/YYYY` order, and `react-intl` runs a `{count}` placeholder through
 * `Intl.NumberFormat` for the ACTIVE locale — which is why every count handed
 * to `formatMessage` in this plugin goes through {@link formatNumber} first and
 * arrives as a STRING (a string placeholder is interpolated verbatim).
 */

/** A count/measure in Western numerals, whatever the active locale. */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-"
  // `toString()` on a Number always yields ASCII digits — unlike toLocaleString.
  return String(value)
}

/**
 * `DD/MM/YYYY` in Western numerals, from an ISO string or a Date.
 *
 * The parts are read with the LOCAL getters (not `toISOString`), so a venue
 * edited at 23:30 local time is not dated to the following day.
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-"

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}
