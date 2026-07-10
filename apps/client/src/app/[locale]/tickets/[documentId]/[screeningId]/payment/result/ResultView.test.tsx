import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useOrderStatus } from "@/features/tickets/hooks/useOrderStatus"
import { useTicketSelectionStore } from "@/features/tickets/stores/ticketSelectionStore"

import { ResultView } from "./ResultView"

/**
 * ResultView (Story 6.3): confirms the AUTHORITATIVE order status and renders a
 * minimal outcome — success clears the store; failure shows a retry path back
 * to the payment step. The confirm hook, i18n, links, and Button are mocked.
 */

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
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
const confirmOrderSpy = vi.fn()

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
  useTicketSelectionStore.setState({
    subEventId: "sc1",
    quantities: { standard: 2 },
  })
  mockUseOrderStatus.mockReturnValue({
    confirmOrder: confirmOrderSpy,
    isConfirming: false,
    errorCode: null,
  })
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
})
