import { useMyTickets } from "@/features/tickets/hooks/useMyTickets"
import { useOrderStatus } from "@/features/tickets/hooks/useOrderStatus"
import { useOrderTickets } from "@/features/tickets/hooks/useOrderTickets"
import { useTicketSelectionStore } from "@/features/tickets/stores/ticketSelectionStore"
import { saveOrderAccess } from "@/features/tickets/utils/orderAccess"
import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ResultView } from "./ResultView"

/**
 * ResultView (Story 6.3 + 6.4): confirms the AUTHORITATIVE order status and
 * renders a minimal outcome — success clears the store AND shows the issued
 * tickets; failure shows a retry path back to the payment step. The confirm and
 * ticket-read hooks, i18n, links, and Button are mocked (the Strapi clients
 * eagerly validate `env.mjs`, which rejects NODE_ENV=test).
 */

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

// The real module cannot be imported here (its Strapi client eagerly validates
// `env.mjs`), so the key factory is restated. `useMyTickets.test.ts` pins the
// REAL `myTicketKeys.all` to this exact value.
vi.mock("@/features/tickets/hooks/useMyTickets", () => ({
  useMyTickets: vi.fn(),
  myTicketKeys: {
    all: ["my-tickets"],
    list: (userId: number) => ["my-tickets", "list", userId],
  },
}))

const { invalidateQueriesMock } = vi.hoisted(() => ({
  invalidateQueriesMock: vi.fn(),
}))

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
}))

vi.mock("@/features/tickets/hooks/useOrderTickets", () => ({
  useOrderTickets: vi.fn(),
}))

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string
    children: React.ReactNode
  }) => <a href={href}>{children}</a>,
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock("@/features/tickets/hooks/useOrderStatus", () => ({
  useOrderStatus: vi.fn(),
}))

const mockUseOrderStatus = vi.mocked(useOrderStatus)
const mockUseMyTickets = vi.mocked(useMyTickets)
const mockUseOrderTickets = vi.mocked(useOrderTickets)
const confirmOrderSpy = vi.fn()

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

function renderResult(orderNumber: string | null) {
  return render(
    <ResultView
      orderNumber={orderNumber}
      locale="fr"
      paymentHref="/fr/tickets/e/s/payment"
      viewOrderHref="/fr"
    />
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  useTicketSelectionStore.setState({
    subEventId: "sc1",
    quantities: { standard: 2 },
  })
  mockUseOrderStatus.mockReturnValue({
    confirmOrder: confirmOrderSpy,
    isConfirming: false,
    errorCode: null,
  })
  mockUseMyTickets.mockReturnValue({ data: undefined } as ReturnType<
    typeof useMyTickets
  >)
  mockUseOrderTickets.mockReturnValue({ data: undefined } as ReturnType<
    typeof useOrderTickets
  >)
})

