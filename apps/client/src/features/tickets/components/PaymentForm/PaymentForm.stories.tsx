import { useState } from "react"

import type { Meta, StoryObj } from "@storybook/react"
import type { PaymentFormInput, PaymentMethod } from "."

import { PaymentForm } from "."

const meta: Meta<typeof PaymentForm> = {
  title: "Features/Tickets/PaymentForm",
  component: PaymentForm,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Complete payment form supporting Tunisian payment methods (e-Dinar, Sobflous, D17, Flouci) and credit cards. Includes form validation, loading states, and RTL support.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof PaymentForm>

/**
 * Interactive wrapper that handles state
 */
function InteractivePaymentForm({
  initialMethod = "e-dinar",
  simulateError = false,
  simulateLoading = false,
}: {
  initialMethod?: PaymentMethod
  simulateError?: boolean
  simulateLoading?: boolean
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(
    simulateError ? "Le paiement a été refusé. Veuillez réessayer." : undefined
  )
  const [submitted, setSubmitted] = useState<PaymentFormInput | null>(null)

  const handleSubmit = async (data: PaymentFormInput) => {
    setError(undefined)
    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))

    if (simulateLoading) {
      // Keep loading
      return
    }

    setIsLoading(false)
    setSubmitted(data)
    console.log("Payment submitted:", data)
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <PaymentForm
        selectedMethod={initialMethod}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        error={error}
      />
      {submitted && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-200">
          <strong>Paiement soumis!</strong>
          <pre className="mt-2 overflow-auto text-xs">
            {JSON.stringify(submitted, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

/**
 * Default payment form with e-Dinar selected
 */
export const Default: Story = {
  render: () => <InteractivePaymentForm />,
}

/**
 * e-Dinar payment (national digital wallet)
 */
export const EDinar: Story = {
  render: () => <InteractivePaymentForm initialMethod="e-dinar" />,
}

/**
 * Sobflous mobile payment
 */
export const Sobflous: Story = {
  render: () => <InteractivePaymentForm initialMethod="sobflous" />,
}

/**
 * D17 mobile payment
 */
export const D17: Story = {
  render: () => <InteractivePaymentForm initialMethod="d17" />,
}

/**
 * Flouci mobile payment
 */
export const Flouci: Story = {
  render: () => <InteractivePaymentForm initialMethod="flouci" />,
}

/**
 * Credit/debit card payment
 */
export const Card: Story = {
  render: () => <InteractivePaymentForm initialMethod="card" />,
}

/**
 * Form in loading state
 */
export const Loading: Story = {
  render: () => {
    return (
      <div className="mx-auto max-w-md">
        <PaymentForm
          selectedMethod="e-dinar"
          onSubmit={() => {}}
          isLoading={true}
        />
      </div>
    )
  },
}

/**
 * Form with server error
 */
export const WithError: Story = {
  render: () => <InteractivePaymentForm initialMethod="card" simulateError />,
}

/**
 * RTL mode with Arabic labels
 */
export const RTL: Story = {
  render: () => {
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (data: PaymentFormInput) => {
      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setIsLoading(false)
      console.log("Payment submitted:", data)
    }

    return (
      <div dir="rtl" lang="ar" className="font-arabic mx-auto max-w-md">
        <PaymentForm
          selectedMethod="e-dinar"
          onSubmit={handleSubmit}
          isLoading={isLoading}
          locale="ar"
          labels={{
            title: "الدفع",
            selectMethod: "اختر طريقة الدفع",
            securePayment: "دفع آمن",
            termsLabel: "أوافق على",
            termsLink: "الشروط والأحكام",
            submitButton: "ادفع الآن",
            submitting: "جاري المعالجة...",
            card: {
              cardNumber: "رقم البطاقة",
              cardNumberPlaceholder: "1234 5678 9012 3456",
              expiryDate: "تاريخ الانتهاء",
              expiryDatePlaceholder: "شهر/سنة",
              cvv: "CVV",
              cvvPlaceholder: "123",
            },
            mobile: {
              phone: "رقم الهاتف",
              phonePlaceholder: "XX XXX XXX",
              phoneHint: "ستتلقى رمز تأكيد",
            },
          }}
        />
      </div>
    )
  },
}

/**
 * English labels
 */
export const EnglishLabels: Story = {
  render: () => {
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (data: PaymentFormInput) => {
      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setIsLoading(false)
      console.log("Payment submitted:", data)
    }

    return (
      <div className="mx-auto max-w-md">
        <PaymentForm
          selectedMethod="card"
          onSubmit={handleSubmit}
          isLoading={isLoading}
          locale="en"
          labels={{
            title: "Payment",
            selectMethod: "Choose payment method",
            securePayment: "Secure payment",
            termsLabel: "I accept the",
            termsLink: "terms and conditions",
            submitButton: "Pay Now",
            submitting: "Processing...",
            card: {
              cardNumber: "Card number",
              cardNumberPlaceholder: "1234 5678 9012 3456",
              expiryDate: "Expiry date",
              expiryDatePlaceholder: "MM/YY",
              cvv: "CVV",
              cvvPlaceholder: "123",
            },
            mobile: {
              phone: "Phone number",
              phonePlaceholder: "XX XXX XXX",
              phoneHint: "You will receive a confirmation code",
            },
          }}
        />
      </div>
    )
  },
}

/**
 * Validation error states
 */
export const ValidationErrors: Story = {
  render: () => {
    const [hasSubmitted, setHasSubmitted] = useState(false)

    return (
      <div className="mx-auto max-w-md space-y-4">
        <p className="text-muted-foreground text-sm">
          Cliquez "Payer" sans remplir le formulaire pour voir les erreurs de
          validation.
        </p>
        <PaymentForm
          selectedMethod="card"
          onSubmit={(data) => {
            setHasSubmitted(true)
            console.log("Valid data:", data)
          }}
        />
        {hasSubmitted && (
          <p className="text-sm text-green-600">
            ✓ Formulaire valide et soumis!
          </p>
        )}
      </div>
    )
  },
}

/**
 * Controlled component with external method selection
 */
export const Controlled: Story = {
  render: () => {
    const [method, setMethod] = useState<PaymentMethod>("e-dinar")

    return (
      <div className="mx-auto max-w-md space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMethod("e-dinar")}
            className={`rounded px-3 py-1 text-sm ${method === "e-dinar" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            e-Dinar
          </button>
          <button
            type="button"
            onClick={() => setMethod("card")}
            className={`rounded px-3 py-1 text-sm ${method === "card" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            Card
          </button>
        </div>
        <PaymentForm
          selectedMethod={method}
          onMethodChange={setMethod}
          onSubmit={(data) => console.log("Submit:", data)}
        />
      </div>
    )
  },
}

/**
 * All payment methods grid
 */
export const AllMethodsShowcase: Story = {
  render: () => {
    return (
      <div className="grid gap-8 md:grid-cols-2">
        {(
          ["e-dinar", "sobflous", "d17", "flouci", "card"] as PaymentMethod[]
        ).map((method) => (
          <div key={method} className="space-y-2">
            <h3 className="text-muted-foreground text-sm font-medium uppercase">
              {method}
            </h3>
            <PaymentForm
              selectedMethod={method}
              onSubmit={(data) => console.log(method, data)}
            />
          </div>
        ))}
      </div>
    )
  },
}
