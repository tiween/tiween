"use client"

import {
  fetchWatchlist,
  useWatchlistScope,
  watchlistKeys,
} from "@/features/events/hooks/useWatchlist"
import { useQuery } from "@tanstack/react-query"

import type { WatchlistItem } from "@/features/events/hooks/useWatchlist"

/**
 * Stable module-level selector (a fresh closure per render would re-run `select`
 * and hand every consumer a new Set identity each time).
 */
function selectIds(items: WatchlistItem[]): Set<string> {
  const ids = new Set<string>()
  for (const item of items) {
    // A relation to an unpublished work populates as null: skip it.
    const documentId = item.creativeWork?.documentId
    if (documentId) ids.add(documentId)
  }
  return ids
}

/**
 * Non-polling list-membership query for grids of short films (FR19).
 *
 * Shares `watchlistKeys.list(userId)` and the extracted `fetchWatchlist` with the
 * page-level `useWatchlist`, so both observers read one cache entry and the
 * user-scoped key is what `signOutAndClearCache` evicts. Unlike `useWatchlist`
 * it never sets `refetchInterval`: a 24-card directory must not poll every 5s.
 *
 * Disabled unless the session is authenticated with a resolved `userId`.
 */
export function useWatchlistIds() {
  const { isAuthenticated, userId, scope } = useWatchlistScope()

  return useQuery({
    queryKey: watchlistKeys.list(scope),
    queryFn: fetchWatchlist,
    select: selectIds,
    enabled: isAuthenticated && !!userId,
    staleTime: 60 * 1000, // 60 seconds
    gcTime: 30 * 60 * 1000, // same as useWatchlist
    refetchOnReconnect: true,
  })
}
