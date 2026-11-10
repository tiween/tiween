/**
 * Tests for `useWatchlistIds` (FR19): the non-polling list-membership query that
 * lets a shorts grid resolve every heart from one request.
 *
 * `@/lib/strapi-api` and `next-auth/react` are mocked; a real QueryClient makes
 * the shared-key and no-polling assertions about real cache entries.
 */
import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { watchlistKeys } from "@/features/events/utils/watchlistKeys"

import { useWatchlistIds } from "./useWatchlistIds"

const { fetchAPIMock, useSessionMock } = vi.hoisted(() => ({
  fetchAPIMock: vi.fn(),
  useSessionMock: vi.fn(),
}))

vi.mock("@/lib/strapi-api", () => ({
  PrivateStrapiClient: { fetchAPI: fetchAPIMock },
  PublicStrapiClient: { fetchAPI: vi.fn() },
}))
vi.mock("next-auth/react", () => ({ useSession: useSessionMock }))

function row(documentId: string | null) {
  return {
    id: 1,
    documentId: `wl-${documentId}`,
    creativeWork: documentId ? { id: 1, documentId, title: documentId } : null,
    addedAt: "2026-01-01T00:00:00.000Z",
  }
}

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children)
  return { client, wrapper }
}

beforeEach(() => {
  vi.clearAllMocks()
  useSessionMock.mockReturnValue({
    status: "authenticated",
    data: { user: { userId: 7 } },
  })
  fetchAPIMock.mockResolvedValue({
    data: [row("a"), row(null), row("c")],
  })
})

describe("useWatchlistIds", () => {
  it("issues one list GET and returns a Set of creativeWork.documentId, skipping null relations", async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useWatchlistIds(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(new Set(["a", "c"]))
    expect(fetchAPIMock).toHaveBeenCalledTimes(1)
    expect(fetchAPIMock).toHaveBeenCalledWith(
      "/user-engagement/watchlist",
      expect.objectContaining({ populate: expect.any(Array) }),
      { method: "GET" },
      { useProxy: true }
    )
  })

  it("shares watchlistKeys.list(userId) and never sets a refetch interval", async () => {
    const { client, wrapper } = setup()
    const { result } = renderHook(() => useWatchlistIds(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const query = client.getQueryCache().find({ queryKey: ["watchlist", "list", 7] })
    expect(query).toBeDefined()
    expect(query!.queryKey).toEqual(watchlistKeys.list(7))
    // The cache holds the raw rows (what useWatchlist reads), not the Set.
    expect(Array.isArray(query!.state.data)).toBe(true)
    const options = query!.observers[0]!.options
    expect(options.refetchInterval).toBeUndefined()
  })

  it("issues no request for a signed-out visitor", async () => {
    useSessionMock.mockReturnValue({ status: "unauthenticated", data: null })
    const { wrapper } = setup()
    const { result } = renderHook(() => useWatchlistIds(), { wrapper })

    await new Promise((r) => setTimeout(r, 20))
    expect(result.current.fetchStatus).toBe("idle")
    expect(fetchAPIMock).not.toHaveBeenCalled()
  })

  it("issues no request while the session is loading or the user id is unresolved", async () => {
    useSessionMock.mockReturnValue({ status: "loading", data: null })
    const loading = setup()
    renderHook(() => useWatchlistIds(), { wrapper: loading.wrapper })

    useSessionMock.mockReturnValue({
      status: "authenticated",
      data: { user: {} },
    })
    const noId = setup()
    renderHook(() => useWatchlistIds(), { wrapper: noId.wrapper })

    await new Promise((r) => setTimeout(r, 20))
    expect(fetchAPIMock).not.toHaveBeenCalled()
  })
})
