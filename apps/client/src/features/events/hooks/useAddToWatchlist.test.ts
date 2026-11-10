/**
 * Tests for `useAddToWatchlist` (Story 5.1) — the full add-guard matrix,
 * including the pass-1 hardening: no redirect while `loading`, no POST/toast on
 * an already-watchlisted heart, and no optimistic fill when the offline enqueue
 * write fails.
 *
 * `@/lib/strapi-api`, `next-auth/react`, `next/navigation`, `next-intl`,
 * `use-toast`, and the offline queue are mocked so the hook runs standalone. The
 * react-query `onlineManager` + `navigator.onLine` are toggled to exercise the
 * online/offline branches deterministically (offline pauses the check query, so
 * the optimistic `setQueryData` is not overwritten by a late GET).
 */
import * as React from "react"
import {
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useAddToWatchlist } from "./useAddToWatchlist"

const { fetchAPIMock, useSessionMock, pushMock, toastMock, enqueueAddMock } =
  vi.hoisted(() => ({
    fetchAPIMock: vi.fn(),
    useSessionMock: vi.fn(),
    pushMock: vi.fn(),
    toastMock: vi.fn(),
    enqueueAddMock: vi.fn(),
  }))

vi.mock("@/lib/strapi-api", () => ({
  PrivateStrapiClient: { fetchAPI: fetchAPIMock },
  PublicStrapiClient: { fetchAPI: vi.fn() },
}))
vi.mock("next-auth/react", () => ({ useSession: useSessionMock }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/fr/events/evt-1",
}))
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "fr",
}))
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}))
vi.mock("../utils/watchlistQueue", () => ({ enqueueAdd: enqueueAddMock }))

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", {
    value,
    configurable: true,
    writable: true,
  })
  onlineManager.setOnline(value)
}

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

function authed(userId = 7) {
  useSessionMock.mockReturnValue({
    status: "authenticated",
    data: { user: { userId } },
  })
}

/** Count POST calls to the private client (path-agnostic). */
function postCalls() {
  return fetchAPIMock.mock.calls.filter((c) => c[2]?.method === "POST")
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchAPIMock.mockResolvedValue({ isInWatchlist: false })
  setOnline(true)
})

afterEach(() => {
  setOnline(true)
})

describe("useAddToWatchlist — online add", () => {
  it("POSTs and shows the success toast", async () => {
    authed()
    const { result } = renderHook(() => useAddToWatchlist("cw-1"), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isWatchlisted).toBe(false))

    act(() => result.current.add())

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({ description: "addSuccess" })
    )
    expect(fetchAPIMock).toHaveBeenCalledWith(
      "/user-engagement/watchlist",
      undefined,
      expect.objectContaining({ method: "POST" }),
      { useProxy: true }
    )
  })
})

describe("useAddToWatchlist — offline add", () => {
  it("enqueues, fills optimistically, toasts queued, and does NOT POST", async () => {
    authed()
    enqueueAddMock.mockReturnValue(true)
    setOnline(false)

    const { result } = renderHook(() => useAddToWatchlist("cw-1"), {
      wrapper: makeWrapper(),
    })

    act(() => result.current.add())

    await waitFor(() => expect(result.current.isWatchlisted).toBe(true))
    expect(enqueueAddMock).toHaveBeenCalledWith(7, "cw-1")
    expect(toastMock).toHaveBeenCalledWith({ description: "queued" })
    expect(postCalls()).toHaveLength(0)
  })

  it("shows an error and does NOT fill when the enqueue write fails", async () => {
    authed()
    enqueueAddMock.mockReturnValue(false)
    setOnline(false)

    const { result } = renderHook(() => useAddToWatchlist("cw-1"), {
      wrapper: makeWrapper(),
    })

    act(() => result.current.add())

    expect(toastMock).toHaveBeenCalledWith({
      variant: "destructive",
      description: "error",
    })
    expect(toastMock).not.toHaveBeenCalledWith({ description: "queued" })
    expect(result.current.isWatchlisted).toBe(false)
    expect(postCalls()).toHaveLength(0)
  })
})

describe("useAddToWatchlist — guards", () => {
  it("does NOT redirect or POST while the session is loading", () => {
    useSessionMock.mockReturnValue({ status: "loading", data: null })

    const { result } = renderHook(() => useAddToWatchlist("cw-1"), {
      wrapper: makeWrapper(),
    })

    act(() => result.current.add())

    expect(pushMock).not.toHaveBeenCalled()
    expect(toastMock).not.toHaveBeenCalled()
    expect(postCalls()).toHaveLength(0)
  })

  it("no-ops (no POST, no toast) when already watchlisted", async () => {
    authed()
    fetchAPIMock.mockResolvedValue({ isInWatchlist: true })

    const { result } = renderHook(() => useAddToWatchlist("cw-1"), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isWatchlisted).toBe(true))
    toastMock.mockClear()

    act(() => result.current.add())

    expect(postCalls()).toHaveLength(0)
    expect(toastMock).not.toHaveBeenCalled()
  })

  it("prompts sign-in and redirects with callbackUrl when unauthenticated", () => {
    useSessionMock.mockReturnValue({ status: "unauthenticated", data: null })

    const { result } = renderHook(() => useAddToWatchlist("cw-1"), {
      wrapper: makeWrapper(),
    })

    act(() => result.current.add())

    expect(toastMock).toHaveBeenCalledWith({ description: "loginRequired" })
    expect(pushMock).toHaveBeenCalledWith(
      `/fr/auth/signin?callbackUrl=${encodeURIComponent("/fr/events/evt-1")}`
    )
    expect(postCalls()).toHaveLength(0)
  })
})

