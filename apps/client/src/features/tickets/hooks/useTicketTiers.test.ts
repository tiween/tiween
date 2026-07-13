/**
 * Tests for `useTicketTiers` (Story 6.1) — the query-key factory and the wiring
 * of the `PublicStrapiClient` fetch + typed response into `useQuery`.
 *
 * The Strapi client is mocked (it eagerly validates `env.mjs`, which rejects
 * NODE_ENV=test) and `useQuery` is stubbed to capture the options object so the
 * queryFn, key, and `enabled` gate are asserted without mounting a query.
 */
import { afterEach, describe, expect, it, vi } from "vitest"

import type { TicketTiersResponse } from "@/features/tickets/types"

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

import { ticketTierKeys, useTicketTiers } from "./useTicketTiers"

interface CapturedOptions {
  queryKey: readonly unknown[]
  queryFn: () => Promise<TicketTiersResponse>
  enabled: boolean
}

afterEach(() => {
  fetchAPIMock.mockReset()
  useQuerySpy.mockClear()
})

describe("ticketTierKeys", () => {
  it("builds a stable, scoped list key per sub-event", () => {
    expect(ticketTierKeys.list("sc1")).toEqual([
      "ticket-tiers",
      "list",
      "sc1",
    ])
  })
})

describe("useTicketTiers", () => {
  it("scopes the query key to the sub-event id and enables only when present", () => {
    useTicketTiers("sc1")
    const opts = useQuerySpy.mock.calls[0][0] as CapturedOptions
    expect(opts.queryKey).toEqual(["ticket-tiers", "list", "sc1"])
    expect(opts.enabled).toBe(true)
  })

  it("disables the query when no sub-event id is supplied", () => {
    useTicketTiers(undefined)
    const opts = useQuerySpy.mock.calls[0][0] as CapturedOptions
    expect(opts.enabled).toBe(false)
  })

  it("queryFn fetches the ticket-tiers endpoint via the proxy and returns data", async () => {
    const payload: TicketTiersResponse = {
      subEventId: "sc1",
      kind: "screening",
      startDateTime: "2026-07-20T20:00:00.000Z",
      currency: "TND",
      tiers: [
        {
          type: "standard",
          price: 15,
          remaining: 70,
          soldOut: false,
          restrictionNote: null,
        },
      ],
    }
    fetchAPIMock.mockResolvedValue({ data: payload, meta: {} })

    useTicketTiers("sc1")
    const opts = useQuerySpy.mock.calls[0][0] as CapturedOptions
    const result = await opts.queryFn()

    expect(fetchAPIMock).toHaveBeenCalledWith(
      "/events-manager/showtimes/sc1/ticket-tiers",
      undefined,
      { method: "GET" },
      { useProxy: true }
    )
    expect(result).toEqual(payload)
  })
})
