"use client"

import { useSession } from "next-auth/react"

import { useAddToWatchlist } from "@/features/events/hooks/useAddToWatchlist"
import { useRemoveFromWatchlist } from "@/features/events/hooks/useRemoveFromWatchlist"
import { useWatchlistCheck } from "@/features/events/hooks/useWatchlist"

import { useShortsWatchlistResolved } from "../components/ShortsWatchlistProvider"

export interface UseShortFilmHeartOptions {
  /**
   * `card` reads its saved state from the grid's `ShortsWatchlistProvider`
   * (zero per-film requests); `detail` runs the one per-film check request.
   */
  surface: "card" | "detail"
}

export interface UseShortFilmHeartResult {
  /** The film is in the visitor's watchlist (optimistic while a write runs). */
  isSaved: boolean
  /**
   * The saved state can be trusted: the visitor is signed out, or the server's
   * answer (success, error or paused) has arrived.
   */
  isResolved: boolean
  /** Signed in and either unresolved or mid-write: expose `aria-busy`. */
  isBusy: boolean
  /** An add, a remove or an Undo re-add is in flight. */
  isPending: boolean
  /** NextAuth session status. */
  status: "loading" | "authenticated" | "unauthenticated"
  /** Tap handler: applies the guard matrix of UI-SPEC Part E. */
  toggle: () => void
}

/**
 * One state machine for the card heart and the detail heart (FR19, FR20;
 * UI-SPEC Part E; D-13, D-14, D-15).
 *
 * It composes the shipped watchlist hooks and only decides WHEN to call them;
 * their guard matrices are untouched:
 *
 *  1. session `loading`                         -> no-op (never bounce a hydrating,
 *                                                  possibly signed-in visitor);
 *  2. `unauthenticated`                         -> `add()`: the shipped toast then
 *                                                  sign-in redirect, no write, no
 *                                                  queue, no local toggle (D-14);
 *  3. signed in, saved state unresolved, or a
 *     write already in flight                   -> no-op (no double POST/DELETE,
 *                                                  no racing an Undo);
 *  4. saved                                     -> optimistic `remove()` with Undo;
 *  5. unsaved                                   -> optimistic `add()`.
 *
 * Offline taps reuse the events offline queue through those same hooks (D-15).
 * A failed or paused list never leaves a heart permanently busy: an unanswered
 * but settled lookup resolves to "unsaved".
 */
export function useShortFilmHeart(
  documentId: string,
  { surface }: UseShortFilmHeartOptions
): UseShortFilmHeartResult {
  const { status } = useSession()
  const isDetail = surface === "detail"

  const {
    isWatchlisted,
    add,
    isPending: isAdding,
    isResolved: hasAnswer,
  } = useAddToWatchlist(documentId, {
    optimistic: true,
    variant: "short-film",
    check: isDetail,
  })
  const { remove, isPending: isRemoving } = useRemoveFromWatchlist(documentId, {
    variant: "short-film",
    check: isDetail,
  })

  // Same key as the add hook's observer (deduplicated): needed only to learn
  // whether the detail check SETTLED without an answer (error or paused).
  const check = useWatchlistCheck(documentId, { enabled: isDetail })
  const { isResolved: gridResolved } = useShortsWatchlistResolved()

  const detailSettled =
    check.data !== undefined ||
    check.isError ||
    check.fetchStatus === "paused"

  const isAuthenticated = status === "authenticated"
  const isResolved =
    status === "unauthenticated" ||
    (isAuthenticated &&
      (hasAnswer || (isDetail ? detailSettled : gridResolved)))

  const isPending = isAdding || isRemoving
  const isBusy = isAuthenticated && (!isResolved || isPending)

  const toggle = () => {
    if (status === "loading") return
    if (status === "unauthenticated") {
      add()
      return
    }
    if (!isResolved || isPending) return
    if (isWatchlisted) remove()
    else add()
  }

  return {
    isSaved: isWatchlisted,
    isResolved,
    isBusy,
    isPending,
    status,
    toggle,
  }
}
