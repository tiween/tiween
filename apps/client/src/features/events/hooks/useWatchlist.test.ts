/**
 * Tests for `useWatchlist` / `useWatchlistCheck`:
 *
 *  - the cross-device poll gate (Story 5.5): the pure
 *    `watchlistRefetchInterval` helper AND the wiring of that helper +
 *    `refetchIntervalInBackground: false` + `refetchOnReconnect: true` into the
 *    actual `useQuery` options, so a regression that drops or flips those
 *    options (stopping cross-device polling or polling offline / in hidden
 *    tabs) is caught — not just the detached helper.
 *  - the user-scoped query keys (Story 5.8): every key carries the numeric
 *    `session.user.userId`, the queries are disabled until that id resolves,
 *    and a second user in the SAME tab can never read the first user's cached
 *    list or check answers.
 *
 * `useQuery` is spied but PASSES THROUGH to the real react-query implementation
 * so the isolation tests exercise real cache matching, not a stub.
 */
import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { WatchlistItem } from "./useWatchlist"

import {
  UNRESOLVED_USER_ID,
  useWatchlist,
  useWatchlistCheck,
  WATCHLIST_POLL_MS,
  watchlistKeys,
  watchlistRefetchInterval,
} from "./useWatchlist"

const { useQuerySpy, fetchAPIMock, useSessionMock } = vi.hoisted(() => ({
  useQuerySpy: vi.fn(),
  fetchAPIMock: vi.fn(),
  useSessionMock: vi.fn(),
}))

// `useWatchlist.ts` imports the Strapi client, which eagerly validates `env.mjs`
// (rejecting NODE_ENV=test). Stub it so the module imports.
vi.mock("@/lib/strapi-api", () => ({
  PrivateStrapiClient: { fetchAPI: fetchAPIMock },
  PublicStrapiClient: { fetchAPI: vi.fn() },
}))

// Capture the options object the hooks pass to `useQuery` (so the wiring, not
// just the helper, is asserted) while still running the REAL `useQuery`.
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>()
  return {
    ...actual,
    useQuery: (options: unknown) => {
      useQuerySpy(options)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return actual.useQuery(options as any)
    },
  }
})

vi.mock("next-auth/react", () => ({ useSession: useSessionMock }))

function authed(userId: number) {
  useSessionMock.mockReturnValue({
    status: "authenticated",
    data: { user: { userId } },
  })
}

/** Authenticated, but the session has not yet carried a `userId` through. */
function authedWithoutId() {
  useSessionMock.mockReturnValue({
    status: "authenticated",
    data: { user: {} },
  })
}

function loadingSession() {
  useSessionMock.mockReturnValue({ status: "loading", data: null })
}

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

