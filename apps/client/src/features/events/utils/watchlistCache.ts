/**
 * Per-user, durable snapshot of the last successfully-fetched watchlist list
 * plus its sync timestamp (Story 5.4 — Offline Watchlist Access).
 *
 * WHY localStorage (mirroring `watchlistQueue.ts`), NOT IndexedDB: `useWatchlist`'s
 * react-query cache is memory-only, so an offline reload loses it. A durable
 * snapshot is what survives. `localStorage` is the ratified mechanism (Story 5.1)
 * because it is jsdom-testable, unlike the dead IndexedDB `useWatchlistOffline.ts`.
 *
 * WHY per-user: the key is namespaced by the authenticated user id, exactly like
 * `watchlistQueue.ts`. A snapshot MUST only ever be readable by the exact user who
 * created it — a single global key on a shared browser would leak User A's saved
 * items into User B's watchlist view.
 *
 * All access is SSR-guarded (`typeof window`) and try/catch-wrapped: a read
 * failure yields `null`, a write failure yields `false` (never a throw, never a
 * silent success, never block render).
 */

import type { WatchlistItem } from "../hooks/useWatchlist"

const KEY_PREFIX = "tiween:watchlist:cache:"

/** A persisted watchlist snapshot: the items plus when they were last synced. */
export interface WatchlistCacheEntry {
  items: WatchlistItem[]
  /** ISO timestamp of the successful fetch that produced `items`. */
  syncedAt: string
}

/** The localStorage key for a given user's watchlist snapshot. */
export function watchlistCacheKey(userId: string | number): string {
  return `${KEY_PREFIX}${userId}`
}

/** Access localStorage defensively (absent in SSR, throws in private mode). */
function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Validate the raw parsed shape before trusting it as a snapshot. */
function isValidEntry(value: unknown): value is WatchlistCacheEntry {
  if (typeof value !== "object" || value === null) return false
  const entry = value as Record<string, unknown>
  return Array.isArray(entry.items) && typeof entry.syncedAt === "string"
}

/**
 * Persist `{ items, syncedAt }` for `userId`. Returns `false` on no-storage or any
 * write failure (quota/private-mode) so the caller never claims a false success.
 */
export function saveWatchlistCache(
  userId: string | number,
  items: WatchlistItem[],
  syncedAt: string
): boolean {
  const storage = safeStorage()
  if (!storage) return false
  try {
    const entry: WatchlistCacheEntry = { items, syncedAt }
    storage.setItem(watchlistCacheKey(userId), JSON.stringify(entry))
    return true
  } catch {
    return false
  }
}

/**
 * Read + validate the snapshot for `userId`. Any failure (missing key, malformed
 * JSON, wrong shape, no storage) yields `null` — treated as "no cache".
 */
export function readWatchlistCache(
  userId: string | number
): WatchlistCacheEntry | null {
  const storage = safeStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(watchlistCacheKey(userId))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isValidEntry(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

/** Clear a user's watchlist snapshot (best-effort; never throws). */
export function clearWatchlistCache(userId: string | number): void {
  const storage = safeStorage()
  if (!storage) return
  try {
    storage.removeItem(watchlistCacheKey(userId))
  } catch {
    // ignore — best-effort clear
  }
}