describe("ResultView", () => {
  it("confirms, shows success, and clears the selection store on paid", async () => {
    confirmOrderSpy.mockResolvedValue({ orderNumber: "TW-1", status: "paid" })

    renderResult("TW-1")

    await waitFor(() =>
      expect(screen.getByText("paymentSuccessTitle")).toBeInTheDocument()
    )
    expect(confirmOrderSpy).toHaveBeenCalledWith("TW-1")
    expect(useTicketSelectionStore.getState().quantities).toEqual({})
  })

  it("shows the failure message + retry link back to the payment step", async () => {
    confirmOrderSpy.mockResolvedValue({ orderNumber: "TW-1", status: "failed" })

    renderResult("TW-1")

    await waitFor(() =>
      expect(screen.getByText("paymentFailedTitle")).toBeInTheDocument()
    )
    expect(screen.getByText("retryPayment").closest("a")).toHaveAttribute(
      "href",
      "/fr/tickets/e/s/payment"
    )
    // Failure must NOT clear the selection (so retry keeps the cart).
    expect(useTicketSelectionStore.getState().quantities).toEqual({
      standard: 2,
    })
  })

  it("shows the pending view when the gateway status is pending", async () => {
    confirmOrderSpy.mockResolvedValue({
      orderNumber: "TW-1",
      status: "pending",
    })

    renderResult("TW-1")

    await waitFor(() =>
      expect(screen.getByText("paymentPendingTitle")).toBeInTheDocument()
    )
    // Pending is not a failure — no repay-retry path.
    expect(screen.queryByText("retryPayment")).not.toBeInTheDocument()
  })

  it("shows the NEUTRAL verifying view when no order number is present", () => {
    renderResult(null)
    expect(screen.getByText("paymentVerifyingTitle")).toBeInTheDocument()
    // Never claim a failure / "not charged" nor offer a repay path here.
    expect(screen.queryByText("paymentFailedTitle")).not.toBeInTheDocument()
    expect(screen.queryByText("retryPayment")).not.toBeInTheDocument()
    expect(confirmOrderSpy).not.toHaveBeenCalled()
  })

  it("shows the verifying view and keeps the cart when confirm throws", async () => {
    confirmOrderSpy.mockRejectedValue(new Error("network"))

    renderResult("TW-1")

    await waitFor(() =>
      expect(screen.getByText("paymentVerifyingTitle")).toBeInTheDocument()
    )
    // A thrown confirm is NOT proof of no charge: no failure copy, no repay.
    expect(screen.queryByText("paymentFailedTitle")).not.toBeInTheDocument()
    expect(screen.queryByText("retryPayment")).not.toBeInTheDocument()
    // Must NOT clear the selection store on an unproven outcome.
    expect(useTicketSelectionStore.getState().quantities).toEqual({
      standard: 2,
    })
  })

  it("labels the verifying CTA for its actual destination (Mes Billets)", async () => {
    confirmOrderSpy.mockRejectedValue(new Error("network"))

    render(
      <ResultView
        orderNumber="TW-1"
        locale="fr"
        paymentHref="/fr/tickets/e/s/payment"
        viewOrderHref="/fr/tickets"
      />
    )

    await waitFor(() =>
      expect(screen.getByText("paymentVerifyingTitle")).toBeInTheDocument()
    )
    // `viewOrderHref` is the tickets page — "view my order" would promise an
    // order page this app does not have.
    expect(screen.queryByText("viewOrder")).toBeNull()
    expect(screen.getByText("viewMyTickets").closest("a")).toHaveAttribute(
      "href",
      "/fr/tickets"
    )
  })
})

