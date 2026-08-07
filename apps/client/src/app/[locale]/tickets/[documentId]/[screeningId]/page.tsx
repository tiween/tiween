import { notFound } from "next/navigation"
import { Locale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { isTicketPurchaseEnabled } from "@/lib/feature-flags"
import { getEventByDocumentId } from "@/lib/strapi-api/content/server"
import { formatShowtimeLabel } from "@/features/tickets/utils/formatShowtimeLabel"

import { TicketTypesSection } from "./TicketTypesSection"

interface PageProps {
  params: Promise<{
    locale: Locale
    documentId: string
    screeningId: string
  }>
}

/**
 * Ticket-selection route (Stories 6.1 + 6.2):
 * `/[locale]/tickets/[documentId]/[screeningId]`.
 *
 * A React Server Component: it reads the event for header/summary context
 * (title, showtime label), builds localized header text via `getTranslations`,
 * and renders the client `TicketTypesSection` which fetches the sub-event's
 * tiers and owns the loading / error / empty states plus the interactive
 * quantity selection (Story 6.2). Payment (Story 6.3) is still out of scope —
 * Continue lands on a labelled placeholder route.
 */
export default async function TicketsPage({ params }: PageProps) {
  // Aggregation-only v1 (Story 3.12): no purchase route with the flag off.
  // Belt and braces under the middleware rewrite — this holds even if the
  // middleware matcher misses (matcher configs drift).
  if (!isTicketPurchaseEnabled()) {
    notFound()
  }

  const { locale, documentId, screeningId } = await params

  // Enable static rendering for this locale segment.
  setRequestLocale(locale)

  // Event provides header context; a missing/unpublished event is a 404.
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
            {t("pageTitle")}
          </h1>
          {event.title && (
            <p className="text-muted-foreground mt-1 text-sm">{event.title}</p>
          )}
        </header>

        <TicketTypesSection
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
