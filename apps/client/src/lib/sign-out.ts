"use client"

import { watchlistKeys } from "@/features/events/utils/watchlistKeys"
import { clearOrderAccess } from "@/features/tickets/utils/orderAccess"
import {
  myTicketKeys,
  orderTicketKeys,
} from "@/features/tickets/utils/ticketQueryKeys"
import { signOut } from "next-auth/react"

import type { SignOutParams } from "next-auth/react"

import { getQueryClient } from "./query-client"

/**
 * The single sign-out entry point for the client app (Story 5.8).
 *
 * Query keys are user-scoped, which already makes one account's cached rows
 * structurally un-matchable by another's observers. This is the second layer:
 * evict the outgoing user's watchlist entries from memory immediately instead
 * of leaving them resident until `gcTime` elapses. `watchlistKeys.all` is the
 * bare `["watchlist"]` prefix, so one `removeQueries` clears every scope.
 *
 * Story 6.4 adds the ticket caches to both layers. The stored guest order
 * access tokens live in `localStorage` — each is a never-expiring bearer
 * credential for a scannable QR, so leaving them behind would let the next
 * person on a shared device open "Mes Billets" and see the previous buyer's
 * tickets. The already-fetched ticket ROWS (which carry those same signed
 * `qrCode` strings) live in the query cache, so they are evicted for the same
 * reason the watchlist rows are.
 *
 * EVERY sign-out in the app must go through here — `signOut` from
 * `next-auth/react` must not be called directly.
 */
export function signOutAndClearCache(options?: SignOutParams) {
  const queryClient = getQueryClient()
  queryClient.removeQueries({ queryKey: watchlistKeys.all })
  queryClient.removeQueries({ queryKey: myTicketKeys.all })
  queryClient.removeQueries({ queryKey: orderTicketKeys.all })
  clearOrderAccess()
  return signOut(options)
}
