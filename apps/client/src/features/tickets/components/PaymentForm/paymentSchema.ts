import { z } from "zod"

/**
 * Available payment methods in Tunisia
 * - e-dinar: National digital wallet (La Poste Tunisienne)
 * - sobflous: Mobile payment service
 * - d17: Digital payment solution
 * - flouci: Tunisian fintech payment app
 * - card: Traditional bank card (Visa/Mastercard)
 */
export type PaymentMethod = "e-dinar" | "sobflous" | "d17" | "flouci" | "card"

/**
 * Payment methods array for iteration
 */
export const PAYMENT_METHODS: PaymentMethod[] = [
  "e-dinar",
  "sobflous",
  "d17",
  "flouci",
  "card",
]

/**
 * Payment method configuration with labels and icons
 */
export interface PaymentMethodConfig {
  id: PaymentMethod
  label: string
  labelAr: string
  labelEn: string
  /** Whether this method requires phone number */
  requiresPhone: boolean
  /** Whether this is a card payment */
  isCard: boolean
}

export const paymentMethodConfigs: PaymentMethodConfig[] = [
  {
    id: "e-dinar",
    label: "e-Dinar",
    labelAr: "الدينار الإلكتروني",
    labelEn: "e-Dinar",
    requiresPhone: true,
    isCard: false,
  },
  {
    id: "sobflous",
    label: "Sobflous",
    labelAr: "سوبفلوس",
    labelEn: "Sobflous",
    requiresPhone: true,
    isCard: false,
  },
  {
    id: "d17",
    label: "D17",
    labelAr: "D17",
    labelEn: "D17",
    requiresPhone: true,
    isCard: false,
  },
  {
    id: "flouci",
    label: "Flouci",
    labelAr: "فلوسي",
    labelEn: "Flouci",
    requiresPhone: true,
    isCard: false,
  },
  {
    id: "card",
    label: "Carte bancaire",
    labelAr: "بطاقة بنكية",
    labelEn: "Bank Card",
    requiresPhone: false,
    isCard: true,
  },
]

/**
 * Get payment method config by ID
 */
export function getPaymentMethodConfig(
  method: PaymentMethod
): PaymentMethodConfig | undefined {
  return paymentMethodConfigs.find((m) => m.id === method)
}

/**
 * Tunisian phone number validation
 * Format: 8 digits starting with 2, 4, 5, 7, or 9
 */
const tunisianPhoneRegex = /^[24579]\d{7}$/

/**
 * Card number validation (Luhn algorithm check)
 */
function isValidCardNumber(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\s/g, "")
  if (!/^\d{16}$/.test(digits)) return false

  let sum = 0
  let isEven = false

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10)

    if (isEven) {
      digit *= 2
      if (digit > 9) digit -= 9
    }

    sum += digit
    isEven = !isEven
  }

  return sum % 10 === 0
}

/**
 * Expiry date validation (MM/YY format, not expired)
 */
function isValidExpiry(expiry: string): boolean {
  const match = expiry.match(/^(0[1-9]|1[0-2])\/(\d{2})$/)
  if (!match) return false

  const month = parseInt(match[1], 10)
  const year = parseInt("20" + match[2], 10)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  if (year < currentYear) return false
  if (year === currentYear && month < currentMonth) return false

  return true
}

/**
 * Base form data schema (without refinements)
 */
const basePaymentSchema = z.object({
  method: z.enum(["e-dinar", "sobflous", "d17", "flouci", "card"]),
  cardNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  cvv: z.string().optional(),
  phone: z.string().optional(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "TERMS_REQUIRED" }),
  }),
})

/**
 * Full payment form validation schema with conditional validation
 */
export const paymentFormSchema = basePaymentSchema
  .refine(
    (data) => {
      // Card payments require card fields
      if (data.method === "card") {
        if (!data.cardNumber) return false
        if (!isValidCardNumber(data.cardNumber)) return false
        return true
      }
      return true
    },
    { message: "INVALID_CARD_NUMBER", path: ["cardNumber"] }
  )
  .refine(
    (data) => {
      if (data.method === "card") {
        if (!data.expiryDate) return false
        if (!isValidExpiry(data.expiryDate)) return false
        return true
      }
      return true
    },
    { message: "INVALID_EXPIRY", path: ["expiryDate"] }
  )
  .refine(
    (data) => {
      if (data.method === "card") {
        if (!data.cvv) return false
        if (!/^\d{3,4}$/.test(data.cvv)) return false
        return true
      }
      return true
    },
    { message: "INVALID_CVV", path: ["cvv"] }
  )
  .refine(
    (data) => {
      // Mobile payments require phone
      const mobilePayments: PaymentMethod[] = [
        "e-dinar",
        "sobflous",
        "d17",
        "flouci",
      ]
      if (mobilePayments.includes(data.method)) {
        if (!data.phone) return false
        if (!tunisianPhoneRegex.test(data.phone)) return false
        return true
      }
      return true
    },
    { message: "INVALID_PHONE", path: ["phone"] }
  )

/**
 * Type inference from schema
 */
export type PaymentFormData = z.infer<typeof paymentFormSchema>

/**
 * Form input type (before validation, terms can be boolean)
 */
export interface PaymentFormInput {
  method: PaymentMethod
  cardNumber?: string
  expiryDate?: string
  cvv?: string
  phone?: string
  acceptTerms: boolean
}

/**
 * Error message mapping for i18n
 */
export const paymentErrorMessages: Record<string, Record<string, string>> = {
  fr: {
    TERMS_REQUIRED: "Vous devez accepter les conditions",
    INVALID_CARD_NUMBER: "Numéro de carte invalide",
    INVALID_EXPIRY: "Date d'expiration invalide",
    INVALID_CVV: "Code CVV invalide",
    INVALID_PHONE: "Numéro de téléphone invalide",
  },
  ar: {
    TERMS_REQUIRED: "يجب قبول الشروط",
    INVALID_CARD_NUMBER: "رقم البطاقة غير صالح",
    INVALID_EXPIRY: "تاريخ انتهاء الصلاحية غير صالح",
    INVALID_CVV: "رمز CVV غير صالح",
    INVALID_PHONE: "رقم الهاتف غير صالح",
  },
  en: {
    TERMS_REQUIRED: "You must accept the terms",
    INVALID_CARD_NUMBER: "Invalid card number",
    INVALID_EXPIRY: "Invalid expiry date",
    INVALID_CVV: "Invalid CVV code",
    INVALID_PHONE: "Invalid phone number",
  },
}

/**
 * Get localized error message
 */
export function getErrorMessage(code: string, locale: string = "fr"): string {
  return paymentErrorMessages[locale]?.[code] || code
}
