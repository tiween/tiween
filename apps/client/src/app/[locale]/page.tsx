import { Metadata } from "next"
import { HomePageWithVenue } from "@/features/events/components/HomePage/HomePageWithVenue"
import { Locale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import type { CategoryType } from "@/features/events/components/CategoryTabs"
import type { VenueOption } from "@/features/events/components/VenueSelector/VenueSelector"
import type { HomePageWithVenueLabels } from "@/features/events/components/HomePage/HomePageWithVenue"
import type { StrapiEvent } from "@/features/events/types"

import { generateEventJsonLd, generateWebsiteJsonLd } from "@/lib/seo"
import {
  getFeaturedSlice,
  getThisWeekSlice,
  getTonightSlice,
  getTrendingSlice,
} from "@/lib/strapi-api/content/events-extended"
import { getRegions } from "@/lib/strapi-api/content/geography"
import { getVenuesForSelector } from "@/lib/strapi-api/content/venues"
import { JsonLd } from "@/components/seo"

// Base URL for structured data (mirrors the event-detail route).
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tiween.tn"

// Valid category values (selector chrome only on the homepage — the acted-on
// category filter shipped on `/[locale]/events` in Story 3.2; wiring these
// homepage tabs to it is deliberately out of that story's scope).
const validCategories: CategoryType[] = [
  "all",
  "cinema",
  "theater",
  "shorts",
  "music",
  "exhibitions",
]

const validDateFilters = ["today", "tomorrow", "this-week", "weekend"]

function isValidDateFilter(value?: string): boolean {
  if (!value) return false
  if (validDateFilters.includes(value)) return true
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "home" })
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  }
}

/** Build the localized label bundle for the homepage island. */
async function buildLabels(locale: Locale): Promise<HomePageWithVenueLabels> {
  const t = await getTranslations({ locale, namespace: "home" })
  return {
    featuredTitle: t("featuredTitle"),
    upcomingTitle: t("upcomingTitle"),
    todayTitle: t("todayTitle"),
    tonightTitle: t("tonightTitle"),
    thisWeekTitle: t("thisWeekTitle"),
    trendingTitle: t("trendingTitle"),
    bottomNav: {
      home: t("bottomNav.home"),
      search: t("bottomNav.search"),
      tickets: t("bottomNav.tickets"),
      account: t("bottomNav.account"),
      navigation: t("bottomNav.navigation"),
    },
    categoryTabs: {
      all: t("categoryTabs.all"),
      cinema: t("categoryTabs.cinema"),
      theater: t("categoryTabs.theater"),
      shorts: t("categoryTabs.shorts"),
      music: t("categoryTabs.music"),
      exhibitions: t("categoryTabs.exhibitions"),
    },
    dateSelector: {
      today: t("dateSelector.today"),
      tomorrow: t("dateSelector.tomorrow"),
      custom: t("dateSelector.custom"),
      selectDate: t("dateSelector.selectDate"),
    },
    eventSection: {
      seeAll: t("eventSection.seeAll"),
      noEvents: t("eventSection.noEvents"),
    },
    regionCitySelector: {
      allLocations: t("regionCitySelector.allLocations"),
      selectLocation: t("regionCitySelector.selectLocation"),
      allCities: t("regionCitySelector.allCities"),
    },
    venueSelector: {
      allVenues: t("venueSelector.allVenues"),
      selectVenue: t("venueSelector.selectVenue"),
      cinema: t("venueSelector.cinema"),
      theater: t("venueSelector.theater"),
      culturalCenter: t("venueSelector.culturalCenter"),
      museum: t("venueSelector.museum"),
      other: t("venueSelector.other"),
    },
  }
}

/** Dedupe events across curated slices and emit event JSON-LD for each. */
function buildEventsJsonLd(slices: StrapiEvent[][]): Record<string, unknown>[] {
  const seen = new Set<string>()
  const jsonLd: Record<string, unknown>[] = []
  for (const slice of slices) {
    for (const event of slice) {
      if (!event?.documentId || seen.has(event.documentId)) continue
      // schema.org Event requires a valid startDate — skip dateless events
      // rather than emit `"startDate": ""` (invalid structured data).
      if (!event.startDateTime && !event.startDate) continue
      seen.add(event.documentId)
      jsonLd.push(
        generateEventJsonLd(event, BASE_URL) as unknown as Record<
          string,
          unknown
        >
      )
    }
  }
  return jsonLd
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

  // Enable static rendering.
  setRequestLocale(locale)

  // Selector chrome state (reflects the URL; does not filter the curated feed).
  const category: CategoryType = validCategories.includes(
    rawCategory as CategoryType
  )
    ? (rawCategory as CategoryType)
    : "all"
  const activeDate = isValidDateFilter(rawDate) ? rawDate : undefined
  const cityDocumentId = isValidDocumentId(rawCity) ? rawCity : undefined
  const venueDocumentId = isValidDocumentId(rawVenue) ? rawVenue : undefined

  // Fetch the four curated slices + selector data in parallel. Each fetcher is
  // fail-soft (empty slice on upstream error), so one failing slice never 500s
  // the whole page.
  const [
    labels,
    regions,
    venuesResult,
    featured,
    tonight,
    thisWeek,
    trending,
  ] = await Promise.all([
    buildLabels(locale),
    getRegions(locale),
    // Cinema-scoped (the MVP catalogue), narrowed by the active city, with the
    // active URL venue force-included so it is always labelable (DW-24).
    getVenuesForSelector(locale, {
      type: "cinema",
      cityDocumentId,
      includeDocumentId: venueDocumentId,
    }),
    getFeaturedSlice(locale),
    getTonightSlice(locale),
    getThisWeekSlice(locale),
    getTrendingSlice(locale),
  ])
  // `VenueSelector` types each option's `type` as required, but the venue schema
  // does not — and `VenueSelector` already buckets a missing type under "other"
  // internally. Map rather than filter: dropping an untyped venue would discard
  // the very venue the server force-included for the active URL selection,
  // leaving the trigger showing "all venues" while the page stays filtered.
  const venues: VenueOption[] = venuesResult.venues.map((v) => ({
    ...v,
    type: v.type ?? "other",
  }))

  const eventsJsonLd = buildEventsJsonLd([
    featured.events,
    tonight.events,
    thisWeek.events,
    trending.events,
  ])
  const websiteJsonLd = generateWebsiteJsonLd(BASE_URL) as Record<
    string,
    unknown
  >

  return (
    <>
      <JsonLd data={websiteJsonLd} />
      {eventsJsonLd.length > 0 && <JsonLd data={eventsJsonLd} />}
      <HomePageWithVenue
        featuredEvents={featured.events}
        todayEvents={tonight.events}
        thisWeekEvents={thisWeek.events}
        trendingEvents={trending.events}
        regions={regions}
        venues={venues}
        activeCategory={category}
        activeDate={activeDate}
        activeCityId={cityDocumentId}
        activeVenueId={venueDocumentId}
        labels={labels}
      />
    </>
  )
}
