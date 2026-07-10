import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { OrderSummaryProps } from "@/features/tickets/components"

import { useTicketTiers } from "@/features/tickets/hooks/useTicketTiers"
import { useTicketSelectionStore } from "@/features/tickets/stores/ticketSelectionStore"

import { PaymentStepPreview } from "./PaymentStepPreview"

/**
 * Tests for the payment placeholder's client child (Story 6.2). Verifies the
 * recap filters sold-out / zero-quantity tiers and — critically — only recaps a
 * selection that belongs to THIS screening, so a persisted cart from another
 * showtime is never priced against the wrong tiers. The data hook and i18n are
 * mocked; the real selection store is used and reset between tests.
 */

vi.mock("@/features/tickets/hooks/useTicketTiers", () => ({
  useTicketTiers: vi.fn(),
}))

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock("@/features/tickets/components", () => ({
  OrderSummary: ({ items }: OrderSummaryProps) => (
    <div data-testid="order-summary">{items.length}</div>
  ),
}))

const mockUseTicketTiers = vi.mocked(useTicketTiers)

const tiers = [
  {
    type: "standard",
    price: 15,
    ticketsAvailable: 100,
    ticketsSold: 0,
    remaining: 12,
    soldOut: false,
    restrictionNote: null,
  },
  {
    type: "vip",
    price: 40,
    ticketsAvailable: 10,
    ticketsSold: 10,
    remaining: 0,
    soldOut: true,
    restrictionNote: null,
  },
]

function mockTiers() {
  mockUseTicketTiers.mockReturnValue({
    data: { subEventId: "sc1", kind: "screening", currency: "TND", tiers },
  } as unknown as ReturnType<typeof useTicketTiers>)
}

function renderPreview() {
  return render(
    <PaymentStepPreview
      screeningId="sc1"
      eventTitle="Inception"
      showtimeLabel="20:30"
    />
  )
}

describe("PaymentStepPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTicketSelectionStore.setState({ subEventId: null, quantities: {} })
  })

  it("recaps only selectable tiers of the matching screening", () => {
    useTicketSelectionStore.setState({
      subEventId: "sc1",
      quantities: { standard: 2, vip: 1 },
    })
    mockTiers()
    renderPreview()

    // vip is sold out → excluded; only the standard line recaps.
    expect(screen.getByTestId("order-summary")).toHaveTextContent("1")
    expect(screen.getByText("paymentComingTitle")).toBeInTheDocument()
  })

  it("does not recap a selection belonging to a different screening", () => {
    useTicketSelectionStore.setState({
      subEventId: "OTHER",
      quantities: { standard: 2 },
    })
    mockTiers()
    renderPreview()

    expect(screen.getByTestId("order-summary")).toHaveTextContent("0")
  })
})
