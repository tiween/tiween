import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useTicketTiers } from "@/features/tickets/hooks/useTicketTiers"

import { TicketTypesSection } from "./TicketTypesSection"

/**
 * Tests for the tickets-route client child (Story 6.1). Verifies the async
 * branch logic (AC #4): loading -> skeletons, error -> retryable state, empty
 * -> empty state, populated -> the ticket-type list. The data hook, i18n, and
 * child components are mocked so the test targets only this component's
 * state routing.
 */

vi.mock("@/features/tickets/hooks/useTicketTiers", () => ({
  useTicketTiers: vi.fn(),
}))

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, opts?: { count?: number }) =>
    opts?.count !== undefined ? `${opts.count} ${key}` : key,
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
  TicketTypeList: ({ tiers }: { tiers: unknown[] }) => (
    <div data-testid="ticket-type-list">{tiers.length}</div>
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

describe("TicketTypesSection", () => {
  beforeEach(() => vi.clearAllMocks())

  it("renders skeletons while loading", () => {
    mockHook({ isLoading: true })
    render(<TicketTypesSection screeningId="sc1" />)

    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.getAllByTestId("skeleton")).toHaveLength(3)
  })

  it("renders a retryable error state and refetches on retry", () => {
    const refetch = vi.fn()
    mockHook({ isError: true, refetch })
    render(<TicketTypesSection screeningId="sc1" />)

    expect(screen.getByTestId("empty-state")).toBeInTheDocument()
    expect(screen.getByText("errorTitle")).toBeInTheDocument()

    fireEvent.click(screen.getByText("retry"))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it("renders the empty state when there are no tiers", () => {
    mockHook({
      data: { subEventId: "sc1", kind: "screening", currency: "TND", tiers: [] },
    })
    render(<TicketTypesSection screeningId="sc1" />)

    expect(screen.getByText("emptyTitle")).toBeInTheDocument()
    expect(screen.queryByTestId("ticket-type-list")).not.toBeInTheDocument()
  })

  it("renders the ticket-type list when tiers are present", () => {
    mockHook({
      data: {
        subEventId: "sc1",
        kind: "screening",
        currency: "TND",
        tiers: [
          { type: "standard", price: 15, remaining: 12, soldOut: false },
          { type: "vip", price: 40, remaining: 0, soldOut: true },
        ],
      },
    })
    render(<TicketTypesSection screeningId="sc1" />)

    expect(screen.getByTestId("ticket-type-list")).toHaveTextContent("2")
  })
})
