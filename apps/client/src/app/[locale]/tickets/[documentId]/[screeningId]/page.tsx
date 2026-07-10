import { notFound } from "next/navigation"
import { Locale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { getEventByDocumentId } from "@/lib/strapi-api/content/server"

import { TicketTypesSection } from "./TicketTypesSection"

interface PageProps {
  params: Promise<{
    locale: Locale
    documentId: string
    screeningId: string
  }>
}

/**
 * Ticket-types route (Story 6.1): `/[locale]/tickets/[documentId]/[screeningId]`.
 *
 * The destination `EventDetailPage.handleShowtimeSelect` already links to. A
 * React Server Component: it reads the event for header context (title), builds
 * localized header text via `getTranslations`, and renders the client
 * `TicketTypesSection` which fetches the sub-event's tiers and owns the
 * loading / error / empty states.
 *
 * READ-ONLY presentation — selection/quantity (6.2) and payment (6.3) are out of
 * scope.
 */
export default async function TicketsPage({ params }: PageProps) {
  const { locale, documentId, screeningId } = await params

  // Enable static rendering for this locale segment.
  setRequestLocale(locale)

  // Event provides header context; a missing/unpublished event is a 404.
  const event = await getEventByDocumentId(documentId, locale)
  if (!event) {
    notFound()
  }

  const t = await getTranslations({ locale, namespace: "ticketing" })

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

        <TicketTypesSection screeningId={screeningId} />
      </div>
    </div>
  )
}
