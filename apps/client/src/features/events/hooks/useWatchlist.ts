"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"

import { PrivateStrapiClient } from "@/lib/strapi-api"

/**
 * Watchlist item from Strapi
 */
export interface WatchlistItem {
  id: number
  documentId: string
  creativeWork: {
    id: number
    documentId: string
    title: string
    type?: string
    poster?: {
      url: string
      formats?: {
        thumbnail?: { url: string }
        small?: { url: string }
      }
    }
  }
  addedAt: string
  /**
   * Server-side screening enrichment (Story 5.3). Read-only join data merged by
   * `getUserWatchlist`; never stored on the watchlist row. All nullable — a
   * saved work with no scheduled events (or a transient events-manager fault)
   * yields all-null.
   */
  nextScreeningDate?: string | null
  lastScreeningDate?: string | null
  venueName?: string | null
}

/**
 * Cross-device sync poll cadence (Story 5.5). The `/watchlist` list query polls
 * at this interval while online so an add/remove on another device converges
 * within ~5 seconds. react-query pauses the poll in a hidden tab
 * (`refetchIntervalInBackground: false`) and offline.
 */
export const WATCHLIST_POLL_MS = 5000

/**
 * Pure, unit-testable poll gate: poll every {@link WATCHLIST_POLL_MS} ms when
 * online, and `false` (no polling) when offline. Kept as a standalone helper so
 * the gating logic — the testable core of the "within 5s" AC — is verifiable
 * without mounting the query.
 */
export function watchlistRefetchInterval(online: boolean): number | false {
  return online ? WATCHLIST_POLL_MS : false
}

/**
 * Query key factory for watchlist queries
 */
export const watchlistKeys = {
  all: ["watchlist"] as const,
  list: () => [...watchlistKeys.all, "list"] as const,
  check: (creativeWorkId: string) =>
    [...watchlistKeys.all, "check", creativeWorkId] as const,
}

/**
 * Hook for fetching the user's watchlist
 *
 * @example
 * ```tsx
 * const { data: watchlist, isLoading } = useWatchlist()
 *
 * watchlist?.map((item) => (
 *   <EventCard key={item.documentId} event={...} />
 * ))
 * ```
 */
