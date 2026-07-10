"use client"

import * as React from "react"
import { useSession } from "next-auth/react"

import { useOnlineStatus } from "@/hooks/useOnlineStatus"

import { readWatchlistCache } from "../utils/watchlistCache"
import { getPendingOps } from "../utils/watchlistQueue"

/**
 * Read-only watchlist sync status for the settings surface (Story 5.5).
 *
 * Composes the reusable {@link useOnlineStatus} detector, the session `userId`,
 * the durable last-synced snapshot (`readWatchlistCache(userId)?.syncedAt`,
 * Story 5.4), and the pending-op queue length (`getPendingOps(userId).length`,
 * Stories 5.1/5.2).
 *
 * It NEVER mounts `useWatchlist` and issues NO network request — opening the
 * profile page must not trigger a watchlist fetch. It only reads localStorage,
 * re-reading on mount, on window `online`/`offline`/`focus`/`storage` and
 * `document` `visibilitychange` events, AND on a slow interval so the values
 * stay fresh as the reconnect drain empties the queue.
 *
 * The interval matters because the reconnect drain (`useWatchlistSync`) empties
 * the queue asynchronously in the SAME tab, and a same-tab localStorage write
 * fires no `storage` event — so without a periodic re-read the pending count
 * would stay stale on the very screen the user is looking at until an unrelated
 * focus/connectivity flip. The interval is a localStorage read only (no network,
 * no react-query poll), and `read()` no-ops the state update when nothing
 * changed, so it does not churn re-renders.
 *
 * SSR-safe: before mount (no `window`, no session) it returns
 * `{ isOnline: true, lastSyncedAt: null, pendingCount: 0 }`.
 */
export interface WatchlistSyncStatus {
  isOnline: boolean
  lastSyncedAt: string | null
  pendingCount: number
}

/**
 * Slow localStorage re-read cadence for the settings sync section. A safety net
 * for the same-tab async drain (see above) — NOT a network/react-query poll.
 */
export const WATCHLIST_STATUS_REFRESH_MS = 3000

export function useWatchlistSyncStatus(): WatchlistSyncStatus {
  const isOnline = useOnlineStatus()
  const { data: session } = useSession()
  const userId = session?.user?.userId

  const [state, setState] = React.useState<{
    lastSyncedAt: string | null
    pendingCount: number
  }>({ lastSyncedAt: null, pendingCount: 0 })

  const read = React.useCallback(() => {
    const next =
      userId === undefined || typeof window === "undefined"
        ? { lastSyncedAt: null, pendingCount: 0 }
        : {
            lastSyncedAt: readWatchlistCache(userId)?.syncedAt ?? null,
            pendingCount: getPendingOps(userId).length,
          }
    // No-op the update when nothing changed so the interval below (and the
    // event listeners) don't churn re-renders.
    setState((prev) =>
      prev.lastSyncedAt === next.lastSyncedAt &&
      prev.pendingCount === next.pendingCount
        ? prev
        : next
    )
  }, [userId])

  React.useEffect(() => {
    read()

    // Re-read when connectivity flips, the tab regains focus/visibility, or
    // another tab mutates the cache/queue (the reconnect drain empties it).
    window.addEventListener("online", read)
    window.addEventListener("offline", read)
    window.addEventListener("focus", read)
    window.addEventListener("storage", read)
    document.addEventListener("visibilitychange", read)

    // Same-tab safety net: the reconnect drain empties the queue asynchronously
    // and fires no `storage` event in this tab, so poll localStorage slowly so
    // the pending count returns to zero live on the settings screen.
    const intervalId = window.setInterval(read, WATCHLIST_STATUS_REFRESH_MS)

    return () => {
      window.removeEventListener("online", read)
      window.removeEventListener("offline", read)
      window.removeEventListener("focus", read)
      window.removeEventListener("storage", read)
      document.removeEventListener("visibilitychange", read)
      window.clearInterval(intervalId)
    }
  }, [read])

  return {
    isOnline,
    lastSyncedAt: state.lastSyncedAt,
    pendingCount: state.pendingCount,
  }
}
