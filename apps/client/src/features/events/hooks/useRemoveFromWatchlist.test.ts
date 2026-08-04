/**
 * Tests for `useRemoveFromWatchlist` (Story 5.2) — the full remove-guard matrix
 * plus BOTH Undo re-add paths.
 *
 * `./useWatchlist` is mocked so the check state and the add/remove mutations are
 * fully controlled (no real network / no refetch overwriting the optimistic
 * cache); `next-auth/react`, `next-intl`, `use-toast`, `@/components/ui/toast`
 * (ToastAction), and the offline queue are mocked too. A real
 * `QueryClientProvider` supplies the client so the optimistic `setQueryData`
 * (heart fill/outline) is observable.
 *
 * The Undo action is captured off the `toast({ action })` call: with ToastAction
 * mocked to a passthrough, the toast's `action.props.onClick` IS the `reAdd`
 * handler, so an Undo tap is exercised by invoking it.
 */
import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useRemoveFromWatchlist } from "./useRemoveFromWatchlist"

const {
  useSessionMock,
  toastMock,
  enqueueOpMock,
  removeMutate,
  addMutate,
  state,
} = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
  toastMock: vi.fn(),
  enqueueOpMock: vi.fn(),
  removeMutate: vi.fn(),
  addMutate: vi.fn(),
  state: {
    checkData: undefined as undefined | { isInWatchlist: boolean },
    removePending: false,
    addPending: false,
  },
}))

vi.mock("next-auth/react", () => ({ useSession: useSessionMock }))
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}))
// Passthrough ToastAction: the created element carries `onClick` (= reAdd) in
// its props, so an Undo tap is exercised by invoking that handler.
vi.mock("@/components/ui/toast", () => ({
  ToastAction: (props: { children?: React.ReactNode }) => props.children,
}))
vi.mock("../utils/watchlistQueue", () => ({ enqueueOp: enqueueOpMock }))
vi.mock("./useWatchlist", () => ({
  useWatchlistCheck: () => ({ data: state.checkData }),
  useWatchlistMutations: () => ({
    removeMutation: { isPending: state.removePending, mutate: removeMutate },
    addMutation: { isPending: state.addPending, mutate: addMutate },
  }),
  watchlistKeys: {
    all: ["watchlist"],
    list: (userId: number) => ["watchlist", "list", userId],
    check: (userId: number, id: string) => ["watchlist", "check", userId, id],
  },
}))

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

function renderRemove(id: string | undefined = "cw-1") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children)
  const { result } = renderHook(() => useRemoveFromWatchlist(id), { wrapper })
  return { result, client }
}

/** The cached check value = the heart state (true filled, false outline). */
function checkState(client: QueryClient, id = "cw-1") {
  return client.getQueryData(["watchlist", "check", 7, id])
}

/** The `action` (Undo) attached to the last `removeSuccess` toast. */
function undoFromToast() {
  const call = toastMock.mock.calls
    .map((c) => c[0])
    .find((arg) => arg?.description === "removeSuccess")
  return call?.action as { props: { onClick: () => void } } | undefined
}

beforeEach(() => {
  vi.clearAllMocks()
  state.checkData = { isInWatchlist: true } // watchlisted by default
  state.removePending = false
  state.addPending = false
  authed()
  setOnline(true)
})

afterEach(() => {
  setOnline(true)
})

describe("useRemoveFromWatchlist — online remove", () => {
  it("DELETEs, toasts removeSuccess with an Undo action, and outlines the heart", () => {
    removeMutate.mockImplementation((_id, opts) => opts?.onSuccess?.())
    const { result, client } = renderRemove()

    act(() => result.current.remove())

    expect(removeMutate).toHaveBeenCalledWith("cw-1", expect.any(Object))
    const toastArg = toastMock.mock.calls
      .map((c) => c[0])
      .find((a) => a?.description === "removeSuccess")
    expect(toastArg).toBeTruthy()
    expect(toastArg.action).toBeTruthy() // Undo present
    expect(checkState(client)).toEqual({ isInWatchlist: false })
  })

  it("rolls the heart back to filled and toasts error on API failure", () => {
    removeMutate.mockImplementation((_id, opts) => opts?.onError?.())
    const { result, client } = renderRemove()

    act(() => result.current.remove())

    expect(checkState(client)).toEqual({ isInWatchlist: true })
    expect(toastMock).toHaveBeenCalledWith({
      variant: "destructive",
      description: "error",
    })
  })
})

