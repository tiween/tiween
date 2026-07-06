import { Metadata } from "next"
import { notFound } from "next/navigation"
import { EventDetailPage } from "@/features/events/components"
import { getEventFilm, mapTypeToCategory } from "@/features/events/utils"
import { Locale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import type { EventDetailPageLabels } from "@/features/events/components"

import { generateBreadcrumbJsonLd, generateEventJsonLd } from "@/lib/seo"
import {
  getEventByDocumentId,
  getRelatedEventsByParams,
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

/** Strip HTML/markup tags from a richtext string for meta descriptions. */
function stripMarkup(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Generate dynamic metadata for SEO — sourced from the real film
 * (`screenings[0].movie`) with fallbacks to the event's own fields.
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, documentId } = await params
  const event = await getEventByDocumentId(documentId, locale)

  if (!event) {
    const tErrors = await getTranslations({ locale, namespace: "errors" })
    return {
      title: `${tErrors("notFound.title")} | Tiween`,
    }
  }

  const film = getEventFilm(event)
  const title = film?.title || event.title
  const rawDescription = film?.synopsis || event.description || ""
  const description = rawDescription
    ? stripMarkup(rawDescription).slice(0, 160)
    : undefined

  const posterUrl =
    film?.poster?.formats?.large?.url ||
    film?.poster?.url ||
    event.images?.[0]?.formats?.large?.url ||
    event.images?.[0]?.url

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

  // Fetch event data (deduplicated with generateMetadata via Next.js cache)
  const event = await getEventByDocumentId(documentId, locale)

  if (!event) {
    notFound()
  }

  // Related = upcoming events at the same venue (real fields; excludes current).
  const relatedEvents = await getRelatedEventsByParams(
    {
      excludeDocumentId: documentId,
      venueDocumentId: event.venue?.documentId,
    },
    locale,
    4
  )

  // Localized detail labels (next-intl — no hardcoded French in the page).
  const t = await getTranslations({ locale, namespace: "events" })
  const labels: EventDetailPageLabels = {
    back: t("back"),
    share: t("share"),
    addToWatchlist: t("addToWatchlist"),
    removeFromWatchlist: t("removeFromWatchlist"),
    synopsis: t("synopsis"),
    showMore: t("showMore"),
    showLess: t("showLess"),
    showtimes: t("showtimes"),
    noShowtimes: t("noShowtimes"),
    buyTickets: t("buyTickets"),
    priceFrom: (price: string) => t("priceFrom", { price }),
    ticketsAvailable: (count: number) => t("ticketsAvailable", { count }),
    soldOut: t("soldOut"),
    cast: t("cast"),
    directors: t("directors"),
    relatedEvents: t("relatedEvents"),
    minutes: t("minutes"),
    venue: t("venue"),
    dateRange: t.raw("dateRange") as string,
  }

  // Generate structured data (dual-schema aware — kept as-is).
  const eventJsonLd = generateEventJsonLd(event, BASE_URL)

  // Breadcrumb: real movie title/type.
  const film = getEventFilm(event)
  const categorySlug = film?.type || event.category || "events"
  const categoryLabel = mapTypeToCategory(film?.type)
  const breadcrumbJsonLd = generateBreadcrumbJsonLd(
    [
      { name: t("home"), url: `/${locale}` },
      { name: categoryLabel, url: `/${locale}?category=${categorySlug}` },
      {
        name: film?.title || event.title,
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
      <EventDetailPage
        event={event}
        relatedEvents={relatedEvents}
        labels={labels}
      />
    </>
  )
}
