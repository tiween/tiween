"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"

import type { OrderLineItem, PaymentMethod } from "@/features/tickets/components"
import type { GuestCheckoutData } from "@/features/tickets/components/GuestCheckoutForm"

import { useCreateOrder } from "@/features/tickets/hooks/useCreateOrder"
import { useGuestCheckout } from "@/features/tickets/hooks/useGuestCheckout"
import { useTicketTiers } from "@/features/tickets/hooks/useTicketTiers"
import { useTicketSelectionStore } from "@/features/tickets/stores/ticketSelectionStore"
import { saveOrderAccess } from "@/features/tickets/utils/orderAccess"
import { OrderSummary, PaymentMethodSelector } from "@/features/tickets/components"
import { GuestCheckoutForm } from "@/features/tickets/components/GuestCheckoutForm"
import { Button } from "@/components/ui/button"

export interface PaymentStepProps {
  /** The sub-event (screening/performance) documentId of the selection. */
  screeningId: string
  /** The parent event documentId (sent as the order's `eventId`). */
  documentId: string
  /** Active locale (for the redirect result path). */
  locale: string
  /** Event title for the recap. */
  eventTitle: string
  /** Human-readable showtime label for the recap. */
  showtimeLabel: string
}

/** Error codes with a dedicated `ticketing.errors.*` translation. */
const KNOWN_ERROR_CODES = [
  "KONNECT_UNAVAILABLE",
  "TICKET_SOLD_OUT",
  "INVALID_ORDER",
  "VALIDATION_FAILED",
  "UNKNOWN_ERROR",
] as const

type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number]

/**
 * PaymentStep — the real Story 6.3 payment step (replaces the 6.2 placeholder).
 *
 * Reads the persisted selection (gated to THIS sub-event), recaps it with
 * `OrderSummary`, lets the buyer pick a Konnect method + enter contact info,
 * then POSTs `/ticketing/orders` and redirects the browser to the hosted
 * Konnect `payUrl`. No raw card/CVV is ever collected here — Konnect's hosted
 * page handles credentials.
 *
 * A mount guard defers reading the persisted store until after hydration so the
 * server (empty store) and first client render agree.
 */
