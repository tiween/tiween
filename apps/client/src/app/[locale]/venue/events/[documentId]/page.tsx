import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { Locale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { authOptions } from "@/lib/auth"

import { VenueEventPreview } from "./_components/VenueEventPreview"

interface PageProps {
  params: Promise<{ locale: Locale; documentId: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "venues.events" })

  return {
    title: t("preview.pageTitle"),
    description: t("pageDescription"),
    robots: { index: false, follow: false },
  }
}

/**
 * Draft-preview page (Story 7.3): "preview how the event will appear",
 * rendered by the REAL detail component under a draft banner, with the
 * explicit Publish action. Same three-gate doctrine as the sibling pages.
 */
export default async function VenueEventPreviewPage({ params }: PageProps) {
  const { locale, documentId } = await params
  setRequestLocale(locale)

  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect(
      `/${locale}/auth/signin?callbackUrl=/${locale}/venue/events/${documentId}`
    )
  }

  return <VenueEventPreview documentId={documentId} />
}
