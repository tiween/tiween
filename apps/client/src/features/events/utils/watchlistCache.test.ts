/**
 * Tests for `watchlistCache` (Story 5.4) — the per-user, durable localStorage
 * snapshot that lets a previously-viewed watchlist render offline.
 *
 * Locks the contract: save→read round-trip, per-user key isolation, corrupt /
 * missing → `null`, throwing storage → `false`/`null` (never throws), and clear.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { WatchlistItem } from "../hooks/useWatchlist"

import {
  clearWatchlistCache,
  readWatchlistCache,
  saveWatchlistCache,
  watchlistCacheKey,
} from "./watchlistCache"

function makeItem(documentId: string): WatchlistItem {
  return {
    id: Number(documentId.replace(/\D/g, "")) || 0,
    documentId,
    creativeWork: {
      id: 0,
      documentId: `cw-${documentId}`,
      title: `Title ${documentId}`,
      type: "film",
    },
    addedAt: "2026-01-01T00:00:00.000Z",
    nextScreeningDate: null,
    lastScreeningDate: null,
    venueName: null,
  }
}

beforeEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe("watchlistCache", () => {
  it("namespaces the key by userId", () => {
    expect(watchlistCacheKey(7)).toBe("tiween:watchlist:cache:7")
    expect(watchlistCacheKey("abc")).toBe("tiween:watchlist:cache:abc")
  })

  it("round-trips a saved snapshot (items + syncedAt)", () => {
    const items = [makeItem("A"), makeItem("B")]
    const syncedAt = "2026-07-10T12:00:00.000Z"

    expect(saveWatchlistCache(7, items, syncedAt)).toBe(true)

    const entry = readWatchlistCache(7)
    expect(entry).not.toBeNull()
    expect(entry!.syncedAt).toBe(syncedAt)
    expect(entry!.items).toHaveLength(2)
    expect(entry!.items[0]!.documentId).toBe("A")
  })

  it("isolates snapshots per user (A is invisible to B)", () => {
    saveWatchlistCache(7, [makeItem("A")], "2026-07-10T12:00:00.000Z")

    // User B has no snapshot of their own.
    expect(readWatchlistCache(9)).toBeNull()
    // User A's is intact.
    expect(readWatchlistCache(7)!.items[0]!.documentId).toBe("A")
  })

  it("returns null for a missing key", () => {
    expect(readWatchlistCache(42)).toBeNull()
  })

  it("returns null for corrupt JSON at the key", () => {
    window.localStorage.setItem(watchlistCacheKey(7), "{not valid json")
    expect(readWatchlistCache(7)).toBeNull()
  })

  it("returns null for a well-formed but wrong-shape entry", () => {
    window.localStorage.setItem(
      watchlistCacheKey(7),
      JSON.stringify({ items: "nope", syncedAt: 5 })
    )
    expect(readWatchlistCache(7)).toBeNull()
  })

  it("returns false from save when storage throws (never throws)", () => {
    vi.spyOn(window.localStorage.__proto__, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded")
    })
    expect(() =>
      saveWatchlistCache(7, [makeItem("A")], "2026-07-10T12:00:00.000Z")
    ).not.toThrow()
    expect(saveWatchlistCache(7, [makeItem("A")], "2026-07-10T12:00:00.000Z")).toBe(
      false
    )
  })

  it("returns null from read when storage throws (never throws)", () => {
    vi.spyOn(window.localStorage.__proto__, "getItem").mockImplementation(() => {
      throw new Error("SecurityError")
    })
    expect(() => readWatchlistCache(7)).not.toThrow()
    expect(readWatchlistCache(7)).toBeNull()
  })

  it("clears a user's snapshot", () => {
    saveWatchlistCache(7, [makeItem("A")], "2026-07-10T12:00:00.000Z")
    expect(readWatchlistCache(7)).not.toBeNull()

    clearWatchlistCache(7)
    expect(readWatchlistCache(7)).toBeNull()
  })
})
