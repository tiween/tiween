/**
 * Tests for `signOutAndClearCache` (Story 5.8) — the shared sign-out path.
 *
 * `next-auth/react`'s `signOut` is mocked (it would otherwise hit
 * `/api/auth/*`); the REAL app-wide browser query client is used, because the
 * whole point is that the eviction lands on the very instance
 * `QueryClientProvider` hands to the tree.
 */
import { watchlistKeys } from "@/features/events/utils/watchlistKeys"
import {
  listOrderAccess,
  readOrderAccess,
  saveOrderAccess,
} from "@/features/tickets/utils/orderAccess"
import {
  myTicketKeys,
  orderTicketKeys,
} from "@/features/tickets/utils/ticketQueryKeys"
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
  window.localStorage.clear()
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

  it("leaves unrelated caches alone", () => {
    queryClient.setQueryData(["notifications", "list", 7], [{ id: 3 }])
    queryClient.setQueryData(watchlistKeys.list(7), [{ id: 1 }])

    signOutAndClearCache()

    expect(queryClient.getQueryData(["notifications", "list", 7])).toEqual([
      { id: 3 },
    ])
    expect(queryClient.getQueryData(watchlistKeys.list(7))).toBeUndefined()
  })

  it("evicts the cached ticket rows of every scope (Story 6.4)", () => {
    // These rows carry the signed `qrCode` strings — the same credential the
    // localStorage eviction below exists to remove. Leaving them resident until
    // `gcTime` would hand the next account on this device a scannable QR.
    queryClient.setQueryData(myTicketKeys.list(7), [{ ticketNumber: "TW-1-1" }])
    queryClient.setQueryData(myTicketKeys.list(9), [{ ticketNumber: "TW-2-1" }])
    queryClient.setQueryData(orderTicketKeys.list("TW-1", "tok-1"), [
      { ticketNumber: "TW-1-1" },
    ])

    signOutAndClearCache()

    expect(queryClient.getQueryData(myTicketKeys.list(7))).toBeUndefined()
    expect(queryClient.getQueryData(myTicketKeys.list(9))).toBeUndefined()
    expect(
      queryClient.getQueryData(orderTicketKeys.list("TW-1", "tok-1"))
    ).toBeUndefined()
  })

  it("clears the stored guest order access tokens (Story 6.4)", () => {
    saveOrderAccess("TW-1", "tok-1")
    saveOrderAccess("TW-2", "tok-2")
    expect(listOrderAccess()).toHaveLength(2)

    signOutAndClearCache()

    // Each token is a never-expiring credential for a scannable QR — the next
    // person on this device must not inherit them.
    expect(listOrderAccess()).toEqual([])
    expect(readOrderAccess("TW-1")).toBeNull()
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
