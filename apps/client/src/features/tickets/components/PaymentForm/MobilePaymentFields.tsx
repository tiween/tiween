"use client"

import * as React from "react"
import { Phone } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface MobilePaymentFieldsLabels {
  phone: string
  phonePlaceholder: string
  phoneHint: string
}

const defaultLabels: MobilePaymentFieldsLabels = {
  phone: "Numéro de téléphone",
  phonePlaceholder: "XX XXX XXX",
  phoneHint: "Vous recevrez un code de confirmation",
}

export interface MobilePaymentFieldsProps {
  phone: string
  onPhoneChange: (value: string) => void
  error?: string
  disabled?: boolean
  labels?: MobilePaymentFieldsLabels
  className?: string
}

/**
 * Format Tunisian phone number (XX XXX XXX)
 */
function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
}

/**
 * MobilePaymentFields - Phone number input for mobile payments
 *
 * Used for Tunisian mobile payment methods:
 * - e-Dinar
 * - Sobflous
 * - D17
 * - Flouci
 *
 * Features:
 * - Auto-formatting for Tunisian phone numbers
 * - Inline validation error
 * - Visual phone icon
 * - RTL support via CSS logical properties
 */
export function MobilePaymentFields({
  phone,
  onPhoneChange,
  error,
  disabled = false,
  labels = defaultLabels,
  className,
}: MobilePaymentFieldsProps) {
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    // Store raw digits internally
    onPhoneChange(e.target.value.replace(/\D/g, "").slice(0, 8))
  }

  // Display formatted version
  const displayValue = formatPhoneNumber(phone)

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="phone">{labels.phone}</Label>
      <div className="relative">
        {/* Country code badge */}
        <div className="bg-muted text-muted-foreground pointer-events-none absolute start-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-sm">
          <span className="text-base">🇹🇳</span>
          <span>+216</span>
        </div>
        <Input
          id="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder={labels.phonePlaceholder}
          value={displayValue}
          onChange={handlePhoneChange}
          disabled={disabled}
          className={cn(
            "ps-24",
            error && "border-destructive focus-visible:ring-destructive"
          )}
          aria-invalid={!!error}
          aria-describedby={error ? "phone-error" : "phone-hint"}
        />
      </div>
      {error ? (
        <p id="phone-error" className="text-destructive text-sm">
          {error}
        </p>
      ) : (
        <p id="phone-hint" className="text-muted-foreground text-sm">
          {labels.phoneHint}
        </p>
      )}
    </div>
  )
}

MobilePaymentFields.displayName = "MobilePaymentFields"
