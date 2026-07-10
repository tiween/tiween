/**
 * Tests for `useOfflineWatchlist` (Story 5.4) — the memory→durable composition
 * that turns the memory-only `useWatchlist` query into an offline-durable view.
 *
 * `useWatchlist`, `useOnlineStatus`, `useSession`, and the `watchlistCache` store
 * are all mocked so each branch (online success / offline+cache / offline+no
 * cache / online error) is controlled directly. Locks the "offline is a fallback,
 * not an error" rule and the persist-only-on-success rule.
 */
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { WatchlistItem } from "./useWatchlist"

const {
  useWatchlistMock,
  useOnlineStatusMock,
  useSessionMock,
  saveWatchlistCacheMock,
  readWatchlistCacheMock,
} = vi.hoisted(() => ({
  useWatchlistMock: vi.fn(),
  useOnlineStatusMock: vi.fn(),
  useSessionMock: vi.fn(),
  saveWatchlistCacheMock: vi.fn(),
  readWatchlistCacheMock: vi.fn(),
}))

vi.mock("./useWatchlist", () => ({
  useWatchlist: useWatchlistMock,
}))

vi.mock("@/hooks/useOnlineStatus", () => ({
  useOnlineStatus: useOnlineStatusMock,
}))

vi.mock("next-auth/react", () => ({
  useSession: useSessionMock,
}))

vi.mock("../utils/watchlistCache", () => ({
  saveWatchlistCache: saveWatchlistCacheMock,
  readWatchlistCache: readWatchlistCacheMock,
}))

import { useOfflineWatchlist } from "./useOfflineWatchlist"

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

function setQuery(value: Partial<Record<string, unknown>>) {
  useWatchlistMock.mockReturnValue({
    data: undefined,
    isSuccess: false,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...value,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  useOnlineStatusMock.mockReturnValue(true)
  useSessionMock.mockReturnValue({ data: { user: { userId: 7 } } })
  readWatchlistCacheMock.mockReturnValue(null)
})

describe("useOfflineWatchlist", () => {
  it("persists a snapshot on an online successful fetch and is not from cache", async () => {
    const rows = [makeItem("A"), makeItem("B")]
    setQuery({ data: rows, isSuccess: true })

    const { result } = renderHook(() => useOfflineWatchlist())

    await waitFor(() =>
      expect(saveWatchlistCacheMock).toHaveBeenCalledTimes(1)
    )
    const [userId, items, ts] = saveWatchlistCacheMock.mock.calls[0]!
    expect(userId).toBe(7)
    expect(items).toBe(rows)
    expect(typeof ts).toBe("string")
    expect(Number.isNaN(new Date(ts as string).getTime())).toBe(false)

    expect(result.current.items).toBe(rows)
    expect(result.current.isFromCache).toBe(false)
    expect(result.current.isOffline).toBe(false)
    expect(result.current.isError).toBe(false)
    await waitFor(() => expect(result.current.syncedAt).toEqual(ts))
  })

  it("falls back to the snapshot when offline (success view, not an error)", () => {
    const snapshotItems = [makeItem("Cached")]
    readWatchlistCacheMock.mockReturnValue({
      items: snapshotItems,
      syncedAt: "2026-07-10T09:00:00.000Z",
    })
    useOnlineStatusMock.mockReturnValue(false)
    // Offline fetch yields undefined data (never []).
    setQuery({ data: undefined, isError: true })

    const { result } = renderHook(() => useOfflineWatchlist())

    expect(result.current.items).toEqual(snapshotItems)
    expect(result.current.isFromCache).toBe(true)
    expect(result.current.isOffline).toBe(true)
    expect(result.current.syncedAt).toBe("2026-07-10T09:00:00.000Z")
    // The snapshot is read under the SESSION user's id — not a wrong/constant key.
    expect(readWatchlistCacheMock).toHaveBeenCalledWith(7)
    // Offline is a fallback, not an error.
    expect(result.current.isError).toBe(false)
    expect(result.current.isLoading).toBe(false)
    expect(saveWatchlistCacheMock).not.toHaveBeenCalled()
  })

  it("returns an empty list offline when there is no snapshot (never the skeleton)", () => {
    readWatchlistCacheMock.mockReturnValue(null)
    useOnlineStatusMock.mockReturnValue(false)
    // Even if the disabled/hanging query reports loading, offline must not strand
    // the user on the skeleton — it falls through to the offline empty state.
    setQuery({ data: undefined, isLoading: true })

    const { result } = renderHook(() => useOfflineWatchlist())

    expect(result.current.items).toEqual([])
    expect(result.current.isFromCache).toBe(false)
    expect(result.current.isOffline).toBe(true)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.syncedAt).toBeNull()
    expect(result.current.isError).toBe(false)
  })

  it("does not persist when data is present but the query is not yet successful", () => {
    setQuery({ data: [makeItem("X")], isSuccess: false })

    renderHook(() => useOfflineWatchlist())

    expect(saveWatchlistCacheMock).not.toHaveBeenCalled()
  })

  it("surfaces isError only when online with no cache", () => {
    readWatchlistCacheMock.mockReturnValue(null)
    useOnlineStatusMock.mockReturnValue(true)
    setQuery({ data: undefined, isError: true })

    const { result } = renderHook(() => useOfflineWatchlist())

    expect(result.current.isError).toBe(true)
    expect(result.current.isFromCache).toBe(false)
  })
})
