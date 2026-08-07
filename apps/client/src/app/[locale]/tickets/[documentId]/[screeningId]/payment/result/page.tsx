import { notFound } from "next/navigation"
import { Locale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { isTicketPurchaseEnabled } from "@/lib/feature-flags"

import { ResultView } from "./ResultView"

interface PageProps {
  params: Promise<{
    locale: Locale
    documentId: string
    screeningId: string
  }>
  searchParams: Promise<{ order?: string; status?: string }>
}

/**
 * Payment result route (Story 6.3):
 * `/[locale]/tickets/[documentId]/[screeningId]/payment/result`.
 *
 * Konnect redirects the browser here (with `?order=&status=`) after the hosted
 * payment. A React Server Component that renders header context and the client
 * `ResultView`, which re-confirms the AUTHORITATIVE status server-side and
 * shows a minimal success / error-with-retry outcome.
 */
export default async function PaymentResultPage({
  params,
  searchParams,
}: PageProps) {
  // Aggregation-only v1 (Story 3.12): no purchase route with the flag off.
  if (!isTicketPurchaseEnabled()) {
    notFound()
  }

  const { locale, documentId, screeningId } = await params
  const { order } = await searchParams

  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "ticketing" })

  const paymentHref = `/${locale}/tickets/${documentId}/${screeningId}/payment`
  // "Mes Billets" is the destination once a payment settles (Story 6.4) — the
  // tickets are the thing the buyer came for, not the homepage.
  const viewOrderHref = `/${locale}/tickets`

  return (
    <div className="bg-background min-h-screen pb-24">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <header className="mb-6">
          <h1 className="text-foreground text-2xl font-bold">
            {t("pageTitle")}
          </h1>
        </header>

        <ResultView
          orderNumber={order ?? null}
          locale={locale}
          paymentHref={paymentHref}
          viewOrderHref={viewOrderHref}
        />
      </div>
    </div>
  )
}
