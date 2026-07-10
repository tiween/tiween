import type { CategoryType } from "../components/CategoryTabs/CategoryTabs"
import type { WatchlistItem } from "../hooks/useWatchlist"

import { mapCategoryToType } from "./categoryMapper"

/**
 * Pure display helpers for the watchlist page (Story 5.3). Kept out of the
 * component so the sort/split/filter contract is exhaustively unit-testable
 * independent of React.
 */

/**
 * Partition watchlist items into Upcoming and Past sections.
 *
 * - **Upcoming**: `nextScreeningDate != null` OR both dates null. Sorted by
 *   `nextScreeningDate` ascending (soonest first); items with no upcoming date
 *   (never-scheduled works) sort AFTER all dated items, tiebroken by `addedAt`
 *   descending (most recently saved first).
 * - **Past**: `nextScreeningDate == null && lastScreeningDate != null`. Sorted
 *   by `lastScreeningDate` descending (most recent past first).
 *
 * A saved work with no scheduled events at all (both dates null) stays in the
 * main/Upcoming list — it is NOT misfiled into Past.
 */
export function partitionWatchlist(items: WatchlistItem[]): {
  upcoming: WatchlistItem[]
  past: WatchlistItem[]
} {
  const upcoming: WatchlistItem[] = []
  const past: WatchlistItem[] = []

  for (const item of items) {
    const next = item.nextScreeningDate ?? null
    const last = item.lastScreeningDate ?? null

    if (next == null && last != null) {
      past.push(item)
    } else {
      upcoming.push(item)
    }
  }

  upcoming.sort((a, b) => {
    const aNext = a.nextScreeningDate ?? null
    const bNext = b.nextScreeningDate ?? null

    if (aNext != null && bNext != null) {
      const d = ts(aNext) - ts(bNext)
      if (d !== 0) return d
    } else if (aNext != null) {
      return -1 // dated item before an undated one
    } else if (bNext != null) {
      return 1
    }

    // Both undated (or same next date): most recently saved first.
    return ts(b.addedAt) - ts(a.addedAt)
  })

  past.sort((a, b) => ts(b.lastScreeningDate) - ts(a.lastScreeningDate))

  return { upcoming, past }
}

/**
 * Parse an ISO datetime to an epoch-millis instant for ordering. Comparing
 * parsed instants (not raw strings) is robust to timezone-offset / precision
 * differences. A missing/unparseable value sorts oldest (`-Infinity`).
 */
function ts(date: string | null | undefined): number {
  if (!date) return -Infinity
  const t = Date.parse(date)
  return Number.isNaN(t) ? -Infinity : t
}

/**
 * Filter watchlist items by UI category. `"all"` passes everything through;
 * any other category keeps only items whose `creativeWork.type` matches the
 * mapped creative-work type (e.g. `cinema` -> `film`).
 */
export function filterByCategory(
  items: WatchlistItem[],
  activeCategory: CategoryType
): WatchlistItem[] {
  if (activeCategory === "all") return items
  const type = mapCategoryToType(activeCategory)
  if (!type) return items
  return items.filter((item) => item.creativeWork?.type === type)
}
