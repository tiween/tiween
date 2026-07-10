import { notFound } from "next/navigation"
import { Locale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { getEventByDocumentId } from "@/lib/strapi-api/content/server"
import { formatShowtimeLabel } from "@/features/tickets/utils/formatShowtimeLabel"

import { PaymentStepPreview } from "./PaymentStepPreview"

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
 * `PaymentStepPreview`, which recaps the persisted selection. This is a minimal
 * placeholder that kills the dead Continue link — Story 6.3 replaces it with the
 * real Konnect payment step. No payment logic lives here.
 */
export default async function PaymentPage({ params }: PageProps) {
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
            {t("paymentComingTitle")}
          </h1>
          {event.title && (
            <p className="text-muted-foreground mt-1 text-sm">{event.title}</p>
          )}
        </header>

        <PaymentStepPreview
          screeningId={screeningId}
          eventTitle={event.title ?? ""}
          showtimeLabel={showtimeLabel}
        />
      </div>
    </div>
  )
}
