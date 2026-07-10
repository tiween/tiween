"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

import type { OrderLineItem } from "@/features/tickets/components"
import type { TicketSelectionListLabels } from "@/features/tickets/components"

import { useTicketTiers } from "@/features/tickets/hooks/useTicketTiers"
import {
  MAX_TICKETS_PER_ORDER,
  useTicketSelectionStore,
} from "@/features/tickets/stores/ticketSelectionStore"
import { formatPrice } from "@/features/tickets/utils/formatPrice"
import { OrderSummary, TicketSelectionList } from "@/features/tickets/components"
import { EmptyState } from "@/components/common"
import { TicketCardSkeleton } from "@/components/common"
import { Button } from "@/components/ui/button"

export interface TicketTypesSectionProps {
  /** The sub-event (screening/performance) documentId to load tiers for. */
  screeningId: string
  /** The parent event documentId (for the payment-step route). */
  documentId: string
  /** Active locale (for navigation). */
  locale: string
  /** Event title for the order summary. */
  eventTitle: string
  /** Human-readable showtime label for the order summary. */
  showtimeLabel: string
}

/**
 * TicketTypesSection — client child of the tickets route (Stories 6.1 + 6.2).
 *
 * Fetches a sub-event's ticket tiers with react-query (`useTicketTiers`) and
 * renders every async path: loading (skeletons), error (retryable state), empty
 * (no tiers), and the populated interactive selection step. The populated view
 * drives the flat `useTicketSelectionStore` (per-tier quantities clamped to 10
 * per type / 10 per order / each tier's `remaining`), shows a live
 * `OrderSummary`, and a sticky Continue bar (formatted total, disabled at 0)
 * that navigates to the payment placeholder (Story 6.3 replaces it).
 *
 * All labels come from the `ticketing` next-intl namespace. The populated view
 * only renders client-side (react-query is unresolved during SSR), so reading
 * the persisted store never causes a hydration mismatch.
 */
export function TicketTypesSection({
  screeningId,
  documentId,
  locale,
  eventTitle,
  showtimeLabel,
}: TicketTypesSectionProps) {
  const t = useTranslations("ticketing")
  const router = useRouter()

  const { data, isLoading, isError, refetch } = useTicketTiers(screeningId)

  const storeSubEventId = useTicketSelectionStore((s) => s.subEventId)
  const storeQuantities = useTicketSelectionStore((s) => s.quantities)
  const setQuantity = useTicketSelectionStore((s) => s.setQuantity)
  const hydrateFor = useTicketSelectionStore((s) => s.hydrateFor)

  // Reset the selection when the sub-event changes; preserved for the same one.
  React.useEffect(() => {
    hydrateFor(screeningId)
  }, [screeningId, hydrateFor])

  // Only trust the persisted quantities once they belong to THIS sub-event.
  // Before `hydrateFor` aligns the store, or when a stale cart from another
  // showtime is rehydrated from storage, the selection reads as empty — this
  // prevents a foreign cart from flashing or counting toward the order.
  const quantities =
    storeSubEventId === screeningId ? storeQuantities : {}

  const selectionLabels: TicketSelectionListLabels = {
    types: {
      standard: t("types.standard"),
      reduced: t("types.reduced"),
      vip: t("types.vip"),
    },
    remaining: (count: number) => t("remaining", { count }),
    soldOut: t("soldOut"),
    restrictionPrefix: t("restrictionPrefix"),
    quantity: t("quantity"),
    decrease: t("decrease"),
    increase: t("increase"),
  }

  if (isLoading) {
    return (
      <div
        className="flex flex-col gap-3"
        role="status"
        aria-busy="true"
        aria-label={t("loading")}
      >
        <TicketCardSkeleton size="small" />
        <TicketCardSkeleton size="small" />
        <TicketCardSkeleton size="small" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <EmptyState
        variant="custom"
        title={t("errorTitle")}
        description={t("errorDescription")}
        primaryAction={{
          label: t("retry"),
          onClick: () => {
            void refetch()
          },
        }}
      />
    )
  }

  if (data.tiers.length === 0) {
    return (
      <EmptyState
        variant="custom"
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    )
  }

  // Count and price only tiers that are present AND selectable (not sold-out).
  // A phantom quantity on a now-sold-out or absent tier must never enable
  // Continue, consume order capacity, or diverge from the displayed subtotal.
  const items: OrderLineItem[] = data.tiers
    .filter((tier) => !tier.soldOut && (quantities[tier.type] ?? 0) > 0)
    .map((tier) => ({
      ticketType: selectionLabels.types[tier.type],
      quantity: quantities[tier.type] ?? 0,
      unitPrice: tier.price,
    }))

  const selectedCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  )
  const orderRemainingCapacity = MAX_TICKETS_PER_ORDER - selectedCount
  const isOrderFull = orderRemainingCapacity <= 0

  const handleContinue = () => {
    router.push(`/${locale}/tickets/${documentId}/${screeningId}/payment`)
  }

  return (
    <div className="flex flex-col gap-6">
      <TicketSelectionList
        tiers={data.tiers}
        currency={data.currency}
        quantities={quantities}
        orderRemainingCapacity={orderRemainingCapacity}
        labels={selectionLabels}
        onQuantityChange={setQuantity}
      />

      {isOrderFull && (
        <p role="status" className="text-muted-foreground text-sm">
          {t("orderLimitReached", { max: MAX_TICKETS_PER_ORDER })}
        </p>
      )}

      <OrderSummary
        eventTitle={eventTitle}
        showtime={showtimeLabel}
        items={items}
        currency={data.currency}
        labels={{
          subtotal: t("subtotal"),
          serviceFee: t("serviceFee"),
          total: t("total"),
        }}
      />

      {/* Sticky Continue bar. */}
      <div className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-10 border-t backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3">
          <span className="text-foreground text-lg font-bold">
            {formatPrice(subtotal, data.currency)}
          </span>
          <Button
            type="button"
            size="lg"
            disabled={selectedCount === 0}
            onClick={handleContinue}
          >
            {t("continue")}
          </Button>
        </div>
      </div>
    </div>
  )
}

TicketTypesSection.displayName = "TicketTypesSection"
