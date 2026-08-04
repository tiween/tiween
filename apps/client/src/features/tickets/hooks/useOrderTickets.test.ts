/**
 * Tests for `useOrderTickets` (Story 6.4) — the guest ticket read. Mirrors the
 * `useTicketTiers` harness: the Strapi client is mocked (it eagerly validates
 * `env.mjs`) and `useQuery` is stubbed so the key, `enabled` gate and queryFn
 * are asserted without mounting a query.
 */
import { afterEach, describe, expect, it, vi } from "vitest"

import type { TicketView } from "@/features/tickets/types"

const { fetchAPIMock } = vi.hoisted(() => ({
  fetchAPIMock: vi.fn(),
}))

vi.mock("@/lib/strapi-api", () => ({
  PublicStrapiClient: { fetchAPI: fetchAPIMock },
  PrivateStrapiClient: { fetchAPI: vi.fn() },
}))

const { useQuerySpy } = vi.hoisted(() => ({
  useQuerySpy: vi.fn(() => ({ data: undefined, isLoading: true })),
}))

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQuerySpy(options),
}))

import { orderTicketKeys, useOrderTickets } from "./useOrderTickets"

interface CapturedOptions {
  queryKey: readonly unknown[]
  queryFn: () => Promise<TicketView[]>
  enabled: boolean
}

afterEach(() => {
  fetchAPIMock.mockReset()
  useQuerySpy.mockClear()
})

function capture(): CapturedOptions {
  return useQuerySpy.mock.calls[0][0] as CapturedOptions
}

describe("orderTicketKeys", () => {
  it("scopes the key by order number AND token", () => {
    expect(orderTicketKeys.list("TW-1", "tok")).toEqual([
      "order-tickets",
      "list",
      "TW-1",
      "tok",
    ])
    // A different token is a different authorization — never the same cache
    // entry.
    expect(orderTicketKeys.list("TW-1", "tok")).not.toEqual(
      orderTicketKeys.list("TW-1", "other")
    )
  })
})

describe("useOrderTickets", () => {
  it("enables only when both an order number and a token are present", () => {
    useOrderTickets("TW-1", "tok")
    expect(capture().enabled).toBe(true)

    useQuerySpy.mockClear()
    useOrderTickets("TW-1", undefined)
    expect(capture().enabled).toBe(false)

    useQuerySpy.mockClear()
    useOrderTickets(undefined, "tok")
    expect(capture().enabled).toBe(false)
  })

  it("queryFn reads order-tickets through the public proxy with the token HEADER", async () => {
    const views: TicketView[] = [
      {
        ticketNumber: "TW-1-1",
        type: "standard",
        status: "valid",
        price: 10,
        qrCode: "TWQ1.payload.sig",
        scannedAt: null,
        orderNumber: "TW-1",
        eventTitle: "Inception",
        startDateTime: "2026-08-20T19:30:00.000Z",
        venueName: "Cinéma Le Palace",
      },
    ]
    fetchAPIMock.mockResolvedValue({ data: views })

    useOrderTickets("TW-1", "tok")
    const result = await capture().queryFn()

    expect(fetchAPIMock).toHaveBeenCalledWith(
      "/ticketing/order-tickets/TW-1",
      {},
      { method: "GET", headers: { "x-order-access-token": "tok" } },
      { useProxy: true }
    )
    expect(result).toEqual(views)
  })

  it("never puts the access token in the URL or the query params", async () => {
    fetchAPIMock.mockResolvedValue({ data: [] })

    useOrderTickets("TW-1", "tok")
    await capture().queryFn()

    const [path, params] = fetchAPIMock.mock.calls[0]
    // The proxy forwards `search` verbatim into Next/Strapi/CDN access logs;
    // this credential never expires, so it must not appear in either.
    expect(path).not.toContain("tok")
    expect(JSON.stringify(params)).not.toContain("tok")
  })

  it("url-encodes the order number", async () => {
    fetchAPIMock.mockResolvedValue({ data: [] })

    useOrderTickets("TW/1 2", "tok")
    await capture().queryFn()

    expect(fetchAPIMock).toHaveBeenCalledWith(
      "/ticketing/order-tickets/TW%2F1%202",
      {},
      { method: "GET", headers: { "x-order-access-token": "tok" } },
      { useProxy: true }
    )
  })

  it("defaults to an empty list when the endpoint returns no data", async () => {
    fetchAPIMock.mockResolvedValue({})

    useOrderTickets("TW-1", "tok")
    expect(await capture().queryFn()).toEqual([])
  })
})
