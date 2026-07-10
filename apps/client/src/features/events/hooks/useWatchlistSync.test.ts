/**
 * Tests for `useWatchlistSync` (Story 5.1) — the auth-gated, per-user reconnect
 * drain. Fills the pass-1 verification gap (the core sync had zero tests).
 *
 * `next-auth/react` and `./useWatchlist` are mocked; the real per-user
 * `watchlistQueue` (localStorage) is used so key-scoping is exercised end-to-end.
 * A real `QueryClientProvider` supplies the client so `invalidateQueries` can be
 * spied.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import * as React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { useSessionMock, mutateAsyncMock, removeMutateAsyncMock } = vi.hoisted(
  () => ({
    useSessionMock: vi.fn(),
    mutateAsyncMock: vi.fn(),
    removeMutateAsyncMock: vi.fn(),
  })
)

vi.mock("next-auth/react", () => ({ useSession: useSessionMock }))
vi.mock("./useWatchlist", () => ({
  useWatchlistMutations: () => ({
    addMutation: { mutateAsync: mutateAsyncMock },
    removeMutation: { mutateAsync: removeMutateAsyncMock },
  }),
  watchlistKeys: {
    all: ["watchlist"],
    list: () => ["watchlist", "list"],
    check: (id: string) => ["watchlist", "check", id],
  },
}))

import { useWatchlistSync } from "./useWatchlistSync"
import {
  enqueueAdd,
  enqueueOp,
  getPendingAdds,
  getPendingOps,
  MAX_DRAIN_ATTEMPTS,
  pendingAddKey,
} from "../utils/watchlistQueue"

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", {
    value,
    configurable: true,
    writable: true,
  })
}

function authed(userId = 7) {
  useSessionMock.mockReturnValue({
    status: "authenticated",
    data: { user: { userId } },
  })
}

function renderSync() {
  const client = new QueryClient()
  const invalidateSpy = vi.spyOn(client, "invalidateQueries")
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children)
  const utils = renderHook(() => useWatchlistSync(), { wrapper })
  return { ...utils, invalidateSpy }
}

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  mutateAsyncMock.mockResolvedValue({})
  removeMutateAsyncMock.mockResolvedValue({})
  setOnline(true)
})

afterEach(() => {
  setOnline(true)
})

describe("useWatchlistSync — reconnect drain", () => {
  it("replays each queued add on `online`, removes on success, invalidates list", async () => {
    setOnline(false)
    enqueueAdd(7, "cw-1")
    enqueueAdd(7, "cw-2")
    authed(7)

    const { invalidateSpy } = renderSync()
    expect(mutateAsyncMock).not.toHaveBeenCalled() // no mount drain while offline

    setOnline(true)
    act(() => window.dispatchEvent(new Event("online")))

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(2))
    expect(mutateAsyncMock).toHaveBeenCalledWith("cw-1")
    expect(mutateAsyncMock).toHaveBeenCalledWith("cw-2")
    await waitFor(() => expect(getPendingAdds(7)).toEqual([]))
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["watchlist", "list"],
    })
  })

  it("retains a rejected replay and bumps its attempt counter", async () => {
    setOnline(false)
    enqueueAdd(7, "cw-1")
    mutateAsyncMock.mockRejectedValue(new Error("network"))
    authed(7)

    renderSync()
    setOnline(true)
    act(() => window.dispatchEvent(new Event("online")))

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalled())
    await waitFor(() => {
      const ops = getPendingAdds(7)
      expect(ops).toHaveLength(1)
      expect(ops[0]!.attempts).toBe(1)
    })
  })

  it("drops a poison entry after MAX_DRAIN_ATTEMPTS", async () => {
    setOnline(false)
    // Seed an op already at the last allowed attempt count.
    window.localStorage.setItem(
      pendingAddKey(7),
      JSON.stringify([
        {
          creativeWorkId: "cw-poison",
          addedAt: "2026-07-10T00:00:00.000Z",
          attempts: MAX_DRAIN_ATTEMPTS - 1,
        },
      ])
    )
    mutateAsyncMock.mockRejectedValue(new Error("gone"))
    authed(7)

    renderSync()
    setOnline(true)
    act(() => window.dispatchEvent(new Event("online")))

    await waitFor(() => expect(getPendingAdds(7)).toEqual([]))
  })

  it("drains once on mount when already online + authenticated (no `online` event)", async () => {
    // The common "reopen the app while already connected" path: no `online`
    // event fires, so only the mount-time drain can sync a surviving queue.
    enqueueAdd(7, "cw-1")
    authed(7)
    setOnline(true)

    renderSync() // no window.dispatchEvent("online")

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledWith("cw-1"))
    await waitFor(() => expect(getPendingAdds(7)).toEqual([]))
  })

  it("does NOT drain when unauthenticated", async () => {
    enqueueAdd(7, "cw-1")
    useSessionMock.mockReturnValue({ status: "unauthenticated", data: null })

    renderSync()
    act(() => window.dispatchEvent(new Event("online")))
    await Promise.resolve()

    expect(mutateAsyncMock).not.toHaveBeenCalled()
    expect(getPendingAdds(7)).toHaveLength(1)
  })

  it("drains only the current user's queue", async () => {
    setOnline(false)
    enqueueAdd(7, "cw-7")
    enqueueAdd(9, "cw-9") // another user on the same browser
    authed(7)

    renderSync()
    setOnline(true)
    act(() => window.dispatchEvent(new Event("online")))

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1))
    expect(mutateAsyncMock).toHaveBeenCalledWith("cw-7")
    await waitFor(() => expect(getPendingAdds(7)).toEqual([]))
    // User 9's queue is untouched.
    expect(getPendingAdds(9)).toHaveLength(1)
  })
})

describe("useWatchlistSync — kind-aware drain (Story 5.2)", () => {
  it("replays a queued 'remove' op via removeMutation and removes it on success", async () => {
    setOnline(false)
    enqueueOp(7, "remove", "cw-rm")
    authed(7)

    const { invalidateSpy } = renderSync()
    setOnline(true)
    act(() => window.dispatchEvent(new Event("online")))

    await waitFor(() =>
      expect(removeMutateAsyncMock).toHaveBeenCalledWith("cw-rm")
    )
    expect(mutateAsyncMock).not.toHaveBeenCalled() // not the add mutation
    await waitFor(() => expect(getPendingOps(7)).toEqual([]))
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["watchlist", "list"],
    })
  })

  it("dispatches a mixed add+remove queue to the matching mutation by kind", async () => {
    setOnline(false)
    enqueueOp(7, "add", "cw-add")
    enqueueOp(7, "remove", "cw-rm")
    authed(7)

    renderSync()
    setOnline(true)
    act(() => window.dispatchEvent(new Event("online")))

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledWith("cw-add"))
    await waitFor(() =>
      expect(removeMutateAsyncMock).toHaveBeenCalledWith("cw-rm")
    )
    await waitFor(() => expect(getPendingOps(7)).toEqual([]))
  })

  it("bumps a failing 'remove' replay and drops it after MAX_DRAIN_ATTEMPTS", async () => {
    setOnline(false)
    // Seed a remove op already at the last allowed attempt count.
    window.localStorage.setItem(
      pendingAddKey(7),
      JSON.stringify([
        {
          kind: "remove",
          creativeWorkId: "cw-poison",
          addedAt: "2026-07-10T00:00:00.000Z",
          attempts: MAX_DRAIN_ATTEMPTS - 1,
        },
      ])
    )
    removeMutateAsyncMock.mockRejectedValue(new Error("gone"))
    authed(7)

    renderSync()
    setOnline(true)
    act(() => window.dispatchEvent(new Event("online")))

    await waitFor(() => expect(removeMutateAsyncMock).toHaveBeenCalled())
    await waitFor(() => expect(getPendingOps(7)).toEqual([]))
  })
})