export function useWatchlist() {
  const { status } = useSession()
  const isAuthenticated = status === "authenticated"

  return useQuery({
    queryKey: watchlistKeys.list(),
    queryFn: async () => {
      const response = await PrivateStrapiClient.fetchAPI(
        "/user-engagement/watchlist",
        {
          populate: [
            "creativeWork",
            "creativeWork.poster",
            "creativeWork.poster.formats",
          ],
        },
        { method: "GET" },
        { useProxy: true }
      )
      return (response.data || []) as WatchlistItem[]
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    // Cross-device sync (Story 5.5): poll every 5s while online so another
    // device's add/remove converges within ~5s. Gated on `navigator.onLine`
    // (no polling offline) and paused in hidden tabs; complemented by
    // react-query's refetch-on-reconnect.
    refetchInterval: () =>
      watchlistRefetchInterval(
        typeof navigator !== "undefined" ? navigator.onLine : true
      ),
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
  })
}

/**
 * Hook for checking if a specific creative work is in the watchlist
 *
 * @example
 * ```tsx
 * const { data } = useWatchlistCheck(event.creativeWork.documentId)
 * const isWatchlisted = data?.isInWatchlist ?? false
 * ```
 */
export function useWatchlistCheck(creativeWorkId: string | undefined) {
  const { status } = useSession()
  const isAuthenticated = status === "authenticated"

  return useQuery({
    queryKey: watchlistKeys.check(creativeWorkId ?? ""),
    queryFn: async () => {
      const response = await PrivateStrapiClient.fetchAPI(
        `/user-engagement/watchlist/check/${creativeWorkId}`,
        undefined,
        { method: "GET" },
        { useProxy: true }
      )
      return response as { isInWatchlist: boolean }
    },
    enabled: isAuthenticated && !!creativeWorkId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Hook for watchlist mutations (add, remove, toggle)
 *
 * @example
 * ```tsx
 * const { toggleMutation } = useWatchlistMutations()
 *
 * <EventCard
 *   isWatchlisted={isWatchlisted}
 *   onWatchlist={() => toggleMutation.mutate(creativeWorkId)}
 * />
 * ```
 */
export function useWatchlistMutations() {
  const queryClient = useQueryClient()

  /**
   * Add to watchlist
   */
  const addMutation = useMutation({
    mutationFn: async (creativeWorkId: string) => {
      return PrivateStrapiClient.fetchAPI(
        "/user-engagement/watchlist",
        undefined,
        {
          method: "POST",
          body: JSON.stringify({ creativeWorkId }),
        },
        { useProxy: true }
      )
    },
    onSuccess: (_, creativeWorkId) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: watchlistKeys.list() })
      queryClient.invalidateQueries({
        queryKey: watchlistKeys.check(creativeWorkId),
      })
    },
  })

  /**
   * Remove from watchlist
   */
  const removeMutation = useMutation({
    mutationFn: async (creativeWorkId: string) => {
      return PrivateStrapiClient.fetchAPI(
        `/user-engagement/watchlist/${creativeWorkId}`,
        undefined,
        { method: "DELETE" },
        { useProxy: true }
      )
    },
    onSuccess: (_, creativeWorkId) => {
      queryClient.invalidateQueries({ queryKey: watchlistKeys.list() })
      queryClient.invalidateQueries({
        queryKey: watchlistKeys.check(creativeWorkId),
      })
    },
  })

  /**
   * Toggle watchlist status (optimistic update)
   */
  const toggleMutation = useMutation({
    mutationFn: async (creativeWorkId: string) => {
      const response = await PrivateStrapiClient.fetchAPI(
        "/user-engagement/watchlist/toggle",
        undefined,
        {
          method: "POST",
          body: JSON.stringify({ creativeWorkId }),
        },
        { useProxy: true }
      )
      return response as { added: boolean; removed: boolean }
    },
    onMutate: async (creativeWorkId) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: watchlistKeys.check(creativeWorkId),
      })

      // Snapshot previous value
      const previousCheck = queryClient.getQueryData<{
        isInWatchlist: boolean
      }>(watchlistKeys.check(creativeWorkId))

      // Optimistically update
      queryClient.setQueryData(watchlistKeys.check(creativeWorkId), {
        isInWatchlist: !previousCheck?.isInWatchlist,
      })

      return { previousCheck, creativeWorkId }
    },
    onError: (_, __, context) => {
      // Rollback on error
      if (context?.previousCheck) {
        queryClient.setQueryData(
          watchlistKeys.check(context.creativeWorkId),
          context.previousCheck
        )
      }
    },
    onSettled: (_, __, creativeWorkId) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: watchlistKeys.list() })
      queryClient.invalidateQueries({
        queryKey: watchlistKeys.check(creativeWorkId),
      })
    },
  })

  return {
    addMutation,
    removeMutation,
    toggleMutation,
  }
}

/**
 * Combined hook for easy watchlist toggle functionality
 *
 * @example
 * ```tsx
 * const { isWatchlisted, toggle, isLoading } = useWatchlistToggle(creativeWorkId)
 *
 * <EventCard
 *   isWatchlisted={isWatchlisted}
 *   onWatchlist={toggle}
 * />
 * ```
 */
export function useWatchlistToggle(creativeWorkId: string | undefined) {
  const { status } = useSession()
  const isAuthenticated = status === "authenticated"

  const { data: checkData, isLoading: isCheckLoading } =
    useWatchlistCheck(creativeWorkId)
  const { toggleMutation } = useWatchlistMutations()

  const toggle = () => {
    if (!isAuthenticated || !creativeWorkId) return
    toggleMutation.mutate(creativeWorkId)
  }

  return {
    isWatchlisted: checkData?.isInWatchlist ?? false,
    toggle,
    isLoading: isCheckLoading || toggleMutation.isPending,
    isToggling: toggleMutation.isPending,
    isAuthenticated,
  }
}
