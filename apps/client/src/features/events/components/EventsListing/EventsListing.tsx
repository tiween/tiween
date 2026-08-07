"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

import type { EventCardLabels } from "../EventCard"
import type {
  CategoryFilterValue,
  EventCategoryFilterLabels,
} from "../EventCategoryFilter"
import type { EventDateFilterLabels } from "../EventDateFilter"
import type {
  EventLocationFilterLabels,
  EventLocationRegion,
  LocationFilterValue,
} from "../EventLocationFilter"
import type {
  EventVenueFilterLabels,
  EventVenueOption,
  VenueFilterValue,
} from "../EventVenueFilter"
import type { DateFilterValue, EventFilters } from "../../filters/filterParams"
import type { StrapiEvent } from "../../types/strapi.types"
import type { Locale } from "next-intl"

import { useCurrentUser } from "@/hooks/useUser"

import {
  parseDateValue,
  serializeDateValue,
  serializeEventFilters,
} from "../../filters/filterParams"
import { toEventCardEvent } from "../../utils"
import { EventCard } from "../EventCard"
import { EventCategoryFilter } from "../EventCategoryFilter"
import { EventDateFilter } from "../EventDateFilter"
import { EventLocationFilter } from "../EventLocationFilter"
import { EventVenueFilter } from "../EventVenueFilter"

export interface EventsListingLabels {
  /** Page heading, e.g. "Événements". */
  title: string
  /** Inline empty-state copy, e.g. "Aucun événement pour cette date". */
  empty: string
  categoryFilter: EventCategoryFilterLabels
  dateFilter: EventDateFilterLabels
  location: EventLocationFilterLabels
  venue: EventVenueFilterLabels
  card: EventCardLabels
}

export interface EventsListingProps {
  locale: Locale
  /** Server-fetched, date-filtered, showtime-ordered events (Strapi v5 shape). */
  events: StrapiEvent[]
  /** Regions (with nested cities) seeding the location filter dropdowns. */
  regions: EventLocationRegion[]
  /** Approved venues (name-sorted) seeding the venue filter combobox. */
  venues: EventVenueOption[]
  /** True when the venue catalogue is larger than the fetched `venues` page. */
  venuesTruncated?: boolean
  /** True when `venues` was narrowed server-side (region/city/type scope). */
  venuesScoped?: boolean
  /** The active, validated filter state parsed from the URL. */
  activeFilters: EventFilters
  labels: EventsListingLabels
}

/**
 * Client island for the `/[locale]/events` listing. Renders the category tabs,
 * the date/location/venue filters + a responsive `EventCard` grid from
 * server-fetched props and owns the URL writes: on filter change it serializes
 * the filters and `router.push`es the new query (`scroll: false`), letting the
 * RSC re-fetch server-side. The `category` (Story 3.2), date, location
 * (`region`/`city`) and `venue` filters all act and AND-combine.
 */
