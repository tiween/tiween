"use client"

import * as React from "react"

import type { TicketTier, TicketTierType } from "@/features/tickets/types"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { MAX_TICKETS_PER_TYPE } from "@/features/tickets/stores/ticketSelectionStore"

import { formatPrice } from "../../utils/formatPrice"
import { QuantitySelector } from "../QuantitySelector"

/**
 * Localized labels for {@link TicketSelectionList}.
 *
 * Mirrors {@link TicketTypeListLabels} (the 6.1 read-only variant) plus the
 * three {@link QuantitySelector} labels needed by the interactive rows.
 */
export interface TicketSelectionListLabels {
  /** Map of the tier `type` enum to its display label. */
  types: Record<TicketTierType, string>
  /** Availability line, e.g. `(12) => "12 restants"`. */
  remaining: (count: number) => string
  /** Sold-out badge, e.g. "Complet". */
  soldOut: string
  /** Optional lead-in before the restriction note (e.g. "Restriction :"). */
  restrictionPrefix?: string
  /** Accessible label for the quantity value. */
  quantity: string
  /** Accessible label for the minus button. */
  decrease: string
  /** Accessible label for the plus button. */
  increase: string
}

export interface TicketSelectionListProps {
  /** The tiers to render (already computed by the backend). */
  tiers: TicketTier[]
  /** Currency code from the endpoint (e.g. "TND"); mapped to a symbol. */
  currency: string
  /** Current per-tier quantities from the selection store. */
  quantities: Partial<Record<TicketTierType, number>>
  /**
   * Remaining order-wide capacity (`MAX_TICKETS_PER_ORDER` minus the current
   * total). Bounds every tier's max increment so the 10-per-order cap holds.
   */
  orderRemainingCapacity: number
  /** Localized labels. */
  labels: TicketSelectionListLabels
  /** Called when a tier's quantity changes. */
  onQuantityChange: (type: TicketTierType, quantity: number) => void
  /** Additional class names. */
  className?: string
}

/**
 * TicketSelectionList — interactive list of a showtime's ticket types
 * (Story 6.2).
 *
 * The selection-funnel counterpart to the read-only 6.1 `TicketTypeList`. Each
 * available tier renders a {@link QuantitySelector} bounded by
 * `min(MAX_TICKETS_PER_TYPE, tier.remaining, quantity + orderRemainingCapacity)`
 * so both the per-type (10) and per-order (10) caps and the tier's live
 * `remaining` are enforced. Sold-out tiers render a disabled `Complet` row with
 * no selector and are excluded from selection.
 *
 * List semantics (`ul`/`li`) keep it RTL-aware; prices/counts use Western
 * numerals (see `formatPrice`).
 */
export function TicketSelectionList({
  tiers,
  currency,
  quantities,
  orderRemainingCapacity,
  labels,
  onQuantityChange,
  className,
}: TicketSelectionListProps) {
  return (
    <ul className={cn("flex flex-col gap-3", className)}>
      {tiers.map((tier, index) => {
        const label = labels.types[tier.type] ?? tier.type
        const key = `${tier.type}-${index}`

        if (tier.soldOut) {
          return (
            <li key={key}>
              {/* aria-disabled lives on a div, not the li (unsupported on the
                  listitem role); no selector is rendered for sold-out tiers. */}
              <div
                aria-disabled
                className="bg-card text-card-foreground flex items-start justify-between gap-3 rounded-lg border p-4 opacity-60"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-foreground font-semibold line-through">
                    {label}
                  </span>
                  <Badge variant="destructive" className="w-fit text-xs">
                    {labels.soldOut}
                  </Badge>
                  {tier.restrictionNote && (
                    <span className="text-muted-foreground text-xs italic">
                      {labels.restrictionPrefix
                        ? `${labels.restrictionPrefix} ${tier.restrictionNote}`
                        : tier.restrictionNote}
                    </span>
                  )}
                </div>
                <span className="text-foreground shrink-0 text-lg font-bold line-through">
                  {formatPrice(tier.price, currency)}
                </span>
              </div>
            </li>
          )
        }

        const quantity = quantities[tier.type] ?? 0
        const max = Math.min(
          MAX_TICKETS_PER_TYPE,
          tier.remaining,
          quantity + Math.max(0, orderRemainingCapacity)
        )

        return (
          <li key={key} className="flex flex-col gap-1">
            <QuantitySelector
              quantity={quantity}
              min={0}
              max={max}
              ticketType={label}
              unitPrice={tier.price}
              currency={currency}
              onChange={(next) => onQuantityChange(tier.type, next)}
              labels={{
                decrease: labels.decrease,
                increase: labels.increase,
                quantity: labels.quantity,
              }}
            />
            <div className="flex flex-col gap-0.5 px-1">
              <span className="text-muted-foreground text-sm">
                {labels.remaining(tier.remaining)}
              </span>
              {tier.restrictionNote && (
                <span className="text-muted-foreground text-xs italic">
                  {labels.restrictionPrefix
                    ? `${labels.restrictionPrefix} ${tier.restrictionNote}`
                    : tier.restrictionNote}
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

TicketSelectionList.displayName = "TicketSelectionList"
