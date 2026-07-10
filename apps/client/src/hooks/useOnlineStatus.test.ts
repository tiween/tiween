/**
 * Tests for `useOnlineStatus` (Story 5.4) — the reusable offline detector behind
 * the watchlist offline banner + read-only card gating.
 *
 * Uses the established `Object.defineProperty(navigator, "onLine", …)` +
 * `window.dispatchEvent(new Event(...))` pattern (see `useWatchlistSync.test.ts`).
 */
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useOnlineStatus } from "./useOnlineStatus"

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", {
    value,
    configurable: true,
    writable: true,
  })
}

beforeEach(() => {
  setOnline(true)
})

afterEach(() => {
  setOnline(true)
})

describe("useOnlineStatus", () => {
  it("reflects the initial navigator.onLine after mount", () => {
    setOnline(false)
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(false)
  })

  it("reflects online on mount when connected", () => {
    setOnline(true)
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(true)
  })

  it("flips to false on an `offline` event and back on `online`", () => {
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(true)

    act(() => {
      setOnline(false)
      window.dispatchEvent(new Event("offline"))
    })
    expect(result.current).toBe(false)

    act(() => {
      setOnline(true)
      window.dispatchEvent(new Event("online"))
    })
    expect(result.current).toBe(true)
  })

  it("removes its listeners on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener")
    const { unmount } = renderHook(() => useOnlineStatus())

    unmount()

    expect(removeSpy).toHaveBeenCalledWith("online", expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith("offline", expect.any(Function))
    removeSpy.mockRestore()
  })
})
