"use client"

import { usePathname, useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { useLocale, useTranslations } from "next-intl"

import { useToast } from "@/components/ui/use-toast"

import { enqueueAdd } from "../utils/watchlistQueue"

import {
  useWatchlistCheck,
  useWatchlistMutations,
  watchlistKeys,
} from "./useWatchlist"

export interface UseAddToWatchlistResult {
  /** Whether the creative-work is currently in the user's watchlist. */
  isWatchlisted: boolean
  /** Attempt to add the creative-work to the watchlist (guarded, see below). */
  add: () => void
  /** Whether an add mutation is currently in flight. */
  isPending: boolean
  /** Whether there is a creative-work id to watchlist at all. */
  canWatchlist: boolean
}

/**
 * Add-to-watchlist controller for the event detail hero (Story 5.1).
 *
 * Composes the existing react-query `useWatchlistCheck` + `addMutation` with the
 * NextAuth session and the per-user offline queue. The single `add()` entry
 * point applies the guard matrix, in order:
 *
 *  1. session still `loading` → no-op (do NOT bounce a hydrating, possibly
 *     already-authenticated user to sign-in);
 *  2. `unauthenticated` → `loginRequired` toast + redirect to sign-in with a
 *     `callbackUrl` back to the current path; no write, no queue;
 *  3. no `creativeWorkId` / `userId` → no-op;
 *  4. already watchlisted OR a mutation is in flight → no-op (no duplicate POST,
 *     no misleading "Ajouté" toast on an already-filled heart);
 *  5. offline → enqueue under the current user; only on a successful write apply
 *     the optimistic fill + `queued` toast, else an error toast and NO optimistic
 *     change (never claim "queued" for an add that was not stored);
 *  6. online → run the add mutation with success/error toasts.
 */
export function useAddToWatchlist(
  creativeWorkId?: string
): UseAddToWatchlistResult {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations("watchlist")
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: checkData } = useWatchlistCheck(creativeWorkId)
  const { addMutation } = useWatchlistMutations()

  const userId = session?.user?.userId
  const isWatchlisted = checkData?.isInWatchlist ?? false

  const add = () => {
    // (1) Don't act — or redirect — while the session is still hydrating.
    if (status === "loading") return

    // (2) Unauthenticated: prompt sign-in, preserve the current path.
    if (status !== "authenticated") {
      toast({ description: t("loginRequired") })
      const callbackUrl = encodeURIComponent(pathname ?? `/${locale}`)
      router.push(`/${locale}/auth/signin?callbackUrl=${callbackUrl}`)
      return
    }

    // (3) Nothing to persist (no film id) / no user id.
    if (!creativeWorkId || !userId) return

    // (4) Already saved or an add in flight — no duplicate POST, no toast.
    if (isWatchlisted || addMutation.isPending) return

    // (5) Offline: enqueue for reconnect replay. Only claim success if stored.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (!enqueueAdd(userId, creativeWorkId)) {
        toast({ variant: "destructive", description: t("error") })
        return
      }
      queryClient.setQueryData(watchlistKeys.check(creativeWorkId), {
        isInWatchlist: true,
      })
      toast({ description: t("queued") })
      return
    }

    // (6) Online: persist via the add mutation.
    addMutation.mutate(creativeWorkId, {
      onSuccess: () => toast({ description: t("addSuccess") }),
      onError: () => toast({ variant: "destructive", description: t("error") }),
    })
  }

  return {
    isWatchlisted,
    add,
    isPending: addMutation.isPending,
    canWatchlist: Boolean(creativeWorkId),
  }
}
