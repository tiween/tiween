import { Metadata } from "next"
import { notFound } from "next/navigation"
import { EventDetailPage } from "@/features/events/components"
import { mapTypeToCategory } from "@/features/events/utils"
import { Locale } from "next-intl"
import { setRequestLocale } from "next-intl/server"

import { generateBreadcrumbJsonLd, generateEventJsonLd } from "@/lib/seo"
import {
  getEventByDocumentId,
  getRelatedEvents,
} from "@/lib/strapi-api/content/server"
import { JsonLd } from "@/components/seo"

interface PageProps {
  params: Promise<{
    locale: Locale
    documentId: string
  }>
}

// Base URL for structured data
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tiween.tn"

/**
 * Generate dynamic metadata for SEO
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, documentId } = await params
  const event = await getEventByDocumentId(documentId, locale)

  if (!event) {
    return {
      title: "Événement non trouvé | Tiween",
    }
  }

  const work = event.creativeWork
  const title = work?.title || event.title
  const description =
    work?.synopsis?.slice(0, 160) ||
    `Découvrez ${title} sur Tiween - ${mapTypeToCategory(work?.type)}`

  const posterUrl = work?.poster?.formats?.large?.url || work?.poster?.url

  // Canonical URL
  const canonical = `${BASE_URL}/${locale}/events/${documentId}`

  return {
    title: `${title} | Tiween`,
    description,
    alternates: {
      canonical,
      languages: {
        ar: `${BASE_URL}/ar/events/${documentId}`,
        fr: `${BASE_URL}/fr/events/${documentId}`,
        en: `${BASE_URL}/en/events/${documentId}`,
      },
    },
    openGraph: {
      title: `${title} | Tiween`,
      description,
      type: "website",
      url: canonical,
      siteName: "Tiween",
      locale: locale === "ar" ? "ar_TN" : locale === "fr" ? "fr_TN" : "en_US",
      images: posterUrl
        ? [
            {
              url: posterUrl,
              width: 800,
              height: 1200,
              alt: title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Tiween`,
      description,
      images: posterUrl ? [posterUrl] : undefined,
      site: "@tiween",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  }
}

export default async function EventDetailRoute({ params }: PageProps) {
  const { locale, documentId } = await params

  // Enable static rendering
  setRequestLocale(locale)

  // Fetch event data
  const event = await getEventByDocumentId(documentId, locale)

  if (!event) {
    notFound()
  }

  // Fetch related events
  const relatedEvents = await getRelatedEvents(event, locale, 4)

  // Generate structured data
  const eventJsonLd = generateEventJsonLd(event, BASE_URL)

  // Generate breadcrumb structured data
  const categorySlug = event.creativeWork?.type || "events"
  const categoryLabel = mapTypeToCategory(event.creativeWork?.type)
  const breadcrumbJsonLd = generateBreadcrumbJsonLd(
    [
      { name: "Accueil", url: `/${locale}` },
      { name: categoryLabel, url: `/${locale}?category=${categorySlug}` },
      {
        name: event.creativeWork?.title || event.title,
        url: `/${locale}/events/${documentId}`,
      },
    ],
    BASE_URL
  )

  return (
    <>
      {/* Structured Data for SEO */}
      <JsonLd data={eventJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      {/* Page Content */}
      <EventDetailPage event={event} relatedEvents={relatedEvents} />
    </>
  )
}
