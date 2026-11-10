/**
 * Tests for `ShortsWatchlistProvider` (FR19, FR20; D-14, D-15): one list request
 * seeds every visible heart under the signed-in user's keys, with zero per-card
 * check requests, and never overwrites an in-flight optimistic write or an op
 * waiting in the offline queue.
 */
import * as React from "react"
import {
  onlineManager,
  QueryClient,
  QueryClientProvider,
  useMutation,
} from "@tanstack/react-query"
import { act, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useWatchlistCheck } from "@/features/events/hooks/useWatchlist"
import { enqueueOp } from "@/features/events/utils/watchlistQueue"

import {
  ShortsWatchlistProvider,
  useShortsWatchlistResolved,
} from "./ShortsWatchlistProvider"

const { fetchAPIMock, useSessionMock } = vi.hoisted(() => ({
  fetchAPIMock: vi.fn(),
  useSessionMock: vi.fn(),
}))

vi.mock("@/lib/strapi-api", () => ({
  PrivateStrapiClient: { fetchAPI: fetchAPIMock },
  PublicStrapiClient: { fetchAPI: vi.fn() },
}))
vi.mock("next-auth/react", () => ({ useSession: useSessionMock }))

const LIST_PATH = "/user-engagement/watchlist"

function listRow(documentId: string) {
  return {
    id: 1,
    documentId: `wl-${documentId}`,
    creativeWork: { id: 1, documentId, title: documentId },
    addedAt: "2026-01-01T00:00:00.000Z",
  }
}

function authed(userId = 7) {
  useSessionMock.mockReturnValue({
    status: "authenticated",
    data: { user: { userId } },
  })
}

function paths() {
  return fetchAPIMock.mock.calls.map((c) => c[0] as string)
}

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

/** A card stand-in: reads its seeded answer with the check query switched off. */
function Card({ id }: { id: string }) {
  const { data } = useWatchlistCheck(id, { enabled: false })
  return <span data-testid={`card-${id}`}>{String(data?.isInWatchlist)}</span>
}

function Resolved() {
  const { isResolved } = useShortsWatchlistResolved()
  return <span data-testid="resolved">{String(isResolved)}</span>
}

function renderGrid(
  client: QueryClient,
  documentIds: string[],
  extra?: React.ReactNode
) {
  return render(
    <QueryClientProvider client={client}>
      <ShortsWatchlistProvider documentIds={documentIds}>
        <Resolved />
        {documentIds.map((id) => (
          <Card key={id} id={id} />
        ))}
        {extra}
      </ShortsWatchlistProvider>
    </QueryClientProvider>
  )
}

function checkOf(client: QueryClient, id: string, userId = 7) {
  return client.getQueryData(["watchlist", "check", userId, id])
}

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  onlineManager.setOnline(true)
  authed()
  fetchAPIMock.mockImplementation((path: string) =>
    path === LIST_PATH
      ? Promise.resolve({ data: [listRow("a"), listRow("c")] })
      : Promise.resolve({ isInWatchlist: false })
  )
})

afterEach(() => {
  onlineManager.setOnline(true)
})

describe("ShortsWatchlistProvider — seeding", () => {
  it("seeds every visible film under the user's keys from one list request and zero check requests", async () => {
    const client = makeClient()
    renderGrid(client, ["a", "b", "c"])

    await waitFor(() => expect(checkOf(client, "a")).toBeDefined())

    expect(checkOf(client, "a")).toEqual({ isInWatchlist: true })
    expect(checkOf(client, "b")).toEqual({ isInWatchlist: false })
    expect(checkOf(client, "c")).toEqual({ isInWatchlist: true })

    expect(paths().filter((p) => p === LIST_PATH)).toHaveLength(1)
    expect(paths().filter((p) => p.includes("/watchlist/check/"))).toHaveLength(
      0
    )

    // Cards read the seeded answers without a request.
    expect(screen.getByTestId("card-a").textContent).toBe("true")
    expect(screen.getByTestId("card-b").textContent).toBe("false")
  })

  it("seeds only under [watchlist, check, <userId>, <documentId>], nothing under another user", async () => {
    const client = makeClient()
    client.setQueryData(["watchlist", "check", 9, "a"], { isInWatchlist: false })
    renderGrid(client, ["a", "b", "c"])

    await waitFor(() => expect(checkOf(client, "c")).toBeDefined())

    const checkKeys = client
      .getQueryCache()
      .findAll({ queryKey: ["watchlist", "check"] })
      .map((q) => q.queryKey)
    const seeded = checkKeys.filter((k) => k[2] === 7)
    expect(seeded).toEqual(
      expect.arrayContaining([
        ["watchlist", "check", 7, "a"],
        ["watchlist", "check", 7, "b"],
        ["watchlist", "check", 7, "c"],
      ])
    )
    // The other user's entry is untouched and nothing new was written for them.
    expect(checkKeys.filter((k) => k[2] === 9)).toEqual([
      ["watchlist", "check", 9, "a"],
    ])
    expect(checkOf(client, "a", 9)).toEqual({ isInWatchlist: false })
  })

  it("seeds nothing and requests nothing when the user id has not resolved", async () => {
    useSessionMock.mockReturnValue({
      status: "authenticated",
      data: { user: {} },
    })
    const client = makeClient()
    renderGrid(client, ["a", "b"])

    await new Promise((r) => setTimeout(r, 20))
    expect(fetchAPIMock).not.toHaveBeenCalled()
    // Disabled card observers create empty entries; none may hold an answer.
    const answered = client
      .getQueryCache()
      .findAll({ queryKey: ["watchlist", "check"] })
      .filter((q) => q.state.data !== undefined)
    expect(answered).toHaveLength(0)
  })

  it("a different signed-in user is seeded under their own keys", async () => {
    authed(9)
    const client = makeClient()
    renderGrid(client, ["a"])

    await waitFor(() => expect(checkOf(client, "a", 9)).toBeDefined())
    expect(checkOf(client, "a", 9)).toEqual({ isInWatchlist: true })
    expect(checkOf(client, "a", 7)).toBeUndefined()
  })

  it("an offline-queued op wins over the server list (D-15, no second queue)", async () => {
    enqueueOp(7, "add", "b")
    enqueueOp(7, "remove", "a")
    const client = makeClient()
    renderGrid(client, ["a", "b", "c"])

    await waitFor(() => expect(checkOf(client, "c")).toBeDefined())
    expect(checkOf(client, "a")).toEqual({ isInWatchlist: false })
    expect(checkOf(client, "b")).toEqual({ isInWatchlist: true })
  })
})

