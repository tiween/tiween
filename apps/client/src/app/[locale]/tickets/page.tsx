import { Metadata } from "next"
import { Locale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { MyTicketsView } from "./MyTicketsView"

interface PageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "ticketing" })

  return {
    title: t("myTickets.title"),
    description: t("myTickets.description"),
  }
}

/**
 * "Mes Billets" — `/[locale]/tickets` (Story 6.4).
 *
 * The destination of the bottom-nav "Billets" tab, which 404-ed until now.
 * Deliberately NOT auth-gated: guest checkout is a first-class path and ticket
 * viewing must require no login (epic constraint), so the client view resolves
 * both the JWT-scoped list and the locally-stored guest orders.
 */
export default async function MyTicketsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "ticketing" })

  return (
    <div className="bg-background min-h-screen pb-24">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <header className="mb-6">
          <h1 className="text-foreground text-2xl font-bold">
            {t("myTickets.title")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("myTickets.description")}
          </p>
        </header>

        <MyTicketsView locale={locale} />
      </div>
    </div>
  )
}
