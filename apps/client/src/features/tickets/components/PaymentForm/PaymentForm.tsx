"use client"

import * as React from "react"
import { useCallback, useState } from "react"
import { Loader2, ShieldCheck } from "lucide-react"

import type { CardFieldsLabels } from "./CardFields"
import type { MobilePaymentFieldsLabels } from "./MobilePaymentFields"
import type { PaymentFormInput, PaymentMethod } from "./paymentSchema"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

import { CardFields } from "./CardFields"
import { MobilePaymentFields } from "./MobilePaymentFields"
import { PaymentMethodSelector } from "./PaymentMethodSelector"
import {
  getErrorMessage,
  getPaymentMethodConfig,
  paymentFormSchema,
} from "./paymentSchema"

/**
 * Localized labels for PaymentForm
 */
export interface PaymentFormLabels {
  title: string
  selectMethod: string
  securePayment: string
  termsLabel: string
  termsLink: string
  submitButton: string
  submitting: string
  card: CardFieldsLabels
  mobile: MobilePaymentFieldsLabels
}

const defaultLabels: PaymentFormLabels = {
  title: "Paiement",
  selectMethod: "Choisir un mode de paiement",
  securePayment: "Paiement sécurisé",
  termsLabel: "J'accepte les",
  termsLink: "conditions générales de vente",
  submitButton: "Payer",
  submitting: "Traitement en cours...",
  card: {
    cardNumber: "Numéro de carte",
    cardNumberPlaceholder: "1234 5678 9012 3456",
    expiryDate: "Date d'expiration",
    expiryDatePlaceholder: "MM/AA",
    cvv: "CVV",
    cvvPlaceholder: "123",
  },
  mobile: {
    phone: "Numéro de téléphone",
    phonePlaceholder: "XX XXX XXX",
    phoneHint: "Vous recevrez un code de confirmation",
  },
}

export interface PaymentFormProps {
  /** Currently selected payment method */
  selectedMethod?: PaymentMethod
  /** Called when payment method changes */
  onMethodChange?: (method: PaymentMethod) => void
  /** Called when form is submitted with valid data */
  onSubmit: (data: PaymentFormInput) => void
  /** Show loading state on submit button */
  isLoading?: boolean
  /** Server-side error message */
  error?: string
  /** Locale for error messages */
  locale?: "fr" | "ar" | "en"
  /** Localized labels */
  labels?: PaymentFormLabels
  /** Additional class names */
  className?: string
}

/**
 * PaymentForm - Complete payment form for ticket purchases
 *
 * Features:
 * - Payment method selection (Tunisian mobile payments + cards)
 * - Dynamic form fields based on selected method
 * - Zod schema validation
 * - Terms acceptance checkbox
 * - Loading and error states
 * - Full RTL support
 *
 * @example
 * ```tsx
 * <PaymentForm
 *   onSubmit={async (data) => {
 *     await processPayment(data)
 *   }}
 *   isLoading={isProcessing}
 *   error={paymentError}
 * />
 * ```
 */
export function PaymentForm({
  selectedMethod: controlledMethod,
  onMethodChange,
  onSubmit,
  isLoading = false,
  error: serverError,
  locale = "fr",
  labels = defaultLabels,
  className,
}: PaymentFormProps) {
  // Form state
  const [internalMethod, setInternalMethod] = useState<PaymentMethod>("e-dinar")
  const [cardNumber, setCardNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")
  const [phone, setPhone] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Use controlled or internal method
  const selectedMethod = controlledMethod ?? internalMethod

  const handleMethodChange = useCallback(
    (method: PaymentMethod) => {
      if (onMethodChange) {
        onMethodChange(method)
      } else {
        setInternalMethod(method)
      }
      // Clear errors when switching methods
      setErrors({})
    },
    [onMethodChange]
  )

  const methodConfig = getPaymentMethodConfig(selectedMethod)
  const showCardFields = methodConfig?.isCard
  const showMobileFields = methodConfig?.requiresPhone

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      // Build form data
      const formData: PaymentFormInput = {
        method: selectedMethod,
        acceptTerms,
        ...(showCardFields && {
          cardNumber: cardNumber.replace(/\s/g, ""),
          expiryDate,
          cvv,
        }),
        ...(showMobileFields && { phone }),
      }

      // Validate
      const result = paymentFormSchema.safeParse(formData)

      if (!result.success) {
        const fieldErrors: Record<string, string> = {}
        result.error.errors.forEach((err) => {
          const path = err.path[0]?.toString() || "form"
          fieldErrors[path] = getErrorMessage(err.message, locale)
        })
        setErrors(fieldErrors)
        return
      }

      // Clear errors and submit
      setErrors({})
      onSubmit(formData)
    },
    [
      selectedMethod,
      cardNumber,
      expiryDate,
      cvv,
      phone,
      acceptTerms,
      showCardFields,
      showMobileFields,
      locale,
      onSubmit,
    ]
  )

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("space-y-6", className)}
      noValidate
    >
      {/* Secure payment badge */}
      <div className="flex items-center justify-center gap-2 text-sm">
        <ShieldCheck className="h-4 w-4 text-green-600" />
        <span className="text-muted-foreground">{labels.securePayment}</span>
      </div>

      {/* Payment method selector */}
      <div className="space-y-3">
        <Label className="text-base font-medium">{labels.selectMethod}</Label>
        <PaymentMethodSelector
          selectedMethod={selectedMethod}
          onMethodChange={handleMethodChange}
          disabled={isLoading}
        />
      </div>

      {/* Method-specific fields */}
      <div className="min-h-[120px]">
        {showCardFields && (
          <CardFields
            cardNumber={cardNumber}
            expiryDate={expiryDate}
            cvv={cvv}
            onCardNumberChange={setCardNumber}
            onExpiryDateChange={setExpiryDate}
            onCvvChange={setCvv}
            errors={{
              cardNumber: errors.cardNumber,
              expiryDate: errors.expiryDate,
              cvv: errors.cvv,
            }}
            disabled={isLoading}
            labels={labels.card}
          />
        )}

        {showMobileFields && (
          <MobilePaymentFields
            phone={phone}
            onPhoneChange={setPhone}
            error={errors.phone}
            disabled={isLoading}
            labels={labels.mobile}
          />
        )}
      </div>

      {/* Terms acceptance */}
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Checkbox
            id="accept-terms"
            checked={acceptTerms}
            onCheckedChange={(checked) => setAcceptTerms(checked === true)}
            disabled={isLoading}
            className={cn(errors.acceptTerms && "border-destructive")}
            aria-invalid={!!errors.acceptTerms}
          />
          <Label
            htmlFor="accept-terms"
            className="text-muted-foreground text-sm leading-tight"
          >
            {labels.termsLabel}{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {labels.termsLink}
            </a>
          </Label>
        </div>
        {errors.acceptTerms && (
          <p className="text-destructive text-sm">{errors.acceptTerms}</p>
        )}
      </div>

      {/* Server error */}
      {serverError && (
        <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
          {serverError}
        </div>
      )}

      {/* Submit button */}
      <Button type="submit" size="lg" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
            {labels.submitting}
          </>
        ) : (
          labels.submitButton
        )}
      </Button>
    </form>
  )
}

PaymentForm.displayName = "PaymentForm"
