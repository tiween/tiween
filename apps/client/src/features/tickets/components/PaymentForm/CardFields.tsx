"use client"

import * as React from "react"
import { Calendar, CreditCard, Lock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface CardFieldsLabels {
  cardNumber: string
  cardNumberPlaceholder: string
  expiryDate: string
  expiryDatePlaceholder: string
  cvv: string
  cvvPlaceholder: string
}

const defaultLabels: CardFieldsLabels = {
  cardNumber: "Numéro de carte",
  cardNumberPlaceholder: "1234 5678 9012 3456",
  expiryDate: "Date d'expiration",
  expiryDatePlaceholder: "MM/AA",
  cvv: "CVV",
  cvvPlaceholder: "123",
}

export interface CardFieldsProps {
  cardNumber: string
  expiryDate: string
  cvv: string
  onCardNumberChange: (value: string) => void
  onExpiryDateChange: (value: string) => void
  onCvvChange: (value: string) => void
  errors?: {
    cardNumber?: string
    expiryDate?: string
    cvv?: string
  }
  disabled?: boolean
  labels?: CardFieldsLabels
  className?: string
}

/**
 * Format card number with spaces (4-4-4-4)
 */
function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16)
  return digits.replace(/(.{4})/g, "$1 ").trim()
}

/**
 * Format expiry date (MM/YY)
 */
function formatExpiryDate(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4)
  if (digits.length >= 2) {
    return digits.slice(0, 2) + "/" + digits.slice(2)
  }
  return digits
}

/**
 * CardFields - Credit/debit card input fields
 *
 * Features:
 * - Auto-formatting for card number and expiry
 * - Inline validation errors
 * - Visual icons for each field
 * - RTL support via CSS logical properties
 */
export function CardFields({
  cardNumber,
  expiryDate,
  cvv,
  onCardNumberChange,
  onExpiryDateChange,
  onCvvChange,
  errors = {},
  disabled = false,
  labels = defaultLabels,
  className,
}: CardFieldsProps) {
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value)
    onCardNumberChange(formatted)
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value)
    onExpiryDateChange(formatted)
  }

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 4)
    onCvvChange(digits)
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Card Number */}
      <div className="space-y-2">
        <Label htmlFor="card-number">{labels.cardNumber}</Label>
        <div className="relative">
          <CreditCard className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            id="card-number"
            type="text"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder={labels.cardNumberPlaceholder}
            value={cardNumber}
            onChange={handleCardNumberChange}
            disabled={disabled}
            className={cn(
              "ps-10",
              errors.cardNumber &&
                "border-destructive focus-visible:ring-destructive"
            )}
            aria-invalid={!!errors.cardNumber}
            aria-describedby={
              errors.cardNumber ? "card-number-error" : undefined
            }
          />
        </div>
        {errors.cardNumber && (
          <p id="card-number-error" className="text-destructive text-sm">
            {errors.cardNumber}
          </p>
        )}
      </div>

      {/* Expiry and CVV row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Expiry Date */}
        <div className="space-y-2">
          <Label htmlFor="expiry-date">{labels.expiryDate}</Label>
          <div className="relative">
            <Calendar className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              id="expiry-date"
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder={labels.expiryDatePlaceholder}
              value={expiryDate}
              onChange={handleExpiryChange}
              disabled={disabled}
              className={cn(
                "ps-10",
                errors.expiryDate &&
                  "border-destructive focus-visible:ring-destructive"
              )}
              aria-invalid={!!errors.expiryDate}
              aria-describedby={errors.expiryDate ? "expiry-error" : undefined}
            />
          </div>
          {errors.expiryDate && (
            <p id="expiry-error" className="text-destructive text-sm">
              {errors.expiryDate}
            </p>
          )}
        </div>

        {/* CVV */}
        <div className="space-y-2">
          <Label htmlFor="cvv">{labels.cvv}</Label>
          <div className="relative">
            <Lock className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              id="cvv"
              type="text"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder={labels.cvvPlaceholder}
              value={cvv}
              onChange={handleCvvChange}
              disabled={disabled}
              className={cn(
                "ps-10",
                errors.cvv &&
                  "border-destructive focus-visible:ring-destructive"
              )}
              aria-invalid={!!errors.cvv}
              aria-describedby={errors.cvv ? "cvv-error" : undefined}
            />
          </div>
          {errors.cvv && (
            <p id="cvv-error" className="text-destructive text-sm">
              {errors.cvv}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

CardFields.displayName = "CardFields"
