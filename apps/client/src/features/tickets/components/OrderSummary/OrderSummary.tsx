"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

/**
 * Format currency with French/Tunisian conventions (comma separator)
 */
function formatCurrency(amount: number, currency: string = "DT"): string {
  return `${amount.toFixed(2).replace(".", ",")} ${currency}`
}

/**
 * Single line item in the order
 */
export interface OrderLineItem {
  /** Ticket type name (e.g., "Plein tarif") */
  ticketType: string
  /** Number of tickets */
  quantity: number
  /** Price per ticket */
  unitPrice: number
}

/**
 * Localized labels for OrderSummary
 */
export interface OrderSummaryLabels {
  subtotal: string
  serviceFee: string
  total: string
}

const defaultLabels: OrderSummaryLabels = {
  subtotal: "Sous-total",
  serviceFee: "Frais de service",
  total: "Total",
}

export interface OrderSummaryProps {
  /** Event title */
  eventTitle: string
  /** Showtime description (e.g., "20:30 - Cinéma Le Colisée") */
  showtime: string
  /** Line items (ticket types with quantities) */
  items: OrderLineItem[]
  /** Optional service fee */
  serviceFee?: number
  /** Currency symbol */
  currency?: string
  /** Localized labels */
  labels?: OrderSummaryLabels
  /** Additional class names */
  className?: string
}

/**
 * OrderSummary - Order review with line items and totals
 *
 * Features:
 * - Event title and showtime display
 * - Line items with quantity × price breakdown
 * - Subtotal calculation
 * - Optional service fee
 * - Total with currency formatting (comma separator)
 * - RTL support
 *
 * @example
 * ```tsx
 * <OrderSummary
 *   eventTitle="Inception"
 *   showtime="20:30 - Cinéma Le Palace"
 *   items={[
 *     { ticketType: "Plein tarif", quantity: 2, unitPrice: 15 },
 *     { ticketType: "Tarif réduit", quantity: 1, unitPrice: 10 },
 *   ]}
 *   serviceFee={2}
 * />
 * ```
 */
export function OrderSummary({
  eventTitle,
  showtime,
  items,
  serviceFee,
  currency = "DT",
  labels = defaultLabels,
  className,
}: OrderSummaryProps) {
  // Filter out items with zero quantity
  const activeItems = items.filter((item) => item.quantity > 0)

  // Calculate subtotal
  const subtotal = activeItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  )

  // Calculate total (subtotal + service fee)
  const total = subtotal + (serviceFee || 0)

  // Don't render if no items
  if (activeItems.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        "bg-card text-card-foreground rounded-lg border p-4",
        className
      )}
    >
      {/* Event info header */}
      <div className="mb-4">
        <h3 className="text-foreground font-semibold">{eventTitle}</h3>
        <p className="text-muted-foreground text-sm">{showtime}</p>
      </div>

      <Separator className="mb-4" />

      {/* Line items */}
      <div className="space-y-2">
        {activeItems.map((item, index) => {
          const lineTotal = item.quantity * item.unitPrice
          return (
            <div
              key={`${item.ticketType}-${index}`}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="text-foreground">
                {item.ticketType} × {item.quantity}
              </span>
              <span className="text-foreground font-medium">
                {formatCurrency(lineTotal, currency)}
              </span>
            </div>
          )
        })}
      </div>

      <Separator className="my-4" />

      {/* Subtotal */}
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{labels.subtotal}</span>
        <span className="text-foreground">
          {formatCurrency(subtotal, currency)}
        </span>
      </div>

      {/* Service fee (if applicable) */}
      {serviceFee !== undefined && serviceFee > 0 && (
        <div className="mt-2 flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{labels.serviceFee}</span>
          <span className="text-foreground">
            {formatCurrency(serviceFee, currency)}
          </span>
        </div>
      )}

      <Separator className="my-4" />

      {/* Total */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-foreground text-lg font-semibold">
          {labels.total}
        </span>
        <span className="text-primary text-xl font-bold">
          {formatCurrency(total, currency)}
        </span>
      </div>
    </div>
  )
}

OrderSummary.displayName = "OrderSummary"