export function PaymentStep({
  screeningId,
  documentId,
  locale,
  eventTitle,
  showtimeLabel,
}: PaymentStepProps) {
  const t = useTranslations("ticketing")

  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const { data } = useTicketTiers(screeningId)
  const storeSubEventId = useTicketSelectionStore((s) => s.subEventId)
  const storeQuantities = useTicketSelectionStore((s) => s.quantities)

  const { guestInfo, setGuestInfo } = useGuestCheckout()
  const { createOrder, isSubmitting, errorCode } = useCreateOrder()

  const [method, setMethod] = React.useState<PaymentMethod | undefined>(
    undefined
  )
  const [methodError, setMethodError] = React.useState(false)

  // Only price a selection that belongs to THIS sub-event (a persisted cart
  // from another showtime must never be charged against the wrong tiers).
  const quantities = storeSubEventId === screeningId ? storeQuantities : {}

  const selectableTiers =
    mounted && data
      ? data.tiers.filter(
          (tier) => !tier.soldOut && (quantities[tier.type] ?? 0) > 0
        )
      : []

  const items: OrderLineItem[] = selectableTiers.map((tier) => ({
    ticketType: t(`types.${tier.type}`),
    quantity: quantities[tier.type] ?? 0,
    unitPrice: tier.price,
  }))

  // Flatten the selection into one entry per ticket for the checkout payload.
  const selectedTickets = selectableTiers.flatMap((tier) =>
    Array.from({ length: quantities[tier.type] ?? 0 }, () => ({
      type: tier.type,
      price: tier.price,
    }))
  )

  const hasSelection = selectedTickets.length > 0

  const errorKey: KnownErrorCode =
    errorCode && (KNOWN_ERROR_CODES as readonly string[]).includes(errorCode)
      ? (errorCode as KnownErrorCode)
      : "UNKNOWN_ERROR"
  const translatedError = errorCode ? t(`errors.${errorKey}`) : undefined

  const handleSubmit = async (guest: GuestCheckoutData) => {
    if (!hasSelection) return
    if (!method) {
      setMethodError(true)
      return
    }
    setMethodError(false)
    setGuestInfo(guest)

    try {
      const { payUrl, orderNumber, accessToken } = await createOrder({
        eventId: documentId,
        // The tiers response tells us whether the sub-event is a screening or a
        // performance; send exactly one of the two ids.
        ...(data?.kind === "performance"
          ? { performanceId: screeningId }
          : { screeningId }),
        paymentMethod: method,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        // Optional phone: send undefined (not "") so the backend's min(1) guard
        // does not reject a guest who left it blank.
        phone: guest.phone ? guest.phone : undefined,
        locale,
        tickets: selectedTickets,
      })
      // Persist the guest ticket-retrieval credential BEFORE leaving the
      // client (Story 6.4). It stays in this browser's own storage — putting it
      // in the Konnect redirect URL would leak it through the gateway, the
      // referrer and every server log along the way.
      saveOrderAccess(orderNumber, accessToken)

      // Leave the client and hand off to Konnect's hosted page.
      window.location.assign(payUrl)
    } catch {
      // errorCode is surfaced by the hook; stay on the step for a retry.
    }
  }

  const guestLabels = {
    title: t("guestContactTitle"),
    description: t("guest.description"),
    firstName: t("guest.firstName"),
    firstNamePlaceholder: t("guest.firstNamePlaceholder"),
    lastName: t("guest.lastName"),
    lastNamePlaceholder: t("guest.lastNamePlaceholder"),
    email: t("guest.email"),
    emailPlaceholder: t("guest.emailPlaceholder"),
    emailHint: t("guest.emailHint"),
    phone: t("guest.phone"),
    phonePlaceholder: t("guest.phonePlaceholder"),
    phoneHint: t("guest.phoneHint"),
    continueButton: t("payNow"),
    processing: t("redirecting"),
    firstNameRequired: t("guest.firstNameRequired"),
    lastNameRequired: t("guest.lastNameRequired"),
    emailRequired: t("guest.emailRequired"),
    emailInvalid: t("guest.emailInvalid"),
    phoneInvalid: t("guest.phoneInvalid"),
  }

  // Empty cart: nothing selected for this sub-event (post-hydration). Show a
  // minimal empty state + a link back to the selection step instead of a
  // method/guest form that could never be submitted.
  if (mounted && !hasSelection) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <h2 className="text-foreground text-xl font-bold">
          {t("emptyCartTitle")}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t("emptyCartDescription")}
        </p>
        <Button asChild size="lg">
          <Link href={`/${locale}/tickets/${documentId}/${screeningId}`}>
            {t("continue")}
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <OrderSummary
        eventTitle={eventTitle}
        showtime={showtimeLabel}
        items={items}
        currency={data?.currency ?? "TND"}
        labels={{
          subtotal: t("subtotal"),
          serviceFee: t("serviceFee"),
          total: t("total"),
        }}
      />

      <section aria-label={t("paymentMethod")} className="flex flex-col gap-3">
        <h2 className="text-foreground text-lg font-semibold">
          {t("paymentMethod")}
        </h2>
        <PaymentMethodSelector
          selectedMethod={method}
          onMethodChange={(m) => {
            setMethod(m)
            setMethodError(false)
          }}
          disabled={isSubmitting}
        />
        {methodError && (
          <p role="alert" className="text-destructive text-sm">
            {t("selectMethodError")}
          </p>
        )}
      </section>

      <GuestCheckoutForm
        className="w-full max-w-none"
        defaultValues={guestInfo ?? undefined}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        error={translatedError}
        labels={guestLabels}
      />
    </div>
  )
}

PaymentStep.displayName = "PaymentStep"