/**
 * Phase 2 additive options (FR19, D-14, D-15): optimistic online add, the
 * short-film signed-out copy, and a switchable check query. The signed-out and
 * offline branches keep their guard matrix; only the toast key differs.
 */
describe("useAddToWatchlist — optimistic option", () => {
  function deferredPost() {
    let resolve!: (v: unknown) => void
    let reject!: (e: unknown) => void
    const promise = new Promise((res, rej) => {
      resolve = res
      reject = rej
    })
    fetchAPIMock.mockImplementation((_path: string, _q: unknown, init?: { method?: string }) => {
      if (init?.method === "POST") return promise
      return Promise.resolve({ isInWatchlist: false })
    })
    return { resolve, reject }
  }

  function render(
    id: string,
    options: Parameters<typeof useAddToWatchlist>[1]
  ) {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children)
    const hook = renderHook(() => useAddToWatchlist(id, options), { wrapper })
    return { ...hook, client }
  }

  it("fills the check cache before the POST settles", async () => {
    authed()
    const post = deferredPost()
    const { result, client } = render("cw-1", { optimistic: true })
    await waitFor(() =>
      expect(client.getQueryData(["watchlist", "check", 7, "cw-1"])).toEqual({
        isInWatchlist: false,
      })
    )

    act(() => result.current.add())

    await waitFor(() =>
      expect(client.getQueryData(["watchlist", "check", 7, "cw-1"])).toEqual({
        isInWatchlist: true,
      })
    )
    expect(postCalls()).toHaveLength(1)
    expect(toastMock).not.toHaveBeenCalled() // still pending

    await act(async () => post.resolve({}))
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({ description: "addSuccess" })
    )
  })

  it("rolls back to false and toasts an error when the POST fails", async () => {
    authed()
    const post = deferredPost()
    const { result, client } = render("cw-1", { optimistic: true })
    await waitFor(() =>
      expect(client.getQueryData(["watchlist", "check", 7, "cw-1"])).toBeDefined()
    )

    act(() => result.current.add())
    await waitFor(() =>
      expect(client.getQueryData(["watchlist", "check", 7, "cw-1"])).toEqual({
        isInWatchlist: true,
      })
    )

    await act(async () => post.reject(new Error("boom")))

    await waitFor(() =>
      expect(client.getQueryData(["watchlist", "check", 7, "cw-1"])).toEqual({
        isInWatchlist: false,
      })
    )
    expect(toastMock).toHaveBeenCalledWith({
      variant: "destructive",
      description: "error",
    })
  })

  it("does not write the cache before the POST when optimistic is off (default)", async () => {
    authed()
    deferredPost()
    const { result, client } = render("cw-1", undefined)
    await waitFor(() =>
      expect(client.getQueryData(["watchlist", "check", 7, "cw-1"])).toBeDefined()
    )

    act(() => result.current.add())

    await waitFor(() => expect(postCalls()).toHaveLength(1))
    expect(client.getQueryData(["watchlist", "check", 7, "cw-1"])).toEqual({
      isInWatchlist: false,
    })
  })
})

describe("useAddToWatchlist — short-film variant (D-14)", () => {
  it("toasts loginRequiredShort and redirects with the current path; writes and queues nothing", () => {
    useSessionMock.mockReturnValue({ status: "unauthenticated", data: null })

    const { result } = renderHook(
      () => useAddToWatchlist("cw-1", { variant: "short-film" }),
      { wrapper: makeWrapper() }
    )

    act(() => result.current.add())

    expect(toastMock).toHaveBeenCalledWith({
      description: "loginRequiredShort",
    })
    expect(toastMock).not.toHaveBeenCalledWith({ description: "loginRequired" })
    expect(pushMock).toHaveBeenCalledWith(
      `/fr/auth/signin?callbackUrl=${encodeURIComponent("/fr/events/evt-1")}`
    )
    expect(postCalls()).toHaveLength(0)
    expect(enqueueAddMock).not.toHaveBeenCalled()
  })
})

describe("useAddToWatchlist — check option and isResolved", () => {
  it("issues no check GET with { check: false } and isResolved stays false", async () => {
    authed()
    const { result } = renderHook(
      () => useAddToWatchlist("cw-1", { check: false }),
      { wrapper: makeWrapper() }
    )

    await new Promise((r) => setTimeout(r, 20))
    expect(fetchAPIMock).not.toHaveBeenCalled()
    expect(result.current.isResolved).toBe(false)
  })

  it("isResolved is true once the check cache holds an answer", async () => {
    authed()
    const { result } = renderHook(() => useAddToWatchlist("cw-1"), {
      wrapper: makeWrapper(),
    })
    expect(result.current.isResolved).toBe(false)
    await waitFor(() => expect(result.current.isResolved).toBe(true))
  })

  it("isResolved is true for a seeded key with { check: false }", () => {
    authed()
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    client.setQueryData(["watchlist", "check", 7, "cw-1"], {
      isInWatchlist: true,
    })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children)
    const { result } = renderHook(
      () => useAddToWatchlist("cw-1", { check: false }),
      { wrapper }
    )
    expect(result.current.isResolved).toBe(true)
    expect(result.current.isWatchlisted).toBe(true)
    expect(fetchAPIMock).not.toHaveBeenCalled()
  })
})
