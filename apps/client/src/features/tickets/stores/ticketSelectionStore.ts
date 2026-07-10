import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"

import type { TicketTier, TicketTierType } from "@/features/tickets/types"

/**
 * Ticket-selection store (Story 6.2).
 *
 * A flat Zustand store holding the visitor's per-tier quantity selection for a
 * single sub-event. Follows the project-context pattern
 * (`create()(devtools(persist(...)))`, flat state, `SCREAMING_SNAKE` limits).
 *
 * Selection lives client-side only; it never writes ticket/sub-event inventory
 * (reads `tier.remaining` for bounding at the UI layer, deferred reconciliation
 * to Story 6.3). `persist` keeps the selection across the soft navigation into
 * the payment step; `hydrateFor` resets a stale selection when the sub-event
 * changes so a persisted cart never leaks across showtimes.
 */

/** Max tickets a single tier may hold. */
export const MAX_TICKETS_PER_TYPE = 10
/** Max tickets across all tiers in one order. */
export const MAX_TICKETS_PER_ORDER = 10

export interface TicketSelectionState {
  /** The sub-event (screening/performance) the current selection belongs to. */
  subEventId: string | null
  /** Per-tier quantities; absent/zero entries are omitted. */
  quantities: Partial<Record<TicketTierType, number>>
  /**
   * Set a tier's quantity, clamped to `[0, MAX_TICKETS_PER_TYPE]` and to the
   * remaining order capacity (`MAX_TICKETS_PER_ORDER` minus the other tiers).
   * A resulting quantity of 0 removes the entry.
   */
  setQuantity: (type: TicketTierType, qty: number) => void
  /** Point the store at a sub-event, resetting the selection when it changes. */
  hydrateFor: (subEventId: string) => void
  /** Clear all quantities (keeps `subEventId`). */
  clear: () => void
}

export const useTicketSelectionStore = create<TicketSelectionState>()(
  devtools(
    persist(
      (set) => ({
        subEventId: null,
        quantities: {},
        setQuantity: (type, qty) =>
          set((state) => {
            const otherTotal = Object.entries(state.quantities).reduce(
              (sum, [t, q]) => (t === type ? sum : sum + (q ?? 0)),
              0
            )
            const orderRemaining = Math.max(
              0,
              MAX_TICKETS_PER_ORDER - otherTotal
            )
            const clamped = Math.max(
              0,
              Math.min(qty, MAX_TICKETS_PER_TYPE, orderRemaining)
            )
            const next = { ...state.quantities }
            if (clamped <= 0) {
              delete next[type]
            } else {
              next[type] = clamped
            }
            return { quantities: next }
          }),
        hydrateFor: (subEventId) =>
          set((state) =>
            state.subEventId === subEventId
              ? {}
              : { subEventId, quantities: {} }
          ),
        clear: () => set({ quantities: {} }),
      }),
      { name: "ticket-selection-storage" }
    )
  )
)

/** Total number of tickets across all tiers. */
export function selectTotalCount(state: TicketSelectionState): number {
  return Object.values(state.quantities).reduce(
    (sum, qty) => sum + (qty ?? 0),
    0
  )
}

/**
 * Curried subtotal selector: `selectSubtotal(tiers)(state)` sums
 * `quantity * price` for every non-sold-out tier that has a quantity. Sold-out
 * and absent tiers contribute nothing.
 */
export function selectSubtotal(tiers: TicketTier[]) {
  return (state: TicketSelectionState): number =>
    tiers.reduce((sum, tier) => {
      if (tier.soldOut) return sum
      const qty = state.quantities[tier.type] ?? 0
      return sum + qty * tier.price
    }, 0)
}
