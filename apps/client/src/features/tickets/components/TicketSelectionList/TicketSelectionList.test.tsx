import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { TicketTier } from "@/features/tickets/types"

import {
  TicketSelectionList,
  type TicketSelectionListLabels,
} from "./TicketSelectionList"

/**
 * Tests for TicketSelectionList (Story 6.2): a selector per available tier,
 * disabling at the per-type / per-order / remaining caps, no selector for
 * sold-out tiers, and forwarding of quantity changes.
 */

const labels: TicketSelectionListLabels = {
  types: { standard: "Plein tarif", reduced: "Tarif réduit", vip: "VIP" },
  remaining: (count: number) => `${count} restants`,
  soldOut: "Complet",
  restrictionPrefix: "Restriction :",
  quantity: "Quantité",
  decrease: "Diminuer",
  increase: "Augmenter",
}

function tier(overrides: Partial<TicketTier> & Pick<TicketTier, "type">): TicketTier {
  return {
    price: 15,
    remaining: 100,
    soldOut: false,
    restrictionNote: null,
    ...overrides,
  }
}

describe("TicketSelectionList", () => {
  it("renders one quantity selector per available tier and none for sold-out", () => {
    render(
      <TicketSelectionList
        tiers={[
          tier({ type: "standard", price: 15, remaining: 12 }),
          tier({ type: "vip", price: 40, remaining: 0, soldOut: true }),
        ]}
        currency="TND"
        quantities={{}}
        orderRemainingCapacity={10}
        labels={labels}
        onQuantityChange={vi.fn()}
      />
    )
    // Only the available tier exposes +/- controls (2 buttons).
    expect(screen.getAllByRole("button")).toHaveLength(2)
    // Sold-out tier shows the Complet badge, no selector.
    expect(screen.getByText("Complet")).toBeInTheDocument()
    expect(screen.getByText("12 restants")).toBeInTheDocument()
  })

  it("forwards quantity changes with the tier type", () => {
    const onQuantityChange = vi.fn()
    render(
      <TicketSelectionList
        tiers={[tier({ type: "standard", price: 15, remaining: 12 })]}
        currency="TND"
        quantities={{ standard: 1 }}
        orderRemainingCapacity={9}
        labels={labels}
        onQuantityChange={onQuantityChange}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Augmenter" }))
    expect(onQuantityChange).toHaveBeenCalledWith("standard", 2)
  })

  it("disables increment at the per-type cap of 10", () => {
    render(
      <TicketSelectionList
        tiers={[tier({ type: "standard", price: 15, remaining: 50 })]}
        currency="TND"
        quantities={{ standard: 10 }}
        orderRemainingCapacity={0}
        labels={labels}
        onQuantityChange={vi.fn()}
      />
    )
    expect(screen.getByRole("button", { name: "Augmenter" })).toBeDisabled()
  })

  it("disables increment when the tier's remaining is the binding cap", () => {
    render(
      <TicketSelectionList
        tiers={[tier({ type: "standard", price: 15, remaining: 3 })]}
        currency="TND"
        quantities={{ standard: 3 }}
        orderRemainingCapacity={5}
        labels={labels}
        onQuantityChange={vi.fn()}
      />
    )
    expect(screen.getByRole("button", { name: "Augmenter" })).toBeDisabled()
  })

  it("disables increment when the order has no remaining capacity", () => {
    render(
      <TicketSelectionList
        tiers={[tier({ type: "vip", price: 40, remaining: 50 })]}
        currency="TND"
        quantities={{ vip: 2 }}
        orderRemainingCapacity={0}
        labels={labels}
        onQuantityChange={vi.fn()}
      />
    )
    expect(screen.getByRole("button", { name: "Augmenter" })).toBeDisabled()
  })
})