/** A minimal watchlist row, enough to tell one user's rows from another's. */
function makeItem(title: string): WatchlistItem {
  return {
    id: 1,
    documentId: `wl-${title}`,
    creativeWork: { id: 1, documentId: `cw-${title}`, title },
    addedAt: "2026-01-01T00:00:00.000Z",
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchAPIMock.mockResolvedValue({ data: [] })
  authed(7)
})

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
  })

  function setOnLine(value: boolean) {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value,
    })
  }

  it("wires the poll options into useQuery", () => {
    renderHook(() => useWatchlist(), { wrapper: wrapperFor(makeClient()) })

    expect(useQuerySpy).toHaveBeenCalled()
    const options = useQuerySpy.mock.calls[0]![0] as {
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

describe("watchlistKeys — user scoping (Story 5.8)", () => {
  it("keeps `all` as the bare shared prefix so one removeQueries clears every scope", () => {
    expect(watchlistKeys.all).toEqual(["watchlist"])
  })

  it("scopes list and check keys by a NUMERIC user id", () => {
    expect(watchlistKeys.list(7)).toEqual(["watchlist", "list", 7])
    expect(watchlistKeys.check(7, "cw-1")).toEqual([
      "watchlist",
      "check",
      7,
      "cw-1",
    ])
    // Two users never collide.
    expect(watchlistKeys.list(7)).not.toEqual(watchlistKeys.list(9))
    // Numbers, never strings — react-query compares keys structurally.
    expect(watchlistKeys.list(7)).not.toEqual(["watchlist", "list", "7"])
  })
})

describe("useWatchlist / useWatchlistCheck — key scoping + enabled gate", () => {
  it("keys the list query on the authenticated user id", () => {
    renderHook(() => useWatchlist(), { wrapper: wrapperFor(makeClient()) })

    const options = useQuerySpy.mock.calls[0]![0] as {
      queryKey: unknown
      enabled: boolean
    }
    expect(options.queryKey).toEqual(["watchlist", "list", 7])
    expect(options.enabled).toBe(true)
  })

  it("keys the check query on the authenticated user id", () => {
    renderHook(() => useWatchlistCheck("cw-1"), {
      wrapper: wrapperFor(makeClient()),
    })

    const options = useQuerySpy.mock.calls[0]![0] as {
      queryKey: unknown
      enabled: boolean
    }
    expect(options.queryKey).toEqual(["watchlist", "check", 7, "cw-1"])
    expect(options.enabled).toBe(true)
  })

  it("does not fire — and builds no undefined-id key — while the session is loading", () => {
    loadingSession()
    renderHook(() => useWatchlist(), { wrapper: wrapperFor(makeClient()) })

    const options = useQuerySpy.mock.calls[0]![0] as {
      queryKey: unknown[]
      enabled: boolean
    }
    expect(options.enabled).toBe(false)
    // The exact placeholder scope, not merely "nothing undefined" — a key of
    // `["watchlist","list",null]` would satisfy the weaker check while quietly
    // re-collapsing every unresolved session onto one shared entry.
    expect(options.queryKey).toEqual(["watchlist", "list", UNRESOLVED_USER_ID])
    expect(fetchAPIMock).not.toHaveBeenCalled()
  })

  it("does not fire when authenticated but the user id has not resolved", () => {
    authedWithoutId()
    renderHook(() => useWatchlist(), { wrapper: wrapperFor(makeClient()) })

    const options = useQuerySpy.mock.calls[0]![0] as {
      queryKey: unknown[]
      enabled: boolean
    }
    expect(options.enabled).toBe(false)
    expect(options.queryKey).toEqual(["watchlist", "list", UNRESOLVED_USER_ID])
    expect(fetchAPIMock).not.toHaveBeenCalled()
  })
})

describe("same-tab user switch (Story 5.8) — B never reads A's cache", () => {
  it("does not serve user A's cached LIST to user B", async () => {
    const client = makeClient()
    // User A (7) has already browsed: their rows sit in the cache.
    client.setQueryData(watchlistKeys.list(7), [makeItem("A-film")])

    // A signs out, B (9) signs in in the same tab — same QueryClient.
    authed(9)
    fetchAPIMock.mockResolvedValue({ data: [makeItem("B-film")] })

    const { result } = renderHook(() => useWatchlist(), {
      wrapper: wrapperFor(client),
    })

    // B's first paint is empty — never A's rows.
    expect(result.current.data).toBeUndefined()

    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data?.[0]?.creativeWork.title).toBe("B-film")

    // A's entry is untouched (and still un-matchable by B's observer).
    expect(client.getQueryData(watchlistKeys.list(7))).toEqual([
      makeItem("A-film"),
    ])
  })

  it("does not serve user A's cached CHECK answer to user B", async () => {
    const client = makeClient()
    // A had `cw-1` watchlisted.
    client.setQueryData(watchlistKeys.check(7, "cw-1"), {
      isInWatchlist: true,
    })

    authed(9)
    fetchAPIMock.mockResolvedValue({ isInWatchlist: false })

    const { result } = renderHook(() => useWatchlistCheck("cw-1"), {
      wrapper: wrapperFor(client),
    })

    // B must NOT inherit A's filled heart.
    expect(result.current.data).toBeUndefined()

    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data?.isInWatchlist).toBe(false)
    expect(client.getQueryData(watchlistKeys.check(7, "cw-1"))).toEqual({
      isInWatchlist: true,
    })
  })
})
