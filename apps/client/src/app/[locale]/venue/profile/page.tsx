import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { Locale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { authOptions } from "@/lib/auth"

import { VenueProfileForm } from "./_components/VenueProfileForm"

interface PageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "venues.profile" })

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    // A private dashboard: never indexed.
    robots: { index: false, follow: false },
  }
}

/**
 * Venue-manager dashboard (Story 7.2).
 *
 * The venue manager's ONLY editing surface. The accounts story 7.1 provisions
 * are `plugin::users-permissions.user` records, which physically cannot
 * authenticate into Strapi's `/admin` (a disjoint `admin::user` store), so the
 * Next.js client is the only implementable panel — see the spec's Design Notes.
 *
 * Three independent gates, deliberately: the edge middleware (`authPages`)
 * stops an anonymous render, this `getServerSession` check is the server-side
 * belt, and Strapi's `plugin::venues.is-venue-manager` policy is the only one
 * that actually authorizes anything. A signed-in user WITHOUT the manager role
 * reaches this page and is answered by the empty state — the refusal is the
 * backend's, not the UI's.
 */
export default async function VenueProfilePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect(`/${locale}/auth/signin?callbackUrl=/${locale}/venue/profile`)
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <VenueProfileForm />
    </div>
  )
}
