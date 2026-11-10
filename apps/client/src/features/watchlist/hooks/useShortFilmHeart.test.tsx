/**
 * Tests for `useShortFilmHeart` (FR19, FR20; UI-SPEC Part E; D-13, D-14, D-15):
 * the one state machine behind the card heart and the detail heart.
 *
 * The REAL watchlist hooks run (check query, add/remove mutations, optimistic
 * cache writes); only the network (`PrivateStrapiClient.fetchAPI`), the session,
 * the router, the toast and the offline queue are mocked. A tiny fake server
 * answers the check, POST and DELETE calls so optimistic state, rollback and
 * the post-mutation refetch behave like production.
 */
import * as React from "react"
import { watchlistKeys } from "@/features/events/hooks/useWatchlist"
import {
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useShortFilmHeart } from "./useShortFilmHeart"

const {
  fetchAPIMock,
  useSessionMock,
  pushMock,
  toastMock,
  enqueueAddMock,
  enqueueOpMock,
  gridState,
} = vi.hoisted(() => ({
  fetchAPIMock: vi.fn(),
  useSessionMock: vi.fn(),
  pushMock: vi.fn(),
  toastMock: vi.fn(),
  enqueueAddMock: vi.fn(),
  enqueueOpMock: vi.fn(),
  gridState: { isResolved: true },
}))

vi.mock("@/lib/strapi-api", () => ({
  PrivateStrapiClient: { fetchAPI: fetchAPIMock },
  PublicStrapiClient: { fetchAPI: vi.fn() },
}))
vi.mock("next-auth/react", () => ({ useSession: useSessionMock }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/shorts/communion",
}))
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "fr",
}))
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}))
vi.mock("@/features/events/utils/watchlistQueue", () => ({
  enqueueAdd: enqueueAddMock,
  enqueueOp: enqueueOpMock,
  getPendingOps: () => [],
}))
vi.mock("../components/ShortsWatchlistProvider", () => ({
  useShortsWatchlistResolved: () => gridState,
}))

const FILM = "cw-1"

/** The fake server: one film, saved or not. */
const server = { saved: false, failWrites: false, checkMode: "ok" as string }
let postGate: Promise<void> | null = null
let releasePost: () => void = () => {}

function gatePost() {
  postGate = new Promise<void>((resolve) => {
    releasePost = resolve
  })
}

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", {
    value,
    configurable: true,
    writable: true,
  })
  onlineManager.setOnline(value)
}

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

function session(status: "loading" | "authenticated" | "unauthenticated") {
  useSessionMock.mockReturnValue({
    status,
    data: status === "authenticated" ? { user: { userId: 7 } } : null,
  })
}

function calls(method: string) {
  return fetchAPIMock.mock.calls.filter((c) => c[2]?.method === method)
}

function checkGets() {
  return calls("GET").filter((c) => String(c[0]).includes("/watchlist/check/"))
}

function render(surface: "card" | "detail", client = makeClient()) {
  const view = renderHook(() => useShortFilmHeart(FILM, { surface }), {
    wrapper: makeWrapper(client),
  })
  return { ...view, client }
}

beforeEach(() => {
  vi.clearAllMocks()
  server.saved = false
  server.failWrites = false
  server.checkMode = "ok"
  postGate = null
  gridState.isResolved = true
  setOnline(true)
  session("authenticated")

  fetchAPIMock.mockImplementation(
    async (path: string, _params: unknown, init: { method?: string }) => {
      const method = init?.method
      if (method === "GET" && path.includes("/watchlist/check/")) {
        if (server.checkMode === "pending") return new Promise(() => {})
        if (server.checkMode === "error") throw new Error("boom")
        return { isInWatchlist: server.saved }
      }
      if (method === "POST") {
        if (postGate) await postGate
        if (server.failWrites) throw new Error("write failed")
        server.saved = true
        return {}
      }
      if (method === "DELETE") {
        if (server.failWrites) throw new Error("write failed")
        server.saved = false
        return {}
      }
      return {}
    }
  )
})

afterEach(() => {
  setOnline(true)
})

