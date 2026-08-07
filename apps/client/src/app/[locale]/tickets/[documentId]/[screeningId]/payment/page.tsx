import { notFound } from "next/navigation"
import { Locale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { isTicketPurchaseEnabled } from "@/lib/feature-flags"
import { getEventByDocumentId } from "@/lib/strapi-api/content/server"
import { formatShowtimeLabel } from "@/features/tickets/utils/formatShowtimeLabel"

import { PaymentStep } from "./PaymentStep"

interface PageProps {
  params: Promise<{
    locale: Locale
    documentId: string
    screeningId: string
  }>
}

/**
 * Payment-step placeholder route (Story 6.2):
 * `/[locale]/tickets/[documentId]/[screeningId]/payment`.
 *
 * A React Server Component that renders header context and the client
 * `PaymentStep` (Story 6.3), which recaps the persisted selection, collects a
 * Konnect payment method + guest contact, and redirects to the hosted payUrl.
 * No payment logic lives in this server component.
 */
export default async function PaymentPage({ params }: PageProps) {
  // Aggregation-only v1 (Story 3.12): no purchase route with the flag off.
  if (!isTicketPurchaseEnabled()) {
    notFound()
  }

  const { locale, documentId, screeningId } = await params

  setRequestLocale(locale)

  const event = await getEventByDocumentId(documentId, locale)
  if (!event) {
    notFound()
  }

  const t = await getTranslations({ locale, namespace: "ticketing" })

  const screening = event.screenings?.find((s) => s.documentId === screeningId)
  const showtimeLabel = formatShowtimeLabel(screening?.startDateTime, locale)

  return (
    <div className="bg-background min-h-screen pb-24">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <header className="mb-6">
          <h1 className="text-foreground text-2xl font-bold">
            {t("payNow")}
          </h1>
          {event.title && (
            <p className="text-muted-foreground mt-1 text-sm">{event.title}</p>
          )}
        </header>

        <PaymentStep
          screeningId={screeningId}
          documentId={documentId}
          locale={locale}
          eventTitle={event.title ?? ""}
          showtimeLabel={showtimeLabel}
        />
      </div>
    </div>
  )
}
