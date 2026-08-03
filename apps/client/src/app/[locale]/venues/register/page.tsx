import { Metadata } from "next"
import { Locale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { VenueRegistrationForm } from "./_components/VenueRegistrationForm"

interface PageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "venues.register" })

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  }
}

/**
 * Public venue-registration page (Story 7.1).
 *
 * Deliberately unauthenticated: a venue owner has no account until this form
 * creates one. The client component owns its copy via
 * `useTranslations("venues.register")`.
 */
export default async function VenueRegisterPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className="container mx-auto px-4 py-10">
      <VenueRegistrationForm />
    </div>
  )
}
