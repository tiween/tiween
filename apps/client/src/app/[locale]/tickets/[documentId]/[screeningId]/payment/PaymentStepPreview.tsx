"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import type { OrderLineItem } from "@/features/tickets/components"

import { useTicketTiers } from "@/features/tickets/hooks/useTicketTiers"
import { useTicketSelectionStore } from "@/features/tickets/stores/ticketSelectionStore"
import { OrderSummary } from "@/features/tickets/components"

export interface PaymentStepPreviewProps {
  /** The sub-event (screening/performance) documentId of the selection. */
  screeningId: string
  /** Event title for the recap. */
  eventTitle: string
  /** Human-readable showtime label for the recap. */
  showtimeLabel: string
}

/**
 * PaymentStepPreview — client child of the payment placeholder route
 * (Story 6.2).
 *
 * Reads the persisted `useTicketSelectionStore` selection plus the sub-event's
 * tiers (for prices/currency) and renders an `OrderSummary` recap next to a
 * translated "payment coming in 6.3" notice. There is NO payment logic here —
 * this route only kills the dead Continue link; Story 6.3 overwrites it with
 * the real Konnect step.
 *
 * A mount guard defers reading the persisted store until after hydration so the
 * server (empty store) and first client render agree.
 */
export function PaymentStepPreview({
  screeningId,
  eventTitle,
  showtimeLabel,
}: PaymentStepPreviewProps) {
  const t = useTranslations("ticketing")

  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const { data } = useTicketTiers(screeningId)
  const storeSubEventId = useTicketSelectionStore((s) => s.subEventId)
  const storeQuantities = useTicketSelectionStore((s) => s.quantities)

  // Only recap the selection when it belongs to THIS screening; a persisted
  // cart from another showtime (e.g. a deep-linked/refreshed payment URL) must
  // not be priced against the wrong tiers.
  const quantities = storeSubEventId === screeningId ? storeQuantities : {}

  const items: OrderLineItem[] =
    mounted && data
      ? data.tiers
          .filter(
            (tier) => !tier.soldOut && (quantities[tier.type] ?? 0) > 0
          )
          .map((tier) => ({
            ticketType: t(`types.${tier.type}`),
            quantity: quantities[tier.type] ?? 0,
            unitPrice: tier.price,
          }))
      : []

  return (
    <div className="flex flex-col gap-6">
      <OrderSummary
        eventTitle={eventTitle}
        showtime={showtimeLabel}
        items={items}
        currency={data?.currency ?? "TND"}
        labels={{
          subtotal: t("subtotal"),
          serviceFee: t("serviceFee"),
          total: t("total"),
        }}
      />

      <div className="border-border bg-muted/40 rounded-lg border border-dashed p-6 text-center">
        <h2 className="text-foreground text-lg font-semibold">
          {t("paymentComingTitle")}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("paymentComingDescription")}
        </p>
      </div>
    </div>
  )
}

PaymentStepPreview.displayName = "PaymentStepPreview"
