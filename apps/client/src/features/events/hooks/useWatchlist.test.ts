/**
 * Tests for the cross-device poll gate on `useWatchlist` (Story 5.5).
 *
 * Two layers:
 *  - the pure `watchlistRefetchInterval` helper (the "converge within 5s" AC's
 *    testable core), and
 *  - the WIRING of that helper + `refetchIntervalInBackground: false` +
 *    `refetchOnReconnect: true` into the actual `useQuery` options, so a
 *    regression that drops or flips those options (stopping cross-device polling
 *    or polling offline / in hidden tabs) is caught — not just the detached
 *    helper.
 */
import { afterEach, describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"

// `useWatchlist.ts` imports the Strapi client, which eagerly validates `env.mjs`
// (rejecting NODE_ENV=test). Stub it so the module imports for the pure helper.
vi.mock("@/lib/strapi-api", () => ({
  PrivateStrapiClient: { fetchAPI: vi.fn() },
  PublicStrapiClient: { fetchAPI: vi.fn() },
}))

// Capture the options object `useWatchlist` passes to `useQuery` so the wiring
// (not just the helper) is asserted. Stub the other react-query exports the
// module imports at top level so it loads.
const { useQuerySpy } = vi.hoisted(() => ({
  useQuerySpy: vi.fn(() => ({ data: [], isLoading: false })),
}))

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQuerySpy(options),
  useMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
    cancelQueries: vi.fn(),
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
  }),
}))

vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: "authenticated" }),
}))

import { useWatchlist, WATCHLIST_POLL_MS, watchlistRefetchInterval } from "./useWatchlist"

describe("watchlistRefetchInterval (Story 5.5 poll gate)", () => {
  it("exposes a 5-second poll cadence", () => {
    expect(WATCHLIST_POLL_MS).toBe(5000)
  })

  it("polls every WATCHLIST_POLL_MS when online", () => {
    expect(watchlistRefetchInterval(true)).toBe(5000)
    expect(watchlistRefetchInterval(true)).toBe(WATCHLIST_POLL_MS)
  })

  it("does not poll when offline", () => {
    expect(watchlistRefetchInterval(false)).toBe(false)
  })
})

describe("useWatchlist query poll wiring (Story 5.5)", () => {
  const onLineDescriptor = Object.getOwnPropertyDescriptor(
    window.navigator,
    "onLine"
  )

  afterEach(() => {
    if (onLineDescriptor) {
      Object.defineProperty(window.navigator, "onLine", onLineDescriptor)
    }
    useQuerySpy.mockClear()
  })

  function setOnLine(value: boolean) {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value,
    })
  }

  it("wires the poll options into useQuery", () => {
    renderHook(() => useWatchlist())

    expect(useQuerySpy).toHaveBeenCalledTimes(1)
    const options = useQuerySpy.mock.calls[0][0] as {
      refetchInterval: () => number | false
      refetchIntervalInBackground: boolean
      refetchOnReconnect: boolean
    }

    expect(options.refetchIntervalInBackground).toBe(false)
    expect(options.refetchOnReconnect).toBe(true)

    setOnLine(true)
    expect(options.refetchInterval()).toBe(WATCHLIST_POLL_MS)

    setOnLine(false)
    expect(options.refetchInterval()).toBe(false)
  })
})
