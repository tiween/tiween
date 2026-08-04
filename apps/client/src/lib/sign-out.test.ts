/**
 * Tests for `signOutAndClearCache` (Story 5.8) — the shared sign-out path.
 *
 * `next-auth/react`'s `signOut` is mocked (it would otherwise hit
 * `/api/auth/*`); the REAL app-wide browser query client is used, because the
 * whole point is that the eviction lands on the very instance
 * `QueryClientProvider` hands to the tree.
 */
import { watchlistKeys } from "@/features/events/utils/watchlistKeys"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { getQueryClient } from "./query-client"
import { signOutAndClearCache } from "./sign-out"

const { signOutMock } = vi.hoisted(() => ({ signOutMock: vi.fn() }))

vi.mock("next-auth/react", () => ({ signOut: signOutMock }))

const queryClient = getQueryClient()

beforeEach(() => {
  // `clearAllMocks` clears calls but NOT implementations, which would leak an
  // implementation set by one test into every later one.
  vi.resetAllMocks()
  queryClient.clear()
})

describe("getQueryClient", () => {
  it("returns one stable browser instance, so the evicted cache is the rendered one", () => {
    expect(getQueryClient()).toBe(queryClient)
  })
})

describe("signOutAndClearCache", () => {
  it("evicts every user's watchlist cache entry on sign-out", () => {
    queryClient.setQueryData(watchlistKeys.list(7), [{ id: 1 }])
    queryClient.setQueryData(watchlistKeys.check(7, "cw-1"), {
      isInWatchlist: true,
    })
    // A second account that also used this browser.
    queryClient.setQueryData(watchlistKeys.list(9), [{ id: 2 }])

    signOutAndClearCache({ callbackUrl: "/fr" })

    expect(queryClient.getQueryData(watchlistKeys.list(7))).toBeUndefined()
    expect(
      queryClient.getQueryData(watchlistKeys.check(7, "cw-1"))
    ).toBeUndefined()
    expect(queryClient.getQueryData(watchlistKeys.list(9))).toBeUndefined()
  })

  it("leaves non-watchlist caches alone", () => {
    queryClient.setQueryData(["notifications", "list", 7], [{ id: 3 }])
    queryClient.setQueryData(watchlistKeys.list(7), [{ id: 1 }])

    signOutAndClearCache()

    expect(queryClient.getQueryData(["notifications", "list", 7])).toEqual([
      { id: 3 },
    ])
    expect(queryClient.getQueryData(watchlistKeys.list(7))).toBeUndefined()
  })

  it("still performs the NextAuth sign-out, forwarding its options", () => {
    signOutAndClearCache({ callbackUrl: "/fr" })

    expect(signOutMock).toHaveBeenCalledWith({ callbackUrl: "/fr" })
  })

  it("clears the cache BEFORE handing off to NextAuth", () => {
    queryClient.setQueryData(watchlistKeys.list(7), [{ id: 1 }])
    // Record what the cache looked like at hand-off rather than asserting
    // inside the mock body (an assertion there would survive into later tests
    // and could throw where no test expects it).
    let watchlistAtHandOff: unknown = "not called"
    signOutMock.mockImplementation(() => {
      watchlistAtHandOff = queryClient.getQueryData(watchlistKeys.list(7))
    })

    signOutAndClearCache()

    expect(signOutMock).toHaveBeenCalled()
    expect(watchlistAtHandOff).toBeUndefined()
  })
})
