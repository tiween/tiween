"use client"

import * as React from "react"
import { useIsMutating, useQueryClient } from "@tanstack/react-query"

import {
  useWatchlistScope,
  watchlistKeys,
} from "@/features/events/hooks/useWatchlist"
import { getPendingOps } from "@/features/events/utils/watchlistQueue"

import { useWatchlistIds } from "../../hooks/useWatchlistIds"

interface ShortsWatchlistContextValue {
  /**
   * True once the heart states can be trusted: the visitor is signed out, or
   * the list request succeeded, failed, or is paused (offline). Cards render
   * aria-busy and ignore taps only while this is false.
   */
  isResolved: boolean
}

const ShortsWatchlistContext =
  React.createContext<ShortsWatchlistContextValue | null>(null)

export interface ShortsWatchlistProviderProps {
  /** documentId of every film visible in the grid. */
  documentIds: string[]
  children: React.ReactNode
}

/**
 * Grid-level watchlist seeding for short-film hearts (FR19, FR20).
 *
 * One list request for the whole grid (shared `watchlistKeys.list` entry, no
 * polling) seeds `watchlistKeys.check(userId, documentId)` for every visible
 * film, so cards read their saved state with the per-card check query switched
 * off: zero `check` requests instead of one per card.
 *
 * Safety rules:
 * - Seeding happens only under the signed-in user's `userId` scope (an unresolved
 *   id seeds nothing), so the `[watchlist]` prefix that `signOutAndClearCache`
 *   evicts covers every entry.
 * - It never overwrites an optimistic entry: while any mutation is in flight (or
 *   the list is refetching after one) it skips, then re-seeds from the latest
 *   list once they settle.
 * - Ops waiting in the per-user offline queue (D-15) win over the server list,
 *   so a refetch cannot flip a queued heart back. This adds no queue of its own.
 */
export function ShortsWatchlistProvider({
  documentIds,
  children,
}: ShortsWatchlistProviderProps) {
  const queryClient = useQueryClient()
  const { isAuthenticated, userId } = useWatchlistScope()
  const { data: ids, isSuccess, isError, isFetching, fetchStatus } =
    useWatchlistIds()
  const mutating = useIsMutating()

  // A new array identity with the same ids must not re-run the effect.
  const idsKey = documentIds.join("\u0000")

  React.useEffect(() => {
    // Skip while a mutation or a list refetch is in flight: the settled
    // mutation invalidates the list, and seeding from the pre-refetch list in
    // between would flip the heart back for a moment.
    if (!isSuccess || !ids || !userId || mutating > 0 || isFetching) return

    const queued = new Map<string, boolean>()
    for (const op of getPendingOps(userId)) {
      queued.set(op.creativeWorkId, op.kind === "add")
    }

    for (const id of idsKey ? idsKey.split("\u0000") : []) {
      queryClient.setQueryData(watchlistKeys.check(userId, id), {
        isInWatchlist: queued.get(id) ?? ids.has(id),
      })
    }
  }, [isSuccess, ids, userId, mutating, isFetching, idsKey, queryClient])

  const isResolved =
    !isAuthenticated || isSuccess || isError || fetchStatus === "paused"

  const value = React.useMemo(() => ({ isResolved }), [isResolved])

  return (
    <ShortsWatchlistContext.Provider value={value}>
      {children}
    </ShortsWatchlistContext.Provider>
  )
}

/**
 * Whether the grid's heart states are resolved. `true` when no provider is
 * mounted (a lone heart, e.g. the detail page, resolves through its own check).
 */
export function useShortsWatchlistResolved(): ShortsWatchlistContextValue {
  return React.useContext(ShortsWatchlistContext) ?? { isResolved: true }
}
