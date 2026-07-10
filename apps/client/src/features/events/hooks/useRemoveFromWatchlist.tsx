"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"

import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

import { enqueueOp } from "../utils/watchlistQueue"

import {
  useWatchlistCheck,
  useWatchlistMutations,
  watchlistKeys,
} from "./useWatchlist"

export interface UseRemoveFromWatchlistResult {
  /** Attempt to remove the creative-work from the watchlist (guarded). */
  remove: () => void
  /** Whether a remove mutation is currently in flight (for the toggle guard). */
  isPending: boolean
}

/**
 * Remove-from-watchlist controller for the event detail hero (Story 5.2).
 *
 * Mirrors `useAddToWatchlist`: it composes the shipped react-query
 * `useWatchlistCheck` + `useWatchlistMutations` (both `removeMutation` and the
 * `addMutation` used to re-add on Undo) with the NextAuth session and the
 * generalized per-user offline queue. The single `remove()` entry point applies
 * the guard matrix, in order:
 *
 *  1. session still `loading` → no-op (do NOT act during hydration);
 *  2. not `authenticated` → no-op (a filled heart is unreachable while
 *     unauthenticated; the guard defends the seam);
 *  3. no `creativeWorkId` / `userId` → no-op;
 *  4. not currently watchlisted OR a remove is in flight → no-op (nothing to
 *     remove / no duplicate DELETE);
 *  5. offline → enqueue a `remove` op under the current user; only on a
 *     successful write apply the optimistic outline + `removeSuccess` toast with
 *     Undo, else an `error` toast and NO optimistic change (no silent success);
 *  6. online → optimistic outline, then run the remove mutation with a
 *     `removeSuccess`+Undo toast on success and a rollback+`error` toast on
 *     failure.
 *
 * Undo re-adds via the shared 5.1 add primitives: online `addMutation`, offline
 * `enqueueOp(userId,"add",id)` (which, being last-write-wins, REPLACES the
 * pending remove). The re-add no-ops while `addMutation.isPending` so a
 * double-tapped Undo cannot double-fire.
 *
 * `isPending` is `removeMutation.isPending || addMutation.isPending` — it covers
 * BOTH the remove and the Undo re-add (which runs on this hook's own
 * `addMutation` instance). The detail page folds it into the heart's disabled
 * state so a heart tap can never race the in-flight re-add `POST` with a fresh
 * `DELETE` (nor a remove with a `POST`) at the same row.
 */
export function useRemoveFromWatchlist(
  creativeWorkId?: string
): UseRemoveFromWatchlistResult {
  const { data: session, status } = useSession()
  const t = useTranslations("watchlist")
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: checkData } = useWatchlistCheck(creativeWorkId)
  const { removeMutation, addMutation } = useWatchlistMutations()

  const userId = session?.user?.userId

  // Undo = a re-add via the exact 5.1 add primitives.
  const reAdd = () => {
    if (!creativeWorkId || !userId) return
    // No redundant double-fire while a re-add is already in flight.
    if (addMutation.isPending) return

    // Offline: enqueue an `add` op (last-write-wins REPLACES the pending remove).
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (!enqueueOp(userId, "add", creativeWorkId)) {
        toast({ variant: "destructive", description: t("error") })
        return
      }
      queryClient.setQueryData(watchlistKeys.check(creativeWorkId), {
        isInWatchlist: true,
      })
      return
    }

    // Online: optimistic refill, then re-add via the shared add mutation.
    queryClient.setQueryData(watchlistKeys.check(creativeWorkId), {
      isInWatchlist: true,
    })
    addMutation.mutate(creativeWorkId, {
      onError: () => {
        queryClient.setQueryData(watchlistKeys.check(creativeWorkId), {
          isInWatchlist: false,
        })
        toast({ variant: "destructive", description: t("error") })
      },
    })
  }

  const remove = () => {
    // (1) Don't act while the session is still hydrating.
    if (status === "loading") return
    // (2) Unauthenticated: a filled heart is unreachable — defend the seam.
    if (status !== "authenticated") return
    // (3) Nothing to remove (no film id) / no user id.
    if (!creativeWorkId || !userId) return
    // (4) Not saved or a remove in flight — no DELETE, no toast.
    if (!checkData?.isInWatchlist || removeMutation.isPending) return

    const undo = (
      <ToastAction altText={t("undo")} onClick={reAdd}>
        {t("undo")}
      </ToastAction>
    )

    // (5) Offline: enqueue the remove. Only claim success if stored.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (!enqueueOp(userId, "remove", creativeWorkId)) {
        toast({ variant: "destructive", description: t("error") })
        return
      }
      queryClient.setQueryData(watchlistKeys.check(creativeWorkId), {
        isInWatchlist: false,
      })
      toast({ description: t("removeSuccess"), action: undo })
      return
    }

    // (6) Online: optimistic outline, then persist via the remove mutation.
    queryClient.setQueryData(watchlistKeys.check(creativeWorkId), {
      isInWatchlist: false,
    })
    removeMutation.mutate(creativeWorkId, {
      onSuccess: () => toast({ description: t("removeSuccess"), action: undo }),
      onError: () => {
        queryClient.setQueryData(watchlistKeys.check(creativeWorkId), {
          isInWatchlist: true,
        })
        toast({ variant: "destructive", description: t("error") })
      },
    })
  }

  // OR in the re-add's pending state: the Undo re-add runs on this hook's own
  // `addMutation`, so exposing only `removeMutation.isPending` would leave the
  // heart enabled during a re-add POST and reopen the DELETE/POST race.
  return { remove, isPending: removeMutation.isPending || addMutation.isPending }
}
