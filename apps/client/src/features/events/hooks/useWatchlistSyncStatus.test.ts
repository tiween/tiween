/**
 * Tests for `useWatchlistSyncStatus` (Story 5.5) — the read-only composition
 * behind the profile-page sync section.
 *
 * `useOnlineStatus`, `useSession`, and the `watchlistCache` / `watchlistQueue`
 * stores are mocked so each branch (online + snapshot + pending / offline / no
 * snapshot / per-user key / re-read on `online` event) is controlled directly.
 * The hook must NOT issue a network request — nothing here mocks a fetcher.
 */
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  useOnlineStatusMock,
  useSessionMock,
  readWatchlistCacheMock,
  getPendingOpsMock,
} = vi.hoisted(() => ({
  useOnlineStatusMock: vi.fn(),
  useSessionMock: vi.fn(),
  readWatchlistCacheMock: vi.fn(),
  getPendingOpsMock: vi.fn(),
}))

vi.mock("@/hooks/useOnlineStatus", () => ({
  useOnlineStatus: useOnlineStatusMock,
}))

vi.mock("next-auth/react", () => ({
  useSession: useSessionMock,
}))

vi.mock("../utils/watchlistCache", () => ({
  readWatchlistCache: readWatchlistCacheMock,
}))

vi.mock("../utils/watchlistQueue", () => ({
  getPendingOps: getPendingOpsMock,
}))

import {
  useWatchlistSyncStatus,
  WATCHLIST_STATUS_REFRESH_MS,
} from "./useWatchlistSyncStatus"

function makeOp(creativeWorkId: string) {
  return {
    kind: "add" as const,
    creativeWorkId,
    addedAt: "2026-07-10T00:00:00.000Z",
    attempts: 0,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  useOnlineStatusMock.mockReturnValue(true)
  useSessionMock.mockReturnValue({ data: { user: { userId: 7 } } })
  readWatchlistCacheMock.mockReturnValue(null)
  getPendingOpsMock.mockReturnValue([])
})

describe("useWatchlistSyncStatus", () => {
  it("reports online + last-synced snapshot + pending count", () => {
    readWatchlistCacheMock.mockReturnValue({
      items: [],
      syncedAt: "2026-07-10T09:00:00.000Z",
    })
    getPendingOpsMock.mockReturnValue([makeOp("cw-1"), makeOp("cw-2")])

    const { result } = renderHook(() => useWatchlistSyncStatus())

    expect(result.current).toEqual({
      isOnline: true,
      lastSyncedAt: "2026-07-10T09:00:00.000Z",
      pendingCount: 2,
    })
  })

  it("reflects the offline state", () => {
    useOnlineStatusMock.mockReturnValue(false)

    const { result } = renderHook(() => useWatchlistSyncStatus())

    expect(result.current.isOnline).toBe(false)
  })

  it("returns lastSyncedAt null when there is no snapshot", () => {
    readWatchlistCacheMock.mockReturnValue(null)

    const { result } = renderHook(() => useWatchlistSyncStatus())

    expect(result.current.lastSyncedAt).toBeNull()
    expect(result.current.pendingCount).toBe(0)
  })

  it("reads the snapshot and queue under the session userId (per-user)", () => {
    useSessionMock.mockReturnValue({ data: { user: { userId: 42 } } })

    renderHook(() => useWatchlistSyncStatus())

    expect(readWatchlistCacheMock).toHaveBeenCalledWith(42)
    expect(getPendingOpsMock).toHaveBeenCalledWith(42)
  })

  it("re-reads localStorage after a dispatched `online` event", () => {
    getPendingOpsMock.mockReturnValue([makeOp("cw-1")])
    readWatchlistCacheMock.mockReturnValue({
      items: [],
      syncedAt: "2026-07-10T09:00:00.000Z",
    })

    const { result } = renderHook(() => useWatchlistSyncStatus())
    expect(result.current.pendingCount).toBe(1)

    // The reconnect drain empties the queue; a dispatched `online` event must
    // trigger a fresh read that observes the now-empty queue.
    getPendingOpsMock.mockReturnValue([])
    act(() => {
      window.dispatchEvent(new Event("online"))
    })

    expect(result.current.pendingCount).toBe(0)
  })

  it.each([
    ["online", () => window.dispatchEvent(new Event("online"))],
    ["offline", () => window.dispatchEvent(new Event("offline"))],
    ["focus", () => window.dispatchEvent(new Event("focus"))],
    ["storage", () => window.dispatchEvent(new Event("storage"))],
    [
      "visibilitychange",
      () => document.dispatchEvent(new Event("visibilitychange")),
    ],
  ])("re-reads localStorage on a %s event", (_name, fire) => {
    getPendingOpsMock.mockReturnValue([makeOp("cw-1")])

    const { result } = renderHook(() => useWatchlistSyncStatus())
    expect(result.current.pendingCount).toBe(1)

    // Another surface (or the reconnect drain) empties the queue; the event
    // must trigger a fresh read that observes the now-empty queue.
    getPendingOpsMock.mockReturnValue([])
    act(() => {
      fire()
    })

    expect(result.current.pendingCount).toBe(0)
  })

  it("re-reads on the slow interval to catch the same-tab drain", () => {
    vi.useFakeTimers()
    try {
      getPendingOpsMock.mockReturnValue([makeOp("cw-1")])

      const { result } = renderHook(() => useWatchlistSyncStatus())
      expect(result.current.pendingCount).toBe(1)

      // Same-tab drain empties the queue but fires no `storage` event; the
      // interval re-read must still surface the drained (empty) queue.
      getPendingOpsMock.mockReturnValue([])
      act(() => {
        vi.advanceTimersByTime(WATCHLIST_STATUS_REFRESH_MS)
      })

      expect(result.current.pendingCount).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it("returns SSR-safe defaults when there is no session userId", () => {
    useSessionMock.mockReturnValue({ data: null })

    const { result } = renderHook(() => useWatchlistSyncStatus())

    expect(result.current.lastSyncedAt).toBeNull()
    expect(result.current.pendingCount).toBe(0)
    expect(readWatchlistCacheMock).not.toHaveBeenCalled()
    expect(getPendingOpsMock).not.toHaveBeenCalled()
  })
})
