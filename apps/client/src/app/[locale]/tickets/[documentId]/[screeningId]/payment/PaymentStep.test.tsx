import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useCreateOrder } from "@/features/tickets/hooks/useCreateOrder"
import { useGuestCheckout } from "@/features/tickets/hooks/useGuestCheckout"
import { useTicketTiers } from "@/features/tickets/hooks/useTicketTiers"
import { useTicketSelectionStore } from "@/features/tickets/stores/ticketSelectionStore"
import { readOrderAccess } from "@/features/tickets/utils/orderAccess"

import { PaymentStep } from "./PaymentStep"

/**
 * PaymentStep wiring (Story 6.3): the selection recap is gated to THIS
 * sub-event, a method is required before checkout, and a successful submit
 * POSTs the expanded ticket payload and redirects to the Konnect payUrl. The
 * data/checkout hooks and child components are mocked; the real store is used.
 */

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock("@/features/tickets/hooks/useTicketTiers", () => ({
  useTicketTiers: vi.fn(),
}))
vi.mock("@/features/tickets/hooks/useCreateOrder", () => ({
  useCreateOrder: vi.fn(),
}))
vi.mock("@/features/tickets/hooks/useGuestCheckout", () => ({
  useGuestCheckout: vi.fn(),
}))

vi.mock("@/features/tickets/components", () => ({
  OrderSummary: ({ items }: { items: unknown[] }) => (
    <div data-testid="summary">{items.length}</div>
  ),
  PaymentMethodSelector: ({
    onMethodChange,
  }: {
    onMethodChange: (m: string) => void
  }) => (
    <button data-testid="pick-card" onClick={() => onMethodChange("card")}>
      card
    </button>
  ),
}))

vi.mock("@/features/tickets/components/GuestCheckoutForm", () => ({
  GuestCheckoutForm: ({
    onSubmit,
  }: {
    onSubmit: (d: {
      firstName: string
      lastName: string
      email: string
      phone?: string
    }) => void
  }) => (
    <button
      data-testid="submit-guest"
      onClick={() =>
        onSubmit({
          firstName: "A",
          lastName: "B",
          email: "a@b.co",
          phone: "20123456",
        })
      }
    >
      pay
    </button>
  ),
}))

const mockUseTicketTiers = vi.mocked(useTicketTiers)
const mockUseCreateOrder = vi.mocked(useCreateOrder)
const mockUseGuestCheckout = vi.mocked(useGuestCheckout)

const createOrderSpy = vi.fn()

const tiers = [
  {
    type: "standard",
    price: 10,
    remaining: 50,
    soldOut: false,
    restrictionNote: null,
  },
  {
    type: "vip",
    price: 40,
    remaining: 0,
    soldOut: true,
    restrictionNote: null,
  },
]

function renderStep() {
  return render(
    <PaymentStep
      screeningId="sc1"
      documentId="event-1"
      locale="fr"
      eventTitle="Inception"
      showtimeLabel="20:30"
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
  mockUseTicketTiers.mockReturnValue({
    data: { subEventId: "sc1", kind: "screening", currency: "TND", tiers },
  } as unknown as ReturnType<typeof useTicketTiers>)
  createOrderSpy.mockResolvedValue({
    orderNumber: "TW-1",
    payUrl: "https://pay/x",
    accessToken: "tok-1",
  })
  mockUseCreateOrder.mockReturnValue({
    createOrder: createOrderSpy,
    isSubmitting: false,
    errorCode: null,
  })
  mockUseGuestCheckout.mockReturnValue({
    guestInfo: null,
    setGuestInfo: vi.fn(),
    clearGuestInfo: vi.fn(),
    hasGuestInfo: false,
  })

  // Stub the hosted-redirect navigation.
  Object.defineProperty(window, "location", {
    value: { assign: vi.fn(), href: "" },
    writable: true,
    configurable: true,
  })
})

describe("PaymentStep", () => {
  it("does not check out until a payment method is chosen", () => {
    renderStep()
    fireEvent.click(screen.getByTestId("submit-guest"))
    expect(createOrderSpy).not.toHaveBeenCalled()
  })

  it("checks out with the expanded ticket payload and redirects to payUrl", async () => {
    renderStep()

    fireEvent.click(screen.getByTestId("pick-card"))
    fireEvent.click(screen.getByTestId("submit-guest"))

    await waitFor(() => expect(createOrderSpy).toHaveBeenCalledTimes(1))

    expect(createOrderSpy).toHaveBeenCalledWith({
      eventId: "event-1",
      screeningId: "sc1",
      paymentMethod: "card",
      firstName: "A",
      lastName: "B",
      email: "a@b.co",
      phone: "20123456",
      locale: "fr",
      tickets: [
        { type: "standard", price: 10 },
        { type: "standard", price: 10 },
      ],
    })

    await waitFor(() =>
      expect(window.location.assign).toHaveBeenCalledWith("https://pay/x")
    )
  })

  it("stores the order access token locally BEFORE leaving for Konnect (Story 6.4)", async () => {
    // Record what the local store held at the moment of the redirect: the
    // browser never comes back to this component, so a token saved after the
    // hand-off would be lost and the guest could never read their tickets.
    let storedAtRedirect: unknown = "not redirected"
    vi.mocked(window.location.assign).mockImplementation(() => {
      storedAtRedirect = readOrderAccess("TW-1")?.accessToken
    })

    renderStep()

    fireEvent.click(screen.getByTestId("pick-card"))
    fireEvent.click(screen.getByTestId("submit-guest"))

    await waitFor(() =>
      expect(window.location.assign).toHaveBeenCalledWith("https://pay/x")
    )
    expect(storedAtRedirect).toBe("tok-1")
    expect(readOrderAccess("TW-1")?.accessToken).toBe("tok-1")
  })

  it("recaps only the matching sub-event's selectable tiers (vip sold out excluded)", () => {
    renderStep()
    // Only the standard line recaps; the sold-out vip is filtered out.
    expect(screen.getByTestId("summary")).toHaveTextContent("1")
  })
})