describe("useShortFilmHeart — session guards", () => {
  it("does nothing while the session is loading (no redirect, no request)", () => {
    session("loading")
    const { result } = render("card")

    act(() => result.current.toggle())

    expect(pushMock).not.toHaveBeenCalled()
    expect(toastMock).not.toHaveBeenCalled()
    expect(fetchAPIMock).not.toHaveBeenCalled()
    expect(result.current.isBusy).toBe(false)
  })

  it("signed out: toasts, redirects with the current path, saves and queues nothing (D-14)", () => {
    session("unauthenticated")
    const { result } = render("card")

    expect(result.current.isResolved).toBe(true)
    expect(result.current.isBusy).toBe(false)

    act(() => result.current.toggle())

    expect(toastMock).toHaveBeenCalledWith({
      description: "loginRequiredShort",
    })
    expect(pushMock).toHaveBeenCalledWith(
      `/fr/auth/signin?callbackUrl=${encodeURIComponent("/shorts/communion")}`
    )
    expect(result.current.isSaved).toBe(false)
    expect(fetchAPIMock).not.toHaveBeenCalled()
    expect(enqueueAddMock).not.toHaveBeenCalled()
    expect(enqueueOpMock).not.toHaveBeenCalled()
  })
})

describe("useShortFilmHeart — unresolved state", () => {
  it("detail: ignores taps and reports busy until the check answers", async () => {
    server.checkMode = "pending"
    const { result } = render("detail")

    await waitFor(() => expect(checkGets()).toHaveLength(1))
    expect(result.current.isResolved).toBe(false)
    expect(result.current.isBusy).toBe(true)

    act(() => result.current.toggle())

    expect(calls("POST")).toHaveLength(0)
    expect(toastMock).not.toHaveBeenCalled()
  })

  it("detail: a failed check resolves to unsaved so the heart is never stuck busy", async () => {
    server.checkMode = "error"
    const { result } = render("detail")

    await waitFor(() => expect(result.current.isResolved).toBe(true))
    expect(result.current.isBusy).toBe(false)
    expect(result.current.isSaved).toBe(false)

    act(() => result.current.toggle())
    await waitFor(() => expect(calls("POST")).toHaveLength(1))
  })

  it("detail: a paused (offline) check resolves to unsaved", async () => {
    setOnline(false)
    const { result } = render("detail")

    await waitFor(() => expect(result.current.isResolved).toBe(true))
    expect(result.current.isBusy).toBe(false)
    expect(checkGets()).toHaveLength(0)
  })

  it("card: busy and inert while the grid provider is unresolved", () => {
    gridState.isResolved = false
    const { result } = render("card")

    expect(result.current.isResolved).toBe(false)
    expect(result.current.isBusy).toBe(true)

    act(() => result.current.toggle())

    expect(calls("POST")).toHaveLength(0)
    expect(toastMock).not.toHaveBeenCalled()
  })
})

describe("useShortFilmHeart — request cost", () => {
  it("card surface issues zero per-film check requests", async () => {
    const { result } = render("card")

    act(() => result.current.toggle())
    await waitFor(() => expect(calls("POST")).toHaveLength(1))

    expect(checkGets()).toHaveLength(0)
  })

  it("detail surface issues exactly one check request", async () => {
    const { result } = render("detail")

    await waitFor(() => expect(result.current.isResolved).toBe(true))
    expect(checkGets()).toHaveLength(1)
  })
})

describe("useShortFilmHeart — add", () => {
  it("fills at once, before the POST settles, and toasts on success", async () => {
    const { result } = render("detail")
    await waitFor(() => expect(result.current.isResolved).toBe(true))

    gatePost()
    act(() => result.current.toggle())

    await waitFor(() => expect(result.current.isSaved).toBe(true))
    expect(result.current.isBusy).toBe(true)
    expect(result.current.isPending).toBe(true)
    expect(toastMock).not.toHaveBeenCalled()

    // A second tap while the write is in flight does nothing.
    act(() => result.current.toggle())
    expect(calls("POST")).toHaveLength(1)
    expect(calls("DELETE")).toHaveLength(0)

    await act(async () => releasePost())
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({ description: "addSuccess" })
    )
    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current.isSaved).toBe(true)
    expect(result.current.isBusy).toBe(false)
  })

  it("rolls back and shows the destructive error toast when the POST fails", async () => {
    const { result } = render("detail")
    await waitFor(() => expect(result.current.isResolved).toBe(true))

    server.failWrites = true
    act(() => result.current.toggle())

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({
        variant: "destructive",
        description: "error",
      })
    )
    await waitFor(() => expect(result.current.isSaved).toBe(false))
    expect(result.current.isBusy).toBe(false)
  })
})