export function EventsListing({
  locale,
  events,
  regions,
  venues,
  venuesTruncated = false,
  venuesScoped = false,
  activeFilters,
  labels,
}: EventsListingProps) {
  const router = useRouter()

  // The signed-in user's stored default region seeds the location filter as its
  // lowest-precedence restore-on-mount fallback (URL > localStorage > this).
  // Gate on an authenticated session so anonymous visitors — the common case on
  // this public listing — never fire a `/users/me` request that just 401s.
  const { status } = useSession()
  const { data: currentUser } = useCurrentUser(status === "authenticated")

  const categoryValue = React.useMemo<CategoryFilterValue>(
    () => ({ category: activeFilters.category }),
    [activeFilters.category]
  )

  const dateValue = React.useMemo<DateFilterValue>(
    () => parseDateValue(activeFilters.date),
    [activeFilters.date]
  )

  const locationValue = React.useMemo<LocationFilterValue>(
    () => ({ region: activeFilters.region, city: activeFilters.city }),
    [activeFilters.region, activeFilters.city]
  )

  const venueValue = React.useMemo<VenueFilterValue>(
    () => ({ venue: activeFilters.venue }),
    [activeFilters.venue]
  )

  // A synchronously-updated mirror of the effective filters. The location and
  // venue filters each restore-on-mount independently — separate child effects
  // firing in the same commit (children before parents). If each handler built
  // its next URL from the `activeFilters` prop (stale/empty on that first
  // commit), the two `router.replace` calls would each omit the other's axis and
  // the last one would clobber the first — silently dropping a remembered filter.
  // Basing every change off this ref, updated as each handler runs, lets the
  // concurrent restores compose into one coherent URL. The effect resyncs it to
  // the URL-derived source of truth after each navigation settles.
  const latestFiltersRef = React.useRef<EventFilters>(activeFilters)
  React.useEffect(() => {
    latestFiltersRef.current = activeFilters
  }, [activeFilters])

  const pushFilters = React.useCallback(
    (nextFilters: EventFilters, options?: { replace?: boolean }) => {
      latestFiltersRef.current = nextFilters
      const query = serializeEventFilters(nextFilters).toString()
      const url = query ? `/${locale}/events?${query}` : `/${locale}/events`
      // The mount-time restore asks for `replace` (no extra history entry); a
      // user selection uses `push`.
      if (options?.replace) {
        router.replace(url, { scroll: false })
      } else {
        router.push(url, { scroll: false })
      }
    },
    [locale, router]
  )

  const handleCategoryChange = React.useCallback(
    (value: CategoryFilterValue, options?: { replace?: boolean }) => {
      pushFilters(
        { ...latestFiltersRef.current, category: value.category },
        options
      )
    },
    [pushFilters]
  )

  const handleDateChange = React.useCallback(
    (value: DateFilterValue) => {
      pushFilters({
        ...latestFiltersRef.current,
        date: serializeDateValue(value),
      })
    },
    [pushFilters]
  )

  const handleLocationChange = React.useCallback(
    (value: LocationFilterValue, options?: { replace?: boolean }) => {
      pushFilters(
        {
          ...latestFiltersRef.current,
          region: value.region,
          city: value.city,
        },
        options
      )
    },
    [pushFilters]
  )

  const handleVenueChange = React.useCallback(
    (value: VenueFilterValue, options?: { replace?: boolean }) => {
      pushFilters(
        { ...latestFiltersRef.current, venue: value.venue },
        options
      )
    },
    [pushFilters]
  )

  const handleEventClick = React.useCallback(
    (eventId: string | number) => {
      router.push(`/${locale}/events/${eventId}`)
    },
    [locale, router]
  )

  const cards = React.useMemo(
    () => events.map((event) => toEventCardEvent(event, locale)),
    [events, locale]
  )

  return (
    <div className="bg-background min-h-screen pb-20 lg:pb-0">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
        <h1 className="text-foreground mb-4 text-2xl font-semibold lg:text-3xl">
          {labels.title}
        </h1>

        <div className="mb-6 space-y-3">
          <div className="-mx-4 px-4">
            <EventCategoryFilter
              value={categoryValue}
              onChange={handleCategoryChange}
              labels={labels.categoryFilter}
            />
          </div>
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
            <EventDateFilter
              value={dateValue}
              onChange={handleDateChange}
              labels={labels.dateFilter}
            />
          </div>
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
            <EventLocationFilter
              regions={regions}
              value={locationValue}
              onChange={handleLocationChange}
              labels={labels.location}
              defaultRegion={currentUser?.defaultRegion}
            />
          </div>
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
            <EventVenueFilter
              venues={venues}
              truncated={venuesTruncated}
              scoped={venuesScoped}
              value={venueValue}
              onChange={handleVenueChange}
              labels={labels.venue}
            />
          </div>
        </div>

        {cards.length === 0 ? (
          <div
            role="status"
            className="text-muted-foreground flex items-center justify-center rounded-xl border border-dashed py-16 text-center text-sm"
          >
            {labels.empty}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
            {cards.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => handleEventClick(event.id)}
                labels={labels.card}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

EventsListing.displayName = "EventsListing"
