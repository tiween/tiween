"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"

import {
  bumpAttempt,
  getPendingOps,
  removePendingOp,
} from "../utils/watchlistQueue"

import { useWatchlistMutations, watchlistKeys } from "./useWatchlist"

/**
 * App-wide reconnect drain for the offline pending-op queue (Story 5.1 add,
 * generalized in Story 5.2 to replay removes too).
 *
 * Auth-gated and per-user: the drain no-ops unless `status === "authenticated"`
 * and operates ONLY on the current user's queue (`getPendingOps(userId)`), so a
 * queued op can never replay under a different account on a shared browser.
 *
 * On the window `online` event and once on mount while already online, it
 * dispatches each queued op by `kind` (`add`→`addMutation`, `remove`→
 * `removeMutation`): a success removes the op; a failure bumps its attempt
 * counter (which self-drops the op after `MAX_DRAIN_ATTEMPTS`, so a poison entry
 * cannot retry forever). Any success invalidates the watchlist `list()` query.
 * Re-entrancy is guarded by a ref.
 */
export function useWatchlistSync(): void {
  const { data: session, status } = useSession()
  const { addMutation, removeMutation } = useWatchlistMutations()
  const queryClient = useQueryClient()

  const userId = session?.user?.userId
  const isAuthenticated = status === "authenticated"
  const drainingRef = React.useRef(false)

  // Keep the latest drain implementation in a ref so the effect below can depend
  // only on [isAuthenticated, userId] (per spec) while still calling into the
  // freshest mutation / query client without re-subscribing on every render.
  const drainRef = React.useRef<() => Promise<void>>(async () => {})
  drainRef.current = async () => {
    if (!isAuthenticated || !userId) return
    if (drainingRef.current) return
    if (typeof navigator !== "undefined" && !navigator.onLine) return

    drainingRef.current = true
    try {
      let anySuccess = false
      // Re-read per iteration is unnecessary — a fixed snapshot is fine because
      // remove/bump mutate storage in place and we never revisit an id here.
      for (const op of getPendingOps(userId)) {
        try {
          // Dispatch by kind: an offline add replays as a POST, an offline
          // remove as a DELETE — under the current (authenticated) user only.
          const mutation = op.kind === "remove" ? removeMutation : addMutation
          await mutation.mutateAsync(op.creativeWorkId)
          removePendingOp(userId, op.creativeWorkId)
          anySuccess = true
        } catch {
          bumpAttempt(userId, op.creativeWorkId)
        }
      }
      if (anySuccess) {
        queryClient.invalidateQueries({ queryKey: watchlistKeys.list(userId) })
      }
    } finally {
      drainingRef.current = false
    }
  }

  React.useEffect(() => {
    if (!isAuthenticated || !userId) return
    if (typeof window === "undefined") return

    const run = () => {
      void drainRef.current()
    }

    // Drain once on mount if we are already online.
    if (typeof navigator === "undefined" || navigator.onLine) {
      run()
    }

    window.addEventListener("online", run)
    return () => window.removeEventListener("online", run)
  }, [isAuthenticated, userId])
}