describe("useShortFilmHeart — remove", () => {
  it("empties at once, DELETEs once and offers Undo", async () => {
    server.saved = true
    const { result } = render("detail")
    await waitFor(() => expect(result.current.isSaved).toBe(true))

    act(() => result.current.toggle())

    await waitFor(() => expect(result.current.isSaved).toBe(false))
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ description: "removeSuccess" })
      )
    )
    expect(calls("DELETE")).toHaveLength(1)
    const toast = toastMock.mock.calls.find(
      (c) => c[0].description === "removeSuccess"
    )![0]
    expect(toast.action.props.altText).toBe("undoRemove")
  })

  it("rolls back and shows the error toast when the DELETE fails", async () => {
    server.saved = true
    const { result } = render("detail")
    await waitFor(() => expect(result.current.isSaved).toBe(true))

    server.failWrites = true
    act(() => result.current.toggle())

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({
        variant: "destructive",
        description: "error",
      })
    )
    await waitFor(() => expect(result.current.isSaved).toBe(true))
  })

  it("ignores taps while the Undo re-add is in flight", async () => {
    server.saved = true
    const { result } = render("detail")
    await waitFor(() => expect(result.current.isSaved).toBe(true))

    act(() => result.current.toggle())
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ description: "removeSuccess" })
      )
    )
    await waitFor(() => expect(result.current.isPending).toBe(false))

    const undo = toastMock.mock.calls.find(
      (c) => c[0].description === "removeSuccess"
    )![0].action.props.onClick as () => void

    gatePost()
    act(() => undo())
    await waitFor(() => expect(result.current.isPending).toBe(true))
    expect(result.current.isSaved).toBe(true)

    act(() => result.current.toggle())

    expect(calls("DELETE")).toHaveLength(1)
    expect(calls("POST")).toHaveLength(1)
    await act(async () => releasePost())
  })
})

describe("useShortFilmHeart — offline (D-15)", () => {
  it("queues an add through the existing queue: filled, queued toast, no POST", async () => {
    enqueueAddMock.mockReturnValue(true)
    setOnline(false)
    const { result } = render("card")

    act(() => result.current.toggle())

    await waitFor(() => expect(result.current.isSaved).toBe(true))
    expect(enqueueAddMock).toHaveBeenCalledWith(7, FILM)
    expect(toastMock).toHaveBeenCalledWith({ description: "queued" })
    expect(calls("POST")).toHaveLength(0)
  })

  it("leaves the heart unchanged and toasts an error when the queue write fails", async () => {
    enqueueAddMock.mockReturnValue(false)
    setOnline(false)
    const { result } = render("card")

    act(() => result.current.toggle())

    expect(enqueueAddMock).toHaveBeenCalled()
    expect(toastMock).toHaveBeenCalledWith({
      variant: "destructive",
      description: "error",
    })
    expect(result.current.isSaved).toBe(false)
    expect(calls("POST")).toHaveLength(0)
  })

  it("queues a remove: emptied, Undo toast, no DELETE", async () => {
    enqueueOpMock.mockReturnValue(true)
    setOnline(false)
    const client = makeClient()
    client.setQueryData(watchlistKeys.check(7, FILM), { isInWatchlist: true })
    const { result } = render("card", client)
    expect(result.current.isSaved).toBe(true)

    act(() => result.current.toggle())

    await waitFor(() => expect(result.current.isSaved).toBe(false))
    expect(enqueueOpMock).toHaveBeenCalledWith(7, "remove", FILM)
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: "removeSuccess" })
    )
    expect(calls("DELETE")).toHaveLength(0)
  })
})
