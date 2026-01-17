/**
 * Home Page with Region/City Filtering
 *
 * This is an enhanced version of page.tsx that includes geographic filtering.
 * To use: rename this file to page.tsx (backup/remove the existing one first)
 */
import { Metadata } from "next"
import { HomePageWithCity } from "@/features/events/components/HomePage/HomePageWithCity"
import { Locale } from "next-intl"
import { setRequestLocale } from "next-intl/server"

import type { CategoryType } from "@/features/events/components/CategoryTabs"

import {
  getEventsWithFilters,
  getFeaturedEventsWithFilters,
} from "@/lib/strapi-api/content/events"
import { getRegions } from "@/lib/strapi-api/content/geography"
import { type DateFilterType } from "@/lib/strapi-api/content/server"

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

// Validate city documentId format (basic alphanumeric check)
function isValidCityId(value?: string): boolean {
  if (!value) return false
  // Strapi documentIds are typically alphanumeric strings
  return /^[a-zA-Z0-9_-]+$/.test(value)
}

interface PageProps {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ category?: string; date?: string; city?: string }>
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
  const cityDocumentId: string | undefined = isValidCityId(rawCity)
    ? rawCity
    : undefined

  // Enable static rendering
  setRequestLocale(locale)

  // Category filter for API calls (undefined for "all")
  const categoryFilter = category !== "all" ? category : undefined

  // Fetch regions and events data in parallel
  const [regions, featuredEvents, upcomingData] = await Promise.all([
    getRegions(locale),
    getFeaturedEventsWithFilters(locale, {
      category: categoryFilter,
      dateFilter,
      cityDocumentId,
    }),
    getEventsWithFilters(locale, {
      category: categoryFilter,
      dateFilter,
      cityDocumentId,
      limit: 10,
    }),
  ])

  // Only fetch today events when no date filter is active
  const todayEvents = dateFilter
    ? []
    : (
        await getEventsWithFilters(locale, {
          category: categoryFilter,
          dateFilter: "today",
          cityDocumentId,
          limit: 10,
        })
      ).events

  return (
    <HomePageWithCity
      featuredEvents={featuredEvents}
      upcomingEvents={upcomingData.events}
      todayEvents={todayEvents}
      totalUpcoming={upcomingData.total}
      regions={regions}
      activeCategory={category}
      activeDate={dateFilter}
      activeCityId={cityDocumentId}
    />
  )
}
