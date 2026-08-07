import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { Locale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { authOptions } from "@/lib/auth"

import { VenueEventForm } from "./_components/VenueEventForm"

interface PageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "venues.events" })

  return {
    title: t("form.pageTitle"),
    description: t("pageDescription"),
    robots: { index: false, follow: false },
  }
}

/**
 * Event-creation page (Story 7.3) — the AC's single creation surface. Same
 * three-gate doctrine as the other `/venue/*` pages: the Next proxy, this
 * session guard, and the Strapi policy that actually authorizes.
 */
export default async function VenueEventNewPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect(`/${locale}/auth/signin?callbackUrl=/${locale}/venue/events/new`)
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <VenueEventForm />
    </div>
  )
}
