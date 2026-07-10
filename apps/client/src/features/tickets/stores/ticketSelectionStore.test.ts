import { beforeEach, describe, expect, it } from "vitest"

import type { TicketTier } from "@/features/tickets/types"

import {
  MAX_TICKETS_PER_ORDER,
  MAX_TICKETS_PER_TYPE,
  selectSubtotal,
  selectTotalCount,
  useTicketSelectionStore,
} from "./ticketSelectionStore"

/**
 * Store logic for the ticket-selection funnel (Story 6.2). Exercises the I/O
 * matrix: per-type clamping, order-cap blocking, subtotal/total math across
 * multiple types, reset on sub-event change, and ignoring sold-out/absent tiers.
 * The real store is reset before each test.
 */

function tier(overrides: Partial<TicketTier> & Pick<TicketTier, "type">): TicketTier {
  return {
    price: 15,
    ticketsAvailable: 100,
    ticketsSold: 0,
    remaining: 100,
    soldOut: false,
    restrictionNote: null,
    ...overrides,
  }
}

const { setQuantity, hydrateFor, clear } = useTicketSelectionStore.getState()

beforeEach(() => {
  useTicketSelectionStore.setState({ subEventId: null, quantities: {} })
})

describe("ticketSelectionStore constants", () => {
  it("caps per type and per order at 10", () => {
    expect(MAX_TICKETS_PER_TYPE).toBe(10)
    expect(MAX_TICKETS_PER_ORDER).toBe(10)
  })
})

describe("setQuantity", () => {
  it("stores a value within limits", () => {
    setQuantity("standard", 3)
    expect(useTicketSelectionStore.getState().quantities.standard).toBe(3)
  })

  it("clamps to the per-type maximum", () => {
    setQuantity("standard", 25)
    expect(useTicketSelectionStore.getState().quantities.standard).toBe(
      MAX_TICKETS_PER_TYPE
    )
  })

  it("clamps to the remaining order capacity across types", () => {
    setQuantity("standard", 7)
    setQuantity("reduced", 5) // only 3 of the 10-per-order budget remain
    expect(useTicketSelectionStore.getState().quantities.reduced).toBe(3)
  })

  it("blocks any increment once the order is full", () => {
    setQuantity("standard", 10)
    setQuantity("vip", 1)
    expect(useTicketSelectionStore.getState().quantities.vip).toBeUndefined()
  })

  it("removes the entry when set to zero", () => {
    setQuantity("standard", 4)
    setQuantity("standard", 0)
    expect(useTicketSelectionStore.getState().quantities.standard).toBeUndefined()
  })

  it("never stores a negative quantity", () => {
    setQuantity("standard", -3)
    expect(useTicketSelectionStore.getState().quantities.standard).toBeUndefined()
  })
})

describe("hydrateFor", () => {
  it("resets the selection when the sub-event changes", () => {
    hydrateFor("sub-A")
    setQuantity("standard", 2)
    hydrateFor("sub-B")
    const state = useTicketSelectionStore.getState()
    expect(state.subEventId).toBe("sub-B")
    expect(state.quantities).toEqual({})
  })

  it("preserves the selection for the same sub-event", () => {
    hydrateFor("sub-A")
    setQuantity("standard", 2)
    hydrateFor("sub-A")
    expect(useTicketSelectionStore.getState().quantities.standard).toBe(2)
  })
})

describe("clear", () => {
  it("empties quantities but keeps the sub-event", () => {
    hydrateFor("sub-A")
    setQuantity("standard", 2)
    clear()
    const state = useTicketSelectionStore.getState()
    expect(state.quantities).toEqual({})
    expect(state.subEventId).toBe("sub-A")
  })
})

describe("selectTotalCount", () => {
  it("sums quantities across all tiers", () => {
    setQuantity("standard", 2)
    setQuantity("vip", 1)
    expect(selectTotalCount(useTicketSelectionStore.getState())).toBe(3)
  })

  it("is zero for an empty selection", () => {
    expect(selectTotalCount(useTicketSelectionStore.getState())).toBe(0)
  })
})

describe("selectSubtotal", () => {
  const tiers: TicketTier[] = [
    tier({ type: "standard", price: 15 }),
    tier({ type: "vip", price: 40 }),
    tier({ type: "reduced", price: 10, remaining: 0, soldOut: true }),
  ]

  it("computes the golden multi-type total (2x15 + 1x40 = 70)", () => {
    setQuantity("standard", 2)
    setQuantity("vip", 1)
    expect(selectSubtotal(tiers)(useTicketSelectionStore.getState())).toBe(70)
  })

  it("ignores sold-out tiers", () => {
    // Force a quantity onto a sold-out tier directly (UI never does this).
    useTicketSelectionStore.setState({ quantities: { reduced: 3 } })
    expect(selectSubtotal(tiers)(useTicketSelectionStore.getState())).toBe(0)
  })

  it("ignores tiers absent from the response", () => {
    setQuantity("standard", 1)
    expect(
      selectSubtotal([tier({ type: "vip", price: 40 })])(
        useTicketSelectionStore.getState()
      )
    ).toBe(0)
  })
})
