import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

/**
 * Tests for `useCreateOrder` (Story 6.3): the checkout POST through the public
 * proxy, the returned `{ orderNumber, payUrl }`, and the backend error-CODE
 * surfacing. The Strapi client is mocked (it eagerly validates env.mjs).
 */

const { fetchAPIMock } = vi.hoisted(() => ({ fetchAPIMock: vi.fn() }))

vi.mock("@/lib/strapi-api", () => ({
  PublicStrapiClient: { fetchAPI: fetchAPIMock },
  PrivateStrapiClient: { fetchAPI: vi.fn() },
}))

import { useCreateOrder } from "./useCreateOrder"

const payload = {
  eventId: "event-1",
  screeningId: "sc1",
  paymentMethod: "card" as const,
  firstName: "A",
  lastName: "B",
  email: "a@b.co",
  locale: "fr",
  tickets: [{ type: "standard" as const, price: 10 }],
}

afterEach(() => {
  fetchAPIMock.mockReset()
})

describe("useCreateOrder", () => {
  it("POSTs the checkout via the proxy and returns { orderNumber, payUrl }", async () => {
    fetchAPIMock.mockResolvedValue({
      data: { orderNumber: "TW-1", payUrl: "https://pay/x" },
    })

    const { result } = renderHook(() => useCreateOrder())

    let out
    await act(async () => {
      out = await result.current.createOrder(payload)
    })

    expect(out).toEqual({ orderNumber: "TW-1", payUrl: "https://pay/x" })
    expect(fetchAPIMock).toHaveBeenCalledWith(
      "/ticketing/orders",
      undefined,
      { method: "POST", body: JSON.stringify(payload) },
      { useProxy: true }
    )
    expect(result.current.errorCode).toBeNull()
  })

  it("surfaces the backend error CODE and rethrows on failure", async () => {
    fetchAPIMock.mockRejectedValue(
      new Error(JSON.stringify({ details: { code: "KONNECT_UNAVAILABLE" } }))
    )

    const { result } = renderHook(() => useCreateOrder())

    await act(async () => {
      await expect(result.current.createOrder(payload)).rejects.toThrow()
    })

    expect(result.current.errorCode).toBe("KONNECT_UNAVAILABLE")
    expect(result.current.isSubmitting).toBe(false)
  })
})
