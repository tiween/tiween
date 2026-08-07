import { Metadata } from "next"
import { EventsListing } from "@/features/events/components"
import { Locale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import type {
  EventsListingLabels,
  EventVenueOption,
} from "@/features/events/components"
import type { EventsSlice } from "@/lib/strapi-api/content/events-extended"
import type { StrapiRegion } from "@/lib/strapi-api/content/geography"

import { parseEventFilters } from "@/features/events/filters/filterParams"
import {
  buildDateRange,
  fetchEvents,
} from "@/lib/strapi-api/content/events-extended"
import { getRegions } from "@/lib/strapi-api/content/geography"
import { getVenuesForSelector } from "@/lib/strapi-api/content/venues"

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
    categoryFilter: {
      groupLabel: tEvents("listing.categoryFilter"),
      tabs: {
        all: tEvents("listing.categoryAll"),
        cinema: tEvents("listing.categoryCinema"),
        theater: tEvents("listing.categoryTheater"),
        shorts: tEvents("listing.categoryShorts"),
        music: tEvents("listing.categoryMusic"),
        exhibitions: tEvents("listing.categoryExhibitions"),
      },
    },
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
    venue: {
      groupLabel: tEvents("listing.venueFilter"),
      allVenues: tEvents("listing.allVenues"),
      searchVenue: tEvents("listing.searchVenue"),
      noVenueFound: tEvents("listing.noVenueFound"),
      truncatedHint: tEvents("listing.venuesTruncated"),
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
 * `/[locale]/events` — SSR listing route (Stories 3.2–3.6).
 *
 * Reads + validates the `category`/`date`/`region`/`city`/`venue` search
 * params, resolves the date to a Tunis-aware ISO `{startDate,endDate}` window,
 * fetches a flat, showtime-ordered, filtered event slice from the public API
 * (all categories by default; a discovery `category` token narrows to one
 * pillar), and hands off to the client island. Fail-soft: any upstream error
 * degrades to an empty slice (the fetcher is already fail-soft; the extra
 * try/catch guards the resolver/label path) so a bad window never 500s the
 * whole page.
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

  // Venues seed the venue filter combobox. Scoped to the ACTIVE location
  // filters but NOT to a venue type: the multi-category listing (Story 3.2)
  // surfaces theaters/concert halls/galleries too, so `type: null` un-scopes
  // the selector (homepage callers keep their own cinema default). The active
  // URL venue is force-included so the trigger can label it even when it falls
  // outside that scope or beyond the fetched page. Fail-soft: on any error the
  // listing still renders (with the venue filter hidden) rather than 500ing the
  // whole page — `getVenuesForSelector` is already fail-soft; the try/catch is
  // belt-and-suspenders.
  let venues: EventVenueOption[] = []
  let venuesTruncated = false
  try {
    const selector = await getVenuesForSelector(locale, {
      type: null,
      regionDocumentId: filters.region,
      cityDocumentId: filters.city,
      includeDocumentId: filters.venue,
    })
    venues = selector.venues
    venuesTruncated = selector.truncated
  } catch (error) {
    console.error("[EventsListingRoute] Error fetching venues:", error)
    venues = []
    venuesTruncated = false
  }

  // This feed can still be narrowed — by the active region/city and by the
  // fetched page — so a saved venue missing from it can never be distinguished
  // from one that was merely scoped out (out of region, or past the page cap).
  // Absence here therefore never means "deleted": the picker must skip the
  // restore and KEEP the stored value.
  const venuesScoped = true

  let slice: EventsSlice = EMPTY_SLICE
  try {
    slice = await fetchEvents({
      locale,
      category: filters.category,
      startDate,
      endDate,
      city: filters.city,
      region: filters.region,
      venue: filters.venue,
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
      venues={venues}
      venuesTruncated={venuesTruncated}
      venuesScoped={venuesScoped}
      activeFilters={filters}
      labels={labels}
    />
  )
}
