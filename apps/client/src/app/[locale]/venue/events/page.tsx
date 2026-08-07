import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { Locale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { authOptions } from "@/lib/auth"

import { VenueEventsList } from "./_components/VenueEventsList"

interface PageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "venues.events" })

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    // A private dashboard: never indexed.
    robots: { index: false, follow: false },
  }
}

/**
 * Venue-manager event list (Story 7.3) — the observable home of the story.
 *
 * Three independent gates, deliberately (the 7.2 doctrine): the edge
 * middleware (`/venue` prefix in `authPrefixes`) stops an anonymous render,
 * this `getServerSession` check is the server-side belt, and Strapi's
 * `plugin::venues.is-venue-manager` policy is the only one that actually
 * authorizes anything.
 */
export default async function VenueEventsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect(`/${locale}/auth/signin?callbackUrl=/${locale}/venue/events`)
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <VenueEventsList />
    </div>
  )
}
