import { useMyTickets } from "@/features/tickets/hooks/useMyTickets"
import { useOrderTickets } from "@/features/tickets/hooks/useOrderTickets"
import { saveOrderAccess } from "@/features/tickets/utils/orderAccess"
import { render, screen, waitFor } from "@testing-library/react"
import { useSession } from "next-auth/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { MyTicketsView } from "./MyTicketsView"

/**
 * "Mes Billets" (Story 6.4) — the minimal flat list behind the bottom-nav
 * "Billets" tab. Two authorization paths must both work: a signed-in buyer
 * (JWT) and a guest whose browser stored the order access token. The data
 * hooks and i18n are mocked (the Strapi clients eagerly validate `env.mjs`).
 */

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}))

vi.mock("@/features/tickets/hooks/useMyTickets", () => ({
  useMyTickets: vi.fn(),
}))

vi.mock("@/features/tickets/hooks/useOrderTickets", () => ({
  useOrderTickets: vi.fn(),
}))

const mockUseMyTickets = vi.mocked(useMyTickets)
const mockUseOrderTickets = vi.mocked(useOrderTickets)
const mockUseSession = vi.mocked(useSession)

/** Session states the view branches on. */
function session(status: "loading" | "authenticated" | "unauthenticated") {
  return {
    status,
    data:
      status === "authenticated" ? ({ user: { userId: 7 } } as unknown) : null,
  } as ReturnType<typeof useSession>
}

/** A rejected guest read, shaped like a thrown `BaseStrapiClient` error. */
function guestError(code: string) {
  return {
    data: undefined,
    isError: true,
    error: new Error(JSON.stringify({ details: { code } })),
  } as unknown as ReturnType<typeof useOrderTickets>
}

const TICKET = {
  ticketNumber: "TW-1-1",
  type: "standard" as const,
  status: "valid" as const,
  price: 10,
  qrCode: "TWQ1.payload.sig",
  scannedAt: null,
  orderNumber: "TW-1",
  eventTitle: "Inception",
  startDateTime: "2026-08-20T19:30:00.000Z",
  venueName: "Cinéma Le Palace",
}

function myTickets(data: unknown, extra: Record<string, unknown> = {}) {
  return { data, isLoading: false, isError: false, ...extra } as ReturnType<
    typeof useMyTickets
  >
}

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  mockUseSession.mockReturnValue(session("unauthenticated"))
  mockUseMyTickets.mockReturnValue(myTickets(undefined))
  mockUseOrderTickets.mockReturnValue({ data: undefined } as ReturnType<
    typeof useOrderTickets
  >)
})

describe("MyTicketsView", () => {
  it("renders the empty state when there is nothing to show", () => {
    render(<MyTicketsView locale="fr" />)

    expect(screen.getByText("myTickets.emptyTitle")).toBeInTheDocument()
    expect(screen.queryByRole("img", { name: /QR code/i })).toBeNull()
  })

  it("lists a guest order's tickets using the locally-stored access token", async () => {
    saveOrderAccess("TW-1", "tok-1")
    mockUseOrderTickets.mockReturnValue({ data: [TICKET] } as ReturnType<
      typeof useOrderTickets
    >)

    render(<MyTicketsView locale="fr" />)

    await waitFor(() =>
      expect(mockUseOrderTickets).toHaveBeenCalledWith("TW-1", "tok-1")
    )
    expect(
      await screen.findByRole("img", { name: "ticketCard.qrAlt" })
    ).toBeInTheDocument()
  })

  it("lists the signed-in buyer's tickets (authenticated session)", async () => {
    mockUseSession.mockReturnValue(session("authenticated"))
    mockUseMyTickets.mockReturnValue(myTickets([TICKET]))

    render(<MyTicketsView locale="fr" />)

    expect(
      await screen.findByRole("img", { name: "ticketCard.qrAlt" })
    ).toBeInTheDocument()
    // The account branch is the source here — no sign-in prompt.
    expect(screen.queryByText("myTickets.signInPrompt")).toBeNull()
  })

  it("shows the loading state (never the empty state) while the account read is in flight", () => {
    mockUseSession.mockReturnValue(session("authenticated"))
    mockUseMyTickets.mockReturnValue(myTickets(undefined, { isLoading: true }))

    render(<MyTicketsView locale="fr" />)

    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.queryByText("myTickets.emptyTitle")).toBeNull()
  })

  it("shows the loading state while the SESSION is still resolving", () => {
    mockUseSession.mockReturnValue(session("loading"))

    render(<MyTicketsView locale="fr" />)

    // `useMyTickets` is disabled until the session resolves, so its
    // `isLoading:false` must not be mistaken for "loaded and empty".
    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.queryByText("myTickets.emptyTitle")).toBeNull()
  })

  it("shows the loading state while a stored guest order has not answered yet", () => {
    saveOrderAccess("TW-1", "tok-1")

    render(<MyTicketsView locale="fr" />)

    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.queryByText("myTickets.emptyTitle")).toBeNull()
  })

  it("surfaces a guest 403 as the translated FORBIDDEN error, not an empty list", async () => {
    saveOrderAccess("TW-1", "tok-stale")
    mockUseOrderTickets.mockReturnValue(guestError("FORBIDDEN"))

    render(<MyTicketsView locale="fr" />)

    // The order must not silently vanish behind "you have no tickets yet".
    expect(await screen.findByText("myTickets.errorTitle")).toBeInTheDocument()
    expect(screen.getByText("errors.FORBIDDEN")).toBeInTheDocument()
    expect(screen.queryByText("myTickets.emptyTitle")).toBeNull()
  })

  it("still lists the readable tickets when only ONE guest read fails", async () => {
    mockUseSession.mockReturnValue(session("authenticated"))
    saveOrderAccess("TW-9", "tok-stale")
    mockUseMyTickets.mockReturnValue(myTickets([TICKET]))
    mockUseOrderTickets.mockReturnValue(guestError("UNAUTHORIZED"))

    render(<MyTicketsView locale="fr" />)

    expect(
      await screen.findByRole("img", { name: "ticketCard.qrAlt" })
    ).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent("errors.UNAUTHORIZED")
  })

  it("lists a ticket present in BOTH sources exactly once", async () => {
    saveOrderAccess("TW-1", "tok-1")
    mockUseMyTickets.mockReturnValue(myTickets([TICKET]))
    mockUseOrderTickets.mockReturnValue({ data: [TICKET] } as ReturnType<
      typeof useOrderTickets
    >)

    render(<MyTicketsView locale="fr" />)

    await waitFor(() =>
      expect(
        screen.getAllByRole("img", { name: "ticketCard.qrAlt" })
      ).toHaveLength(1)
    )
  })

  it("shows an error state when the account read fails and nothing is cached", () => {
    mockUseMyTickets.mockReturnValue(myTickets(undefined, { isError: true }))

    render(<MyTicketsView locale="fr" />)

    expect(screen.getByText("myTickets.errorTitle")).toBeInTheDocument()
  })
})