describe("ResultView tickets on success (Story 6.4)", () => {
  it("renders the order's tickets as inline QRs and points the CTA at Mes Billets", async () => {
    confirmOrderSpy.mockResolvedValue({ orderNumber: "TW-1", status: "paid" })
    saveOrderAccess("TW-1", "tok-1")
    mockUseOrderTickets.mockReturnValue({ data: [TICKET] } as ReturnType<
      typeof useOrderTickets
    >)

    render(
      <ResultView
        orderNumber="TW-1"
        locale="fr"
        paymentHref="/fr/tickets/e/s/payment"
        viewOrderHref="/fr/tickets"
      />
    )

    await waitFor(() =>
      expect(screen.getByText("paymentSuccessTitle")).toBeInTheDocument()
    )
    const qr = await screen.findByRole("img", { name: "ticketCard.qrAlt" })
    expect(qr.tagName.toLowerCase()).toBe("svg")
    expect(screen.getByText("viewMyTickets").closest("a")).toHaveAttribute(
      "href",
      "/fr/tickets"
    )
  })

  it("reads the guest order with the token this browser stored before the redirect", async () => {
    confirmOrderSpy.mockResolvedValue({ orderNumber: "TW-1", status: "paid" })
    saveOrderAccess("TW-1", "tok-1")

    render(
      <ResultView
        orderNumber="TW-1"
        locale="fr"
        paymentHref="/fr/tickets/e/s/payment"
        viewOrderHref="/fr/tickets"
      />
    )

    await waitFor(() =>
      expect(mockUseOrderTickets).toHaveBeenCalledWith("TW-1", "tok-1")
    )
  })

  it("falls back to the account's tickets, filtered to this order", async () => {
    confirmOrderSpy.mockResolvedValue({ orderNumber: "TW-1", status: "paid" })
    mockUseMyTickets.mockReturnValue({
      data: [
        TICKET,
        { ...TICKET, ticketNumber: "TW-9-1", orderNumber: "TW-9" },
      ],
    } as ReturnType<typeof useMyTickets>)

    render(
      <ResultView
        orderNumber="TW-1"
        locale="fr"
        paymentHref="/fr/tickets/e/s/payment"
        viewOrderHref="/fr/tickets"
      />
    )

    const qrs = await screen.findAllByRole("img", {
      name: "ticketCard.qrAlt",
    })
    expect(qrs).toHaveLength(1)
    expect(screen.getByText("TW-1-1")).toBeInTheDocument()
  })

  it("invalidates the my-tickets cache once the confirm settles paid", async () => {
    confirmOrderSpy.mockResolvedValue({ orderNumber: "TW-1", status: "paid" })

    renderResult("TW-1")

    // Without this, a signed-in buyer who viewed /tickets shortly before paying
    // keeps seeing the cached PRE-purchase list (staleTime: 30s).
    await waitFor(() =>
      expect(invalidateQueriesMock).toHaveBeenCalledWith({
        // `myTicketKeys.all` — the bare prefix every user scope lives under.
        queryKey: ["my-tickets"],
      })
    )
  })

  it("does NOT invalidate the my-tickets cache when the payment failed", async () => {
    confirmOrderSpy.mockResolvedValue({ orderNumber: "TW-1", status: "failed" })

    renderResult("TW-1")

    await waitFor(() =>
      expect(screen.getByText("paymentFailedTitle")).toBeInTheDocument()
    )
    expect(invalidateQueriesMock).not.toHaveBeenCalled()
  })

  it("renders no ticket QR when the payment did not settle", async () => {
    confirmOrderSpy.mockResolvedValue({ orderNumber: "TW-1", status: "failed" })
    mockUseMyTickets.mockReturnValue({ data: [TICKET] } as ReturnType<
      typeof useMyTickets
    >)

    render(
      <ResultView
        orderNumber="TW-1"
        locale="fr"
        paymentHref="/fr/tickets/e/s/payment"
        viewOrderHref="/fr/tickets"
      />
    )

    await waitFor(() =>
      expect(screen.getByText("paymentFailedTitle")).toBeInTheDocument()
    )
    expect(screen.queryByRole("img", { name: /QR code/i })).toBeNull()
  })

  it("surfaces a failed guest ticket read instead of silently showing nothing", async () => {
    confirmOrderSpy.mockResolvedValue({ orderNumber: "TW-1", status: "paid" })
    saveOrderAccess("TW-1", "stale-token")
    // A stale stored token answers 403. Rendering only the order number would
    // read as "your payment worked but you have no tickets".
    mockUseOrderTickets.mockReturnValue({
      data: undefined,
      isError: true,
      // Shape `BaseStrapiClient.fetchAPI` throws (Story 6.3).
      error: new Error(JSON.stringify({ details: { code: "FORBIDDEN" } })),
    } as unknown as ReturnType<typeof useOrderTickets>)

    render(
      <ResultView
        orderNumber="TW-1"
        locale="fr"
        paymentHref="/fr/tickets/e/s/payment"
        viewOrderHref="/fr/tickets"
      />
    )

    await waitFor(() =>
      expect(screen.getByText("paymentSuccessTitle")).toBeInTheDocument()
    )
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "errors.FORBIDDEN"
    )
  })

  it("shows no read error once the tickets actually render", async () => {
    confirmOrderSpy.mockResolvedValue({ orderNumber: "TW-1", status: "paid" })
    saveOrderAccess("TW-1", "tok-1")
    mockUseOrderTickets.mockReturnValue({
      data: [TICKET],
      isError: false,
    } as unknown as ReturnType<typeof useOrderTickets>)

    render(
      <ResultView
        orderNumber="TW-1"
        locale="fr"
        paymentHref="/fr/tickets/e/s/payment"
        viewOrderHref="/fr/tickets"
      />
    )

    await waitFor(() =>
      expect(screen.getByText("paymentSuccessTitle")).toBeInTheDocument()
    )
    expect(screen.queryByRole("alert")).toBeNull()
  })
})
