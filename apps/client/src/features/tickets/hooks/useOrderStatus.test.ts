import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

/**
 * Tests for `useOrderStatus` (Story 6.3): the idempotent confirm POST and the
 * reconciled status it returns. The Strapi client is mocked.
 */

const { fetchAPIMock } = vi.hoisted(() => ({ fetchAPIMock: vi.fn() }))

vi.mock("@/lib/strapi-api", () => ({
  PublicStrapiClient: { fetchAPI: fetchAPIMock },
  PrivateStrapiClient: { fetchAPI: vi.fn() },
}))

import { useOrderStatus } from "./useOrderStatus"

afterEach(() => {
  fetchAPIMock.mockReset()
})

describe("useOrderStatus", () => {
  it("POSTs the confirm endpoint via the proxy and returns the status", async () => {
    fetchAPIMock.mockResolvedValue({
      data: { orderNumber: "TW-1", status: "paid", changed: true },
    })

    const { result } = renderHook(() => useOrderStatus())

    let out
    await act(async () => {
      out = await result.current.confirmOrder("TW-1")
    })

    expect(out).toEqual({ orderNumber: "TW-1", status: "paid", changed: true })
    expect(fetchAPIMock).toHaveBeenCalledWith(
      "/ticketing/orders/TW-1/confirm",
      undefined,
      { method: "POST", body: JSON.stringify({}) },
      { useProxy: true }
    )
  })

  it("surfaces the error CODE on failure", async () => {
    fetchAPIMock.mockRejectedValue(
      new Error(JSON.stringify({ details: { code: "INVALID_ORDER" } }))
    )

    const { result } = renderHook(() => useOrderStatus())

    await act(async () => {
      await expect(result.current.confirmOrder("TW-1")).rejects.toThrow()
    })

    expect(result.current.errorCode).toBe("INVALID_ORDER")
  })
})
