"use client"

import * as React from "react"
import { Minus, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * Format currency with French/Tunisian conventions (comma separator)
 */
function formatCurrency(amount: number, currency: string = "DT"): string {
  return `${amount.toFixed(2).replace(".", ",")} ${currency}`
}

/**
 * Localized labels for QuantitySelector
 */
export interface QuantitySelectorLabels {
  decrease: string
  increase: string
  quantity: string
}

const defaultLabels: QuantitySelectorLabels = {
  decrease: "Diminuer la quantité",
  increase: "Augmenter la quantité",
  quantity: "Quantité",
}

export interface QuantitySelectorProps {
  /** Current quantity value */
  quantity: number
  /** Minimum allowed quantity */
  min?: number
  /** Maximum allowed quantity */
  max?: number
  /** Ticket type label (e.g., "Plein tarif", "Tarif réduit") */
  ticketType: string
  /** Price per ticket */
  unitPrice: number
  /** Currency symbol */
  currency?: string
  /** Called when quantity changes */
  onChange: (quantity: number) => void
  /** Localized labels */
  labels?: QuantitySelectorLabels
  /** Additional class names */
  className?: string
}

/**
 * QuantitySelector - Ticket quantity selection with +/- buttons
 *
 * Features:
 * - Minus and Plus buttons for adjusting quantity
 * - Min/max limits with disabled state at bounds
 * - Ticket type label and unit price display
 * - Currency formatting with comma separator (Tunisian convention)
 * - Keyboard accessible
 * - RTL support
 *
 * @example
 * ```tsx
 * const [quantity, setQuantity] = useState(1)
 *
 * <QuantitySelector
 *   quantity={quantity}
 *   ticketType="Plein tarif"
 *   unitPrice={15}
 *   min={1}
 *   max={10}
 *   onChange={setQuantity}
 * />
 * ```
 */
export function QuantitySelector({
  quantity,
  min = 1,
  max = 10,
  ticketType,
  unitPrice,
  currency = "DT",
  onChange,
  labels = defaultLabels,
  className,
}: QuantitySelectorProps) {
  const isAtMin = quantity <= min
  const isAtMax = quantity >= max

  const handleDecrease = () => {
    if (!isAtMin) {
      onChange(quantity - 1)
    }
  }

  const handleIncrease = () => {
    if (!isAtMax) {
      onChange(quantity + 1)
    }
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-lg border p-4",
        "bg-card text-card-foreground",
        className
      )}
    >
      {/* Left side: Ticket type and price */}
      <div className="flex flex-col gap-1">
        <span className="text-foreground font-medium">{ticketType}</span>
        <span className="text-muted-foreground text-sm">
          {formatCurrency(unitPrice, currency)}
        </span>
      </div>

      {/* Right side: Quantity controls */}
      <div className="flex items-center gap-3">
        {/* Minus button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleDecrease}
          disabled={isAtMin}
          aria-label={labels.decrease}
          className="h-9 w-9 shrink-0"
        >
          <Minus className="h-4 w-4" />
        </Button>

        {/* Quantity display */}
        <span
          className="text-foreground w-8 text-center text-lg font-semibold"
          aria-label={`${labels.quantity}: ${quantity}`}
          aria-live="polite"
        >
          {quantity}
        </span>

        {/* Plus button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleIncrease}
          disabled={isAtMax}
          aria-label={labels.increase}
          className="h-9 w-9 shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

QuantitySelector.displayName = "QuantitySelector"
