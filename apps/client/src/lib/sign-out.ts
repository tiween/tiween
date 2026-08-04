"use client"

import { watchlistKeys } from "@/features/events/utils/watchlistKeys"
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
 * EVERY sign-out in the app must go through here — `signOut` from
 * `next-auth/react` must not be called directly.
 */
export function signOutAndClearCache(options?: SignOutParams) {
  getQueryClient().removeQueries({ queryKey: watchlistKeys.all })
  return signOut(options)
}