describe("useRemoveFromWatchlist — offline remove", () => {
  it("enqueues a 'remove' op, outlines the heart, toasts Undo, and does NOT DELETE", () => {
    setOnline(false)
    enqueueOpMock.mockReturnValue(true)
    const { result, client } = renderRemove()

    act(() => result.current.remove())

    expect(enqueueOpMock).toHaveBeenCalledWith(7, "remove", "cw-1")
    expect(removeMutate).not.toHaveBeenCalled()
    expect(checkState(client)).toEqual({ isInWatchlist: false })
    expect(undoFromToast()).toBeTruthy()
  })

  it("shows an error and keeps the heart filled when the enqueue write fails", () => {
    setOnline(false)
    enqueueOpMock.mockReturnValue(false)
    const { result, client } = renderRemove()
    client.setQueryData(["watchlist", "check", 7, "cw-1"], {
      isInWatchlist: true,
    })

    act(() => result.current.remove())

    expect(toastMock).toHaveBeenCalledWith({
      variant: "destructive",
      description: "error",
    })
    expect(toastMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ description: "removeSuccess" })
    )
    expect(checkState(client)).toEqual({ isInWatchlist: true }) // still filled
  })
})

describe("useRemoveFromWatchlist — guards", () => {
  it("no-ops when the heart is NOT watchlisted (the add flow owns that tap)", () => {
    state.checkData = { isInWatchlist: false }
    setOnline(false)
    const { result } = renderRemove()

    act(() => result.current.remove())

    expect(removeMutate).not.toHaveBeenCalled()
    expect(enqueueOpMock).not.toHaveBeenCalled()
    expect(toastMock).not.toHaveBeenCalled()
  })

  it("no-ops (no DELETE / queue / toast) while the session is loading", () => {
    useSessionMock.mockReturnValue({ status: "loading", data: null })
    const { result } = renderRemove()

    act(() => result.current.remove())

    expect(removeMutate).not.toHaveBeenCalled()
    expect(enqueueOpMock).not.toHaveBeenCalled()
    expect(toastMock).not.toHaveBeenCalled()
  })

  it("no-ops when unauthenticated", () => {
    useSessionMock.mockReturnValue({ status: "unauthenticated", data: null })
    const { result } = renderRemove()

    act(() => result.current.remove())

    expect(removeMutate).not.toHaveBeenCalled()
    expect(enqueueOpMock).not.toHaveBeenCalled()
  })

  it("no-ops when a remove is already in flight (double-fire guard)", () => {
    state.removePending = true
    const { result } = renderRemove()

    act(() => result.current.remove())

    expect(removeMutate).not.toHaveBeenCalled()
  })
})

describe("useRemoveFromWatchlist — Undo (re-add)", () => {
  it("online Undo re-adds via addMutation and refills the heart", () => {
    removeMutate.mockImplementation((_id, opts) => opts?.onSuccess?.())
    const { result, client } = renderRemove()

    act(() => result.current.remove())
    const undo = undoFromToast()
    expect(undo).toBeTruthy()

    act(() => undo!.props.onClick())

    expect(addMutate).toHaveBeenCalledWith("cw-1", expect.any(Object))
    expect(checkState(client)).toEqual({ isInWatchlist: true })
  })

  it("offline Undo enqueues an 'add' op (NOT 'remove') and refills the heart", () => {
    setOnline(false)
    enqueueOpMock.mockReturnValue(true)
    const { result, client } = renderRemove()

    act(() => result.current.remove())
    expect(enqueueOpMock).toHaveBeenLastCalledWith(7, "remove", "cw-1")
    const undo = undoFromToast()

    act(() => undo!.props.onClick())

    // The re-add must enqueue an ADD (the copy-paste regression site).
    expect(enqueueOpMock).toHaveBeenLastCalledWith(7, "add", "cw-1")
    expect(addMutate).not.toHaveBeenCalled() // stayed offline
    expect(checkState(client)).toEqual({ isInWatchlist: true })
  })

  it("offline Undo whose enqueue fails shows an error and does NOT refill", () => {
    setOnline(false)
    // remove enqueue succeeds; the Undo re-add enqueue fails.
    enqueueOpMock.mockReturnValueOnce(true).mockReturnValueOnce(false)
    const { result, client } = renderRemove()

    act(() => result.current.remove())
    expect(checkState(client)).toEqual({ isInWatchlist: false }) // outlined
    const undo = undoFromToast() // capture BEFORE clearing the toast spy
    toastMock.mockClear()

    act(() => undo!.props.onClick())

    expect(toastMock).toHaveBeenCalledWith({
      variant: "destructive",
      description: "error",
    })
    // No false refill — the heart stays outlined.
    expect(checkState(client)).toEqual({ isInWatchlist: false })
  })
})

describe("useRemoveFromWatchlist — in-flight guard (isPending)", () => {
  it("exposes isPending while a remove is in flight", () => {
    state.removePending = true
    state.addPending = false
    const { result } = renderRemove()
    expect(result.current.isPending).toBe(true)
  })

  it("exposes isPending while the Undo re-add is in flight (own addMutation)", () => {
    // The re-add runs on this hook's OWN addMutation; if isPending omitted it,
    // the heart would re-enable during the re-add POST and reopen the race.
    state.removePending = false
    state.addPending = true
    const { result } = renderRemove()
    expect(result.current.isPending).toBe(true)
  })

  it("isPending is false when neither mutation is pending", () => {
    state.removePending = false
    state.addPending = false
    const { result } = renderRemove()
    expect(result.current.isPending).toBe(false)
  })
})
