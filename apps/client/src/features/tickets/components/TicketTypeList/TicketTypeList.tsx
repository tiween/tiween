"use client"

import * as React from "react"

import type { TicketTier, TicketTierType } from "@/features/tickets/types"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

import { formatPrice } from "../../utils/formatPrice"

/**
 * Localized labels for {@link TicketTypeList}.
 *
 * Type LABELS (Plein tarif / Tarif réduit / VIP) are produced by frontend i18n
 * keyed on the `type` enum — never stored on the backend. `remaining` is a
 * function so the count interpolates ("12 restants"). `restrictionPrefix` is an
 * optional lead-in shown before the verbatim restriction note.
 */
export interface TicketTypeListLabels {
  /** Map of the tier `type` enum to its display label. */
  types: Record<TicketTierType, string>
  /** Availability line, e.g. `(12) => "12 restants"`. */
  remaining: (count: number) => string
  /** Sold-out badge, e.g. "Complet". */
  soldOut: string
  /** Optional lead-in before the restriction note (e.g. "Restriction :"). */
  restrictionPrefix?: string
}

export interface TicketTypeListProps {
  /** The tiers to render (already computed by the backend). */
  tiers: TicketTier[]
  /** Currency code from the endpoint (e.g. "TND"); mapped to a symbol on display. */
  currency: string
  /** Localized labels. */
  labels: TicketTypeListLabels
  /** Additional class names. */
  className?: string
}

/**
 * TicketTypeList - Read-only list of a showtime's ticket types (Story 6.1).
 *
 * Renders one row per tier with its translated label, TND-formatted price,
 * remaining availability, an optional restriction note, and a sold-out state.
 * This is presentation only: non-sold-out rows render an enabled affordance but
 * wire NO selection handler — selection + quantity is Story 6.2. Only the
 * "sold-out is not selectable" behavior is enforced here (aria-disabled +
 * non-interactive styling + a "Complet" badge).
 *
 * List semantics (`ul`/`li`) and logical `start`/`end` spacing keep it
 * RTL-aware. Prices/counts use Western numerals (see `formatPrice`), correct for
 * the Arabic locale.
 */
export function TicketTypeList({
  tiers,
  currency,
  labels,
  className,
}: TicketTypeListProps) {
  return (
    <ul className={cn("flex flex-col gap-3", className)}>
      {tiers.map((tier, index) => {
        const label = labels.types[tier.type] ?? tier.type
        const isSoldOut = tier.soldOut

        return (
          <li key={`${tier.type}-${index}`}>
            {/* The row carries the (non-interactive) disabled affordance. It is a
                div, not the li, because aria-disabled is unsupported on the
                listitem role. No selection handler is wired here — selection is
                Story 6.2; only the sold-out "not selectable" state is enforced. */}
            <div
              aria-disabled={isSoldOut || undefined}
              className={cn(
                "bg-card text-card-foreground relative flex items-start justify-between gap-3 rounded-lg border p-4",
                isSoldOut
                  ? "opacity-60"
                  : "hover:border-primary/40 transition-colors"
              )}
            >
              {/* Left column: label, availability, restriction */}
              <div className="flex min-w-0 flex-col gap-1">
                <span
                  className={cn(
                    "text-foreground font-semibold",
                    isSoldOut && "line-through"
                  )}
                >
                  {label}
                </span>

                {isSoldOut ? (
                  <Badge variant="destructive" className="w-fit text-xs">
                    {labels.soldOut}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">
                    {labels.remaining(tier.remaining)}
                  </span>
                )}

                {tier.restrictionNote && (
                  <span className="text-muted-foreground text-xs italic">
                    {labels.restrictionPrefix
                      ? `${labels.restrictionPrefix} ${tier.restrictionNote}`
                      : tier.restrictionNote}
                  </span>
                )}
              </div>

              {/* Right column: price */}
              <span
                className={cn(
                  "text-foreground shrink-0 text-lg font-bold",
                  isSoldOut && "line-through"
                )}
              >
                {formatPrice(tier.price, currency)}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

TicketTypeList.displayName = "TicketTypeList"
