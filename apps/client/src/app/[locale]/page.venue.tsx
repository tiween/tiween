/**
 * Home Page with Region/City AND Venue Filtering
 *
 * This is the complete version of page.tsx with all location filters.
 * To use: rename this file to page.tsx (backup/remove the existing one first)
 */
import { Metadata } from "next"
import { HomePageWithVenue } from "@/features/events/components/HomePage/HomePageWithVenue"
import { Locale } from "next-intl"
import { setRequestLocale } from "next-intl/server"

import type { CategoryType } from "@/features/events/components/CategoryTabs"

import {
  getEventsWithAllFilters,
  getFeaturedEventsWithAllFilters,
} from "@/lib/strapi-api/content/events-extended"
import { getRegions } from "@/lib/strapi-api/content/geography"
import { type DateFilterType } from "@/lib/strapi-api/content/server"
import { getVenuesForSelector } from "@/lib/strapi-api/content/venues"

export const metadata: Metadata = {
  title: "Tiween - Découvrez les événements culturels en Tunisie",
  description:
    "Tiween est la plateforme de billetterie culturelle en Tunisie. Découvrez les films, pièces de théâtre, concerts et expositions près de chez vous.",
}

// Valid category values
const validCategories: CategoryType[] = [
  "all",
  "cinema",
  "theater",
  "shorts",
  "music",
  "exhibitions",
]

// Valid preset date filter values
const validDateFilters = ["today", "tomorrow", "this-week", "weekend"]

// Validate date filter - accepts presets or YYYY-MM-DD format
function isValidDateFilter(value?: string): value is DateFilterType {
  if (!value) return false
  if (validDateFilters.includes(value)) return true
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

// Validate documentId format (alphanumeric with hyphens/underscores)
function isValidDocumentId(value?: string): boolean {
  if (!value) return false
  return /^[a-zA-Z0-9_-]+$/.test(value)
}

interface PageProps {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{
    category?: string
    date?: string
    city?: string
    venue?: string
  }>
}

export default async function HomePageRoute({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params
  const {
    category: rawCategory,
    date: rawDate,
    city: rawCity,
    venue: rawVenue,
  } = await searchParams

  // Validate and normalize category
  const category: CategoryType = validCategories.includes(
    rawCategory as CategoryType
  )
    ? (rawCategory as CategoryType)
    : "all"

  // Validate and normalize date filter
  const dateFilter: DateFilterType | undefined = isValidDateFilter(rawDate)
    ? rawDate
    : undefined

  // Validate and normalize city filter
  const cityDocumentId: string | undefined = isValidDocumentId(rawCity)
    ? rawCity
    : undefined

  // Validate and normalize venue filter
  const venueDocumentId: string | undefined = isValidDocumentId(rawVenue)
    ? rawVenue
    : undefined

  // Enable static rendering
  setRequestLocale(locale)

  // Category filter for API calls (undefined for "all")
  const categoryFilter = category !== "all" ? category : undefined

  // Fetch regions, venues, and events data in parallel
  const [regions, venues, featuredEvents, upcomingData] = await Promise.all([
    getRegions(locale),
    getVenuesForSelector(locale, cityDocumentId),
    getFeaturedEventsWithAllFilters(locale, {
      category: categoryFilter,
      dateFilter,
      cityDocumentId,
      venueDocumentId,
    }),
    getEventsWithAllFilters(locale, {
      category: categoryFilter,
      dateFilter,
      cityDocumentId,
      venueDocumentId,
      limit: 10,
    }),
  ])

  // Only fetch today events when no date filter is active
  const todayEvents = dateFilter
    ? []
    : (
        await getEventsWithAllFilters(locale, {
          category: categoryFilter,
          dateFilter: "today",
          cityDocumentId,
          venueDocumentId,
          limit: 10,
        })
      ).events

  return (
    <HomePageWithVenue
      featuredEvents={featuredEvents}
      upcomingEvents={upcomingData.events}
      todayEvents={todayEvents}
      totalUpcoming={upcomingData.total}
      regions={regions}
      venues={venues}
      activeCategory={category}
      activeDate={dateFilter}
      activeCityId={cityDocumentId}
      activeVenueId={venueDocumentId}
    />
  )
}
