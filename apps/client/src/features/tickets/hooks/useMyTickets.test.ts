/**
 * Tests for `useMyTickets` (Story 6.4) — the authenticated ticket read. The
 * query key MUST be user-scoped: on a shared device one account's cached
 * tickets must be structurally un-matchable by the next account.
 */
import { afterEach, describe, expect, it, vi } from "vitest"

import type { TicketView } from "@/features/tickets/types"

import { myTicketKeys, UNRESOLVED_USER_ID, useMyTickets } from "./useMyTickets"

const { fetchAPIMock } = vi.hoisted(() => ({
  fetchAPIMock: vi.fn(),
}))

vi.mock("@/lib/strapi-api", () => ({
  PublicStrapiClient: { fetchAPI: vi.fn() },
  PrivateStrapiClient: { fetchAPI: fetchAPIMock },
}))

const { useQuerySpy } = vi.hoisted(() => ({
  useQuerySpy: vi.fn(() => ({ data: undefined, isLoading: true })),
}))

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQuerySpy(options),
}))

const { useSessionMock } = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
}))

vi.mock("next-auth/react", () => ({
  useSession: () => useSessionMock(),
}))

interface CapturedOptions {
  queryKey: readonly unknown[]
  queryFn: () => Promise<TicketView[]>
  enabled: boolean
}

afterEach(() => {
  fetchAPIMock.mockReset()
  useQuerySpy.mockClear()
  useSessionMock.mockReset()
})

function capture(): CapturedOptions {
  return useQuerySpy.mock.calls[0][0] as CapturedOptions
}

describe("myTicketKeys", () => {
  it("scopes the list key per user id", () => {
    expect(myTicketKeys.list(7)).toEqual(["my-tickets", "list", 7])
    expect(myTicketKeys.list(7)).not.toEqual(myTicketKeys.list(8))
  })

  it("exposes the bare prefix every user scope lives under", () => {
    // `ResultView` invalidates exactly this prefix after a confirm settles
    // paid; it asserts the literal value because it has to mock this module.
    expect(myTicketKeys.all).toEqual(["my-tickets"])
  })
})

describe("useMyTickets", () => {
  it("scopes the key to the session user and enables when authenticated", () => {
    useSessionMock.mockReturnValue({
      status: "authenticated",
      data: { user: { userId: 7 } },
    })

    useMyTickets()

    const opts = capture()
    expect(opts.queryKey).toEqual(["my-tickets", "list", 7])
    expect(opts.enabled).toBe(true)
  })

  it("is disabled and parked on the unresolved scope when signed out", () => {
    useSessionMock.mockReturnValue({ status: "unauthenticated", data: null })

    useMyTickets()

    const opts = capture()
    expect(opts.queryKey).toEqual(["my-tickets", "list", UNRESOLVED_USER_ID])
    expect(opts.enabled).toBe(false)
  })

  it("stays disabled when the session is authenticated but has no user id", () => {
    // `Session["user"].userId` is optional. Firing here would park a REAL
    // result on the shared unresolved scope, where the next account on this
    // device would match it — including that buyer's scannable qrCode strings.
    useSessionMock.mockReturnValue({
      status: "authenticated",
      data: { user: {} },
    })

    useMyTickets()

    const opts = capture()
    expect(opts.queryKey).toEqual(["my-tickets", "list", UNRESOLVED_USER_ID])
    expect(opts.enabled).toBe(false)
  })

  it("stays disabled while the session is still loading", () => {
    useSessionMock.mockReturnValue({ status: "loading", data: null })

    useMyTickets()

    expect(capture().enabled).toBe(false)
  })

  it("queryFn reads my-tickets through the private proxy (JWT-scoped, no id sent)", async () => {
    useSessionMock.mockReturnValue({
      status: "authenticated",
      data: { user: { userId: 7 } },
    })
    const views: TicketView[] = [
      {
        ticketNumber: "TW-1-1",
        type: "vip",
        status: "valid",
        price: 25,
        qrCode: "TWQ1.payload.sig",
        scannedAt: null,
        orderNumber: "TW-1",
        eventTitle: "Inception",
        startDateTime: null,
        venueName: null,
      },
    ]
    fetchAPIMock.mockResolvedValue({ data: views })

    useMyTickets()
    const result = await capture().queryFn()

    expect(fetchAPIMock).toHaveBeenCalledWith(
      "/ticketing/my-tickets",
      undefined,
      { method: "GET" },
      { useProxy: true }
    )
    expect(result).toEqual(views)
  })
})
