import { Metadata } from "next"
import { EventsListing } from "@/features/events/components"
import { Locale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import type { EventsListingLabels } from "@/features/events/components"
import type { EventsSlice } from "@/lib/strapi-api/content/events-extended"
import type { StrapiRegion } from "@/lib/strapi-api/content/geography"

import { parseEventFilters } from "@/features/events/filters/filterParams"
import {
  buildDateRange,
  fetchEvents,
} from "@/lib/strapi-api/content/events-extended"
import { getRegions } from "@/lib/strapi-api/content/geography"

// Page-1 size for the MVP listing. Sized well above realistic per-date cinema
// volume so a single window is effectively complete; true load-more/pagination
// beyond page 1 is deferred (see deferred-work.md).
const LISTING_PAGE_SIZE = 60

const EMPTY_SLICE: EventsSlice = { events: [], total: 0 }

interface PageProps {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "events" })
  return {
    title: t("listing.title"),
  }
}

/** Build the localized label bundle for the listing island. */
async function buildLabels(locale: Locale): Promise<EventsListingLabels> {
  const [tEvents, tHome] = await Promise.all([
    getTranslations({ locale, namespace: "events" }),
    getTranslations({ locale, namespace: "home" }),
  ])
  return {
    title: tEvents("listing.title"),
    empty: tEvents("listing.empty"),
    dateFilter: {
      today: tHome("dateSelector.today"),
      tomorrow: tHome("dateSelector.tomorrow"),
      weekend: tEvents("listing.weekend"),
      custom: tHome("dateSelector.custom"),
      clear: tEvents("listing.clear"),
      groupLabel: tEvents("listing.dateFilter"),
    },
    location: {
      groupLabel: tEvents("listing.locationFilter"),
      regionPlaceholder: tEvents("listing.region"),
      cityPlaceholder: tEvents("listing.city"),
      allRegions: tEvents("listing.allRegions"),
      allCities: tEvents("listing.allCities"),
      clear: tEvents("listing.clear"),
    },
    card: {
      addToWatchlist: tEvents("addToWatchlist"),
      removeFromWatchlist: tEvents("removeFromWatchlist"),
      priceFrom: (price: string) => tEvents("priceFrom", { price }),
    },
  }
}

/**
 * `/[locale]/events` — SSR listing route (Story 3.3).
 *
 * Reads + validates the `date` search param, resolves it to a Tunis-aware ISO
 * `{startDate,endDate}` window, fetches a flat, showtime-ordered, date-filtered
 * event slice from the Story 3.1a public API, and hands off to the client
 * island. Fail-soft: any upstream error degrades to an empty slice (the fetcher
 * is already fail-soft; the extra try/catch guards the resolver/label path) so a
 * bad window never 500s the whole page.
 */
export default async function EventsListingRoute({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params
  const sp = await searchParams

  setRequestLocale(locale)

  const filters = parseEventFilters(sp)
  const { startDate, endDate } = buildDateRange(filters.date)

  // Geography seeds the location filter dropdowns. Fail-soft: on any error the
  // listing still renders (with an empty/hidden location filter) rather than
  // 500ing the whole page — same contract as the date/events path. `getRegions`
  // is already fail-soft (returns []); the try/catch is belt-and-suspenders.
  let regions: StrapiRegion[] = []
  try {
    regions = await getRegions(locale)
  } catch (error) {
    console.error("[EventsListingRoute] Error fetching regions:", error)
    regions = []
  }

  let slice: EventsSlice = EMPTY_SLICE
  try {
    slice = await fetchEvents({
      locale,
      startDate,
      endDate,
      city: filters.city,
      region: filters.region,
      sort: "startDateTime:asc",
      pageSize: LISTING_PAGE_SIZE,
    })
  } catch (error) {
    console.error("[EventsListingRoute] Error fetching events:", error)
    slice = EMPTY_SLICE
  }

  const labels = await buildLabels(locale)

  return (
    <EventsListing
      locale={locale}
      events={slice.events}
      regions={regions}
      activeFilters={filters}
      labels={labels}
    />
  )
}
