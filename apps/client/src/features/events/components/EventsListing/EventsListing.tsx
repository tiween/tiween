"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import type { EventCardLabels } from "../EventCard"
import type { EventDateFilterLabels } from "../EventDateFilter"
import type { DateFilterValue, EventFilters } from "../../filters/filterParams"
import type { StrapiEvent } from "../../types/strapi.types"
import type { Locale } from "next-intl"

import {
  parseDateValue,
  serializeDateValue,
  serializeEventFilters,
} from "../../filters/filterParams"
import { toEventCardEvent } from "../../utils"
import { EventCard } from "../EventCard"
import { EventDateFilter } from "../EventDateFilter"

export interface EventsListingLabels {
  /** Page heading, e.g. "Événements". */
  title: string
  /** Inline empty-state copy, e.g. "Aucun événement pour cette date". */
  empty: string
  dateFilter: EventDateFilterLabels
  card: EventCardLabels
}

export interface EventsListingProps {
  locale: Locale
  /** Server-fetched, date-filtered, showtime-ordered events (Strapi v5 shape). */
  events: StrapiEvent[]
  /** The active, validated filter state parsed from the URL. */
  activeFilters: EventFilters
  labels: EventsListingLabels
}

/**
 * Client island for the `/[locale]/events` listing. Renders the date filter +
 * a responsive `EventCard` grid from server-fetched props and owns the URL
 * writes: on filter change it serializes the filters and `router.push`es the
 * new query (`scroll: false`), letting the RSC re-fetch server-side. Reserved
 * `category`/`city`/`venue` params are preserved across date changes.
 */
export function EventsListing({
  locale,
  events,
  activeFilters,
  labels,
}: EventsListingProps) {
  const router = useRouter()

  const dateValue = React.useMemo<DateFilterValue>(
    () => parseDateValue(activeFilters.date),
    [activeFilters.date]
  )

  const handleDateChange = React.useCallback(
    (value: DateFilterValue) => {
      const nextFilters: EventFilters = {
        ...activeFilters,
        date: serializeDateValue(value),
      }
      const query = serializeEventFilters(nextFilters).toString()
      router.push(
        query ? `/${locale}/events?${query}` : `/${locale}/events`,
        { scroll: false }
      )
    },
    [activeFilters, locale, router]
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

        <div className="mb-6">
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
            <EventDateFilter
              value={dateValue}
              onChange={handleDateChange}
              labels={labels.dateFilter}
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
