"use client"

import * as React from "react"
import { CreditCard, Smartphone, Wallet } from "lucide-react"

import type { PaymentMethod } from "./paymentSchema"

import { cn } from "@/lib/utils"

import { paymentMethodConfigs } from "./paymentSchema"

export interface PaymentMethodSelectorProps {
  selectedMethod?: PaymentMethod
  onMethodChange: (method: PaymentMethod) => void
  disabled?: boolean
  className?: string
}

/**
 * Get icon component for payment method
 */
function getPaymentIcon(method: PaymentMethod) {
  switch (method) {
    case "card":
      return CreditCard
    case "e-dinar":
      return Wallet
    default:
      return Smartphone
  }
}

/**
 * PaymentMethodSelector - Grid of payment method options
 *
 * Displays available Tunisian payment methods:
 * - e-Dinar (national digital wallet)
 * - Sobflous, D17, Flouci (mobile payment apps)
 * - Card (Visa/Mastercard)
 */
export function PaymentMethodSelector({
  selectedMethod,
  onMethodChange,
  disabled = false,
  className,
}: PaymentMethodSelectorProps) {
  return (
    <div
      className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3", className)}
      role="radiogroup"
      aria-label="Payment method"
    >
      {paymentMethodConfigs.map((config) => {
        const isSelected = selectedMethod === config.id
        const Icon = getPaymentIcon(config.id)

        return (
          <button
            key={config.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onMethodChange(config.id)}
            className={cn(
              // Base styles
              "relative flex flex-col items-center gap-2 rounded-lg border p-4",
              // Transition
              "transition-all duration-200",
              // Focus styles
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              // State styles
              isSelected
                ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                : "border-border hover:border-primary/50 hover:bg-accent",
              // Disabled
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                isSelected ? "bg-primary/10" : "bg-muted"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )}
              />
            </div>

            {/* Label */}
            <span
              className={cn(
                "text-sm font-medium",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {config.label}
            </span>

            {/* Selected indicator */}
            {isSelected && (
              <div
                className="bg-primary absolute -end-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full"
                aria-hidden="true"
              >
                <svg
                  className="text-primary-foreground h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

PaymentMethodSelector.displayName = "PaymentMethodSelector"
