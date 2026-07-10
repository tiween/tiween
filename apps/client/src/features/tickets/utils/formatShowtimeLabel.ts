/**
 * Format a sub-event's ISO start into a display label.
 *
 * Forces Western (Latin) numerals for every locale (Arabic included, per the
 * i18n rules) and pins the app's fixed `Africa/Tunis` timezone — matching
 * `lib/dates.ts` / `lib/i18n.ts` — so the rendered hour is correct regardless of
 * the server's timezone. Returns `""` for a missing or unparseable date.
 */
export function formatShowtimeLabel(
  iso: string | undefined | null,
  locale: string
): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Tunis",
  }).format(date)
}
