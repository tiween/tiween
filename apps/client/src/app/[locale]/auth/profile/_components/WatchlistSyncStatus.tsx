"use client"

import { useWatchlistSyncStatus } from "@/features/events/hooks/useWatchlistSyncStatus"
import { RefreshCw } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { formatRelativeTime } from "@/lib/dates"
import { toNumeralSafeLocale } from "@/lib/intl-locale"
import { cn } from "@/lib/utils"

/**
 * Format an integer with Western (Latin) numerals regardless of locale. Arabic's
 * default `arab` numbering system is disallowed by the project's
 * always-Western-numerals rule, so the tag is routed through the shared
 * {@link toNumeralSafeLocale} helper (story 1.12 replaced the local `ar →
 * ar-u-nu-latn` duplicate this function introduced in 5.5). Exported for direct
 * unit testing of the numeral rule.
 */
export function formatCount(count: number, locale: string): string {
  try {
    return new Intl.NumberFormat(toNumeralSafeLocale(locale)).format(count)
  } catch {
    return String(count)
  }
}

/**
 * WatchlistSyncStatus — the "Watchlist sync" section on the profile (settings)
 * page (Story 5.5).
 *
 * Presentational: reads the read-only {@link useWatchlistSyncStatus} hook (which
 * issues no network request) and renders
 *  - an online/offline indicator with a small colored dot,
 *  - a localized, Western-numeral "Last synced X ago" line (or "never synced"),
 *  - a pending-changes count line, only when there is at least one pending op.
 *
 * All copy resolves from the `watchlist` next-intl namespace; RTL is automatic.
 */
export function WatchlistSyncStatus() {
  const t = useTranslations("watchlist")
  const locale = useLocale()
  const { isOnline, lastSyncedAt, pendingCount } = useWatchlistSyncStatus()

  // "" when there is no snapshot OR the snapshot timestamp is unparseable — both
  // render as `neverSynced` below.
  const relativeSynced = lastSyncedAt
    ? formatRelativeTime(lastSyncedAt, locale)
    : ""

  return (
    <section className="space-y-3" aria-label={t("syncStatusTitle")}>
      <div className="flex items-center gap-2">
        <RefreshCw className="text-muted-foreground h-4 w-4" />
        <h2 className="text-foreground text-sm font-semibold">
          {t("syncStatusTitle")}
        </h2>
      </div>

      {/* Live region: announce online/offline flips and pending-count changes
          to assistive tech while the section is open. */}
      <div
        className="text-muted-foreground space-y-1.5 text-sm"
        role="status"
        aria-live="polite"
      >
        {/* Online / offline indicator */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-block h-2 w-2 shrink-0 rounded-full",
              isOnline ? "bg-green-500" : "bg-muted-foreground"
            )}
            aria-hidden="true"
          />
          <span>
            {isOnline ? t("syncStatusOnline") : t("offlineIndicator")}
          </span>
        </div>

        {/* Last synced. `formatRelativeTime` returns "" for a null/absent OR an
            unparseable snapshot timestamp (a corrupt/tampered cache passes
            `readWatchlistCache`'s string-only validation), so fall back to
            `neverSynced` on an empty string rather than rendering a blank
            "Last synced " line. */}
        <p>
          {relativeSynced
            ? t("lastSynced", { time: relativeSynced })
            : t("neverSynced")}
        </p>

        {/* Pending changes — only when there is something queued. `display`
            carries the Western-numeral count (the ICU `#` would render
            Arabic-Indic digits under `ar`); `count` still drives plural
            selection. */}
        {pendingCount > 0 && (
          <p>
            {t("pendingChanges", {
              count: pendingCount,
              display: formatCount(pendingCount, locale),
            })}
          </p>
        )}
      </div>
    </section>
  )
}

WatchlistSyncStatus.displayName = "WatchlistSyncStatus"
