"use client"

import * as React from "react"
import { useSession } from "next-auth/react"

import { useOnlineStatus } from "@/hooks/useOnlineStatus"

import {
  readWatchlistCache,
  saveWatchlistCache,
} from "../utils/watchlistCache"

import { useWatchlist, type WatchlistItem } from "./useWatchlist"

/**
 * The offline-durable view over the memory-only `useWatchlist` query.
 */
export interface UseOfflineWatchlistResult {
  /** The items to render: live server data when present, else the snapshot. */
  items: WatchlistItem[]
  /** ISO timestamp of the last successful sync (live or from the snapshot). */
  syncedAt: string | null
  /** Whether the browser is currently offline. */
  isOffline: boolean
  /** True when `items` come from the durable snapshot (offline fallback). */
  isFromCache: boolean
  /** Loading only when there is no cache to fall back to. */
  isLoading: boolean
  /** Error only when ONLINE with no cache — offline is a fallback, not an error. */
  isError: boolean
  /** Re-run the underlying fetch. */
  refetch: ReturnType<typeof useWatchlist>["refetch"]
}

/**
 * Composes `useWatchlist()` + `useOnlineStatus()` + `useSession()` into an
 * offline-durable watchlist view (Story 5.4).
 *
 * `useWatchlist`'s react-query cache is memory-only, so it cannot survive an
 * offline reload. This hook bridges memory → durable:
 *
 *  1. On every successful fetch (`isSuccess && data`), it persists a per-user
 *     `localStorage` snapshot (`saveWatchlistCache`) and records that sync time.
 *     It NEVER persists an empty array from a failed/aborted offline fetch (an
 *     offline fetch yields `undefined` data, not `[]`, so the gate is `data`).
 *  2. When the live query has no data and we are offline, it falls back to the
 *     snapshot as a SUCCESS view — never the 5.3 error/retry state.
 *  3. `isError` is surfaced only when ONLINE and the fetch failed with no cache.
 */
export function useOfflineWatchlist(): UseOfflineWatchlistResult {
  const { data: session } = useSession()
  const online = useOnlineStatus()
  const query = useWatchlist()

  const userId = session?.user?.userId

  const [syncedAt, setSyncedAt] = React.useState<string | null>(null)

  // Persist a fresh snapshot on every successful fetch of real server data.
  React.useEffect(() => {
    if (query.isSuccess && query.data && userId != null) {
      const ts = new Date().toISOString()
      saveWatchlistCache(userId, query.data, ts)
      setSyncedAt(ts)
    }
  }, [query.isSuccess, query.data, userId])

  // Read the snapshot only when there is no live data to render.
  const snapshot =
    !query.data && userId != null ? readWatchlistCache(userId) : null

  const isOffline = !online
  const isFromCache = !query.data && isOffline && !!snapshot

  return {
    items: query.data ?? (isFromCache ? snapshot!.items : []),
    syncedAt: query.data ? syncedAt : (snapshot?.syncedAt ?? null),
    isOffline,
    isFromCache,
    // Offline never shows the loading skeleton: we either have a cached snapshot
    // (isFromCache) or fall through to the offline empty state — a hanging
    // offline fetch must not strand the user on the skeleton.
    isLoading: online && query.isLoading && !isFromCache,
    // Offline is a display fallback, not an error.
    isError: query.isError && online && !isFromCache,
    refetch: query.refetch,
  }
}
