import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type {
  OrderSummaryProps,
  TicketSelectionListProps,
} from "@/features/tickets/components"

import { useTicketTiers } from "@/features/tickets/hooks/useTicketTiers"
import { useTicketSelectionStore } from "@/features/tickets/stores/ticketSelectionStore"

import { TicketTypesSection } from "./TicketTypesSection"

/**
 * Tests for the tickets-route client child (Stories 6.1 + 6.2). Verifies the
 * async branch routing (loading/error/empty) stays green, and the 6.2 selection
 * wiring: quantities drive the summary + total, Continue is disabled at zero and
 * navigates once populated, and sold-out tiers are excluded from the summary.
 * The data hook, i18n, router, and child components are mocked; the real
 * selection store is used and reset between tests.
 */

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock("@/features/tickets/hooks/useTicketTiers", () => ({
  useTicketTiers: vi.fn(),
}))

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, opts?: { count?: number }) =>
    opts?.count !== undefined ? `${opts.count} ${key}` : key,
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock("@/components/common", () => ({
  TicketCardSkeleton: () => <div data-testid="skeleton" />,
  EmptyState: ({
    title,
    primaryAction,
  }: {
    title: string
    primaryAction?: { label: string; onClick: () => void }
  }) => (
    <div data-testid="empty-state">
      <span>{title}</span>
      {primaryAction ? (
        <button onClick={primaryAction.onClick}>{primaryAction.label}</button>
      ) : null}
    </div>
  ),
}))

vi.mock("@/features/tickets/components", () => ({
  TicketSelectionList: ({
    tiers,
    orderRemainingCapacity,
    onQuantityChange,
  }: TicketSelectionListProps) => (
    <div data-testid="selection-list">
      <span data-testid="tier-count">{tiers.length}</span>
      <span data-testid="order-remaining">{orderRemainingCapacity}</span>
      <button onClick={() => onQuantityChange("standard", 2)}>set-standard</button>
    </div>
  ),
  OrderSummary: ({ items }: OrderSummaryProps) => (
    <div data-testid="order-summary">{items.length}</div>
  ),
}))

const mockUseTicketTiers = vi.mocked(useTicketTiers)

function mockHook(overrides: Record<string, unknown>) {
  mockUseTicketTiers.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useTicketTiers>)
}

const baseTiers = [
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

function renderSection() {
  return render(
    <TicketTypesSection
      screeningId="sc1"
      documentId="doc1"
      locale="en"
      eventTitle="Inception"
      showtimeLabel="20:30"
    />
  )
}

describe("TicketTypesSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTicketSelectionStore.setState({ subEventId: null, quantities: {} })
  })

  it("renders skeletons while loading", () => {
    mockHook({ isLoading: true })
    renderSection()

    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.getAllByTestId("skeleton")).toHaveLength(3)
  })

  it("renders a retryable error state and refetches on retry", () => {
    const refetch = vi.fn()
    mockHook({ isError: true, refetch })
    renderSection()

    expect(screen.getByTestId("empty-state")).toBeInTheDocument()
    expect(screen.getByText("errorTitle")).toBeInTheDocument()

    fireEvent.click(screen.getByText("retry"))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it("renders the empty state when there are no tiers", () => {
    mockHook({
      data: { subEventId: "sc1", kind: "screening", currency: "TND", tiers: [] },
    })
    renderSection()

    expect(screen.getByText("emptyTitle")).toBeInTheDocument()
    expect(screen.queryByTestId("selection-list")).not.toBeInTheDocument()
  })

  it("renders the selection list and a disabled Continue at zero", () => {
    mockHook({
      data: {
        subEventId: "sc1",
        kind: "screening",
        currency: "TND",
        tiers: baseTiers,
      },
    })
    renderSection()

    // Both tiers (incl. sold-out) are passed to the list; it handles exclusion.
    expect(screen.getByTestId("tier-count")).toHaveTextContent("2")
    // No selection yet: Continue disabled, summary empty, total 0.
    expect(screen.getByRole("button", { name: "continue" })).toBeDisabled()
    expect(screen.getByTestId("order-summary")).toHaveTextContent("0")
    expect(screen.getByText("0,00 DT")).toBeInTheDocument()
  })

  it("updates the total and enables Continue when a quantity is added", () => {
    mockHook({
      data: {
        subEventId: "sc1",
        kind: "screening",
        currency: "TND",
        tiers: baseTiers,
      },
    })
    renderSection()

    fireEvent.click(screen.getByText("set-standard")) // standard -> 2

    // Sold-out vip excluded: summary has only the standard line.
    expect(screen.getByTestId("order-summary")).toHaveTextContent("1")
    const continueBtn = screen.getByRole("button", { name: "continue" })
    expect(continueBtn).toBeEnabled()
    // 2 x 15 = 30,00 DT shown on the sticky bar.
    expect(screen.getByText("30,00 DT")).toBeInTheDocument()
  })

  it("keeps Continue disabled when only a sold-out tier holds a persisted quantity", () => {
    // A phantom quantity on the sold-out vip tier (e.g. rehydrated after the
    // tier sold out) must not enable Continue, price anything, or eat capacity.
    useTicketSelectionStore.setState({
      subEventId: "sc1",
      quantities: { vip: 3 },
    })
    mockHook({
      data: {
        subEventId: "sc1",
        kind: "screening",
        currency: "TND",
        tiers: baseTiers,
      },
    })
    renderSection()

    expect(screen.getByRole("button", { name: "continue" })).toBeDisabled()
    expect(screen.getByTestId("order-summary")).toHaveTextContent("0")
    expect(screen.getByText("0,00 DT")).toBeInTheDocument()
    // Full order capacity remains — the phantom did not consume a slot.
    expect(screen.getByTestId("order-remaining")).toHaveTextContent("10")
  })

  it("shows the order-limit message and zero remaining capacity at the cap", () => {
    useTicketSelectionStore.setState({
      subEventId: "sc1",
      quantities: { standard: 10 },
    })
    mockHook({
      data: {
        subEventId: "sc1",
        kind: "screening",
        currency: "TND",
        tiers: baseTiers,
      },
    })
    renderSection()

    expect(screen.getByText("orderLimitReached")).toBeInTheDocument()
    expect(screen.getByTestId("order-remaining")).toHaveTextContent("0")
  })

  it("navigates to the payment step on Continue when a selection exists", () => {
    mockHook({
      data: {
        subEventId: "sc1",
        kind: "screening",
        currency: "TND",
        tiers: baseTiers,
      },
    })
    renderSection()

    fireEvent.click(screen.getByText("set-standard"))
    fireEvent.click(screen.getByRole("button", { name: "continue" }))

    expect(pushMock).toHaveBeenCalledWith("/en/tickets/doc1/sc1/payment")
  })
})