describe("ShortsWatchlistProvider — mutations in flight", () => {
  function MutationHarness({ release }: { release: { fn?: () => void } }) {
    const mutation = useMutation({
      mutationFn: () =>
        new Promise<void>((resolve) => {
          release.fn = resolve
        }),
    })
    return (
      <button type="button" onClick={() => mutation.mutate()}>
        mutate
      </button>
    )
  }

  it("does not overwrite check entries while a mutation is pending, then re-seeds from the latest list", async () => {
    let resolveList!: (v: unknown) => void
    fetchAPIMock.mockImplementation((path: string) =>
      path === LIST_PATH
        ? new Promise((res) => {
            resolveList = res
          })
        : Promise.resolve({ isInWatchlist: false })
    )
    const release: { fn?: () => void } = {}
    const client = makeClient()
    renderGrid(client, ["a", "b"], <MutationHarness release={release} />)

    // A tap is in flight; its optimistic fill sits in the cache.
    act(() => screen.getByText("mutate").click())
    await waitFor(() => expect(release.fn).toBeDefined())
    act(() => {
      client.setQueryData(["watchlist", "check", 7, "b"], {
        isInWatchlist: true,
      })
    })

    // The list lands (b is not in it) while the mutation is still pending.
    await act(async () => resolveList({ data: [listRow("a")] }))
    await waitFor(() =>
      expect(client.getQueryState(["watchlist", "list", 7])?.status).toBe(
        "success"
      )
    )
    expect(checkOf(client, "b")).toEqual({ isInWatchlist: true })
    expect(checkOf(client, "a")).toBeUndefined()

    // Mutations settle: the provider re-seeds from the latest list.
    await act(async () => release.fn!())
    await waitFor(() => expect(checkOf(client, "a")).toBeDefined())
    expect(checkOf(client, "a")).toEqual({ isInWatchlist: true })
    expect(checkOf(client, "b")).toEqual({ isInWatchlist: false })
  })
})

describe("ShortsWatchlistProvider — resolved state", () => {
  it("is false while the list is pending and true once it succeeds", async () => {
    let resolveList!: (v: unknown) => void
    fetchAPIMock.mockImplementation(
      () =>
        new Promise((res) => {
          resolveList = res
        })
    )
    renderGrid(makeClient(), ["a"])

    await waitFor(() => expect(fetchAPIMock).toHaveBeenCalled())
    expect(screen.getByTestId("resolved").textContent).toBe("false")

    await act(async () => resolveList({ data: [] }))
    await waitFor(() =>
      expect(screen.getByTestId("resolved").textContent).toBe("true")
    )
  })

  it("becomes true when the list request fails, so hearts never stay stuck", async () => {
    fetchAPIMock.mockRejectedValue(new Error("boom"))
    renderGrid(makeClient(), ["a"])

    await waitFor(() =>
      expect(screen.getByTestId("resolved").textContent).toBe("true")
    )
  })

  it("becomes true when the list fetch is paused offline", async () => {
    onlineManager.setOnline(false)
    renderGrid(makeClient(), ["a"])

    await waitFor(() =>
      expect(screen.getByTestId("resolved").textContent).toBe("true")
    )
    expect(fetchAPIMock).not.toHaveBeenCalled()
  })

  it("is true for a signed-out visitor", () => {
    useSessionMock.mockReturnValue({ status: "unauthenticated", data: null })
    renderGrid(makeClient(), ["a"])

    expect(screen.getByTestId("resolved").textContent).toBe("true")
    expect(fetchAPIMock).not.toHaveBeenCalled()
  })

  it("useShortsWatchlistResolved is true with no provider mounted", () => {
    render(
      <QueryClientProvider client={makeClient()}>
        <Resolved />
      </QueryClientProvider>
    )
    expect(screen.getByTestId("resolved").textContent).toBe("true")
  })
})
