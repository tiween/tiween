import { Metadata } from "next"
import { EventsListing } from "@/features/events/components"
import { Locale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import type { EventsListingLabels } from "@/features/events/components"
import type { EventsSlice } from "@/lib/strapi-api/content/events-extended"

import { parseEventFilters } from "@/features/events/filters/filterParams"
import {
  buildDateRange,
  fetchEvents,
} from "@/lib/strapi-api/content/events-extended"

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

  let slice: EventsSlice = EMPTY_SLICE
  try {
    slice = await fetchEvents({
      locale,
      startDate,
      endDate,
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
      activeFilters={filters}
      labels={labels}
    />
  )
}
