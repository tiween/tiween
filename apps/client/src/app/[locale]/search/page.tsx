import { Metadata } from "next"
import { Locale } from "next-intl"
import { setRequestLocale } from "next-intl/server"

import { getRegions } from "@/lib/strapi-api/content/geography"
import { POPULAR_SEARCHES, searchEvents } from "@/lib/strapi-api/content/search"

import { SearchPageClient } from "./SearchPageClient"

interface PageProps {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{
    q?: string
    category?: string
    city?: string
  }>
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const { q } = await searchParams

  const title = q
    ? `Recherche: ${q} | Tiween`
    : "Recherche d'événements | Tiween"

  const description = q
    ? `Résultats de recherche pour "${q}" sur Tiween - L'agenda culturel de la Tunisie`
    : "Recherchez des événements, films, concerts, pièces de théâtre et expositions en Tunisie"

  return {
    title,
    description,
    robots: {
      // Don't index search results pages to avoid duplicate content
      index: false,
      follow: true,
    },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Tiween",
      locale: locale === "ar" ? "ar_TN" : locale === "fr" ? "fr_TN" : "en_US",
    },
  }
}

export default async function SearchPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const { q: rawQuery, category, city } = await searchParams

  // Enable static rendering
  setRequestLocale(locale)

  // Normalize query
  const query = rawQuery?.trim() || ""

  // Fetch initial results if query exists
  let initialResults = null
  if (query) {
    initialResults = await searchEvents(locale, {
      query,
      category,
      cityDocumentId: city,
      limit: 20,
    })
  }

  // Fetch regions for location filter
  const regions = await getRegions(locale)

  return (
    <SearchPageClient
      locale={locale}
      initialQuery={query}
      initialResults={initialResults}
      initialCategory={category}
      initialCityId={city}
      regions={regions}
      popularSearches={POPULAR_SEARCHES}
    />
  )
}
