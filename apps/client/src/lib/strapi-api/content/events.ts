import "server-only"

import type { StrapiEvent } from "@/features/events/types"
import type { DateFilterType, EventsSlice } from "./events-extended"

import { buildDateRange, fetchEvents } from "./events-extended"

/**
 * Thin back-compat wrappers over the public events browse API (Story 3.1a).
 *
 * The public endpoint supports flat date/featured/pagination params only —
 * category/city filtering (Stories 3.2 / 3.4) is not implemented here, so those
 * options are accepted for signature compatibility but ignored. See
 * `events-extended.ts` for the curated homepage slices.
 */

export type { DateFilterType }

export interface EventFilterOptions {
  category?: string
  dateFilter?: DateFilterType
  cityDocumentId?: string
  limit?: number
  offset?: number
}

export async function getEventsWithFilters(
  locale: string,
  options?: EventFilterOptions
): Promise<EventsSlice> {
  const { dateFilter, limit = 10, offset = 0 } = options || {}
  const { startDate, endDate } = buildDateRange(dateFilter)
  return fetchEvents({
    locale,
    startDate,
    endDate,
    sort: "startDateTime:asc",
    page: Math.floor(offset / limit) + 1,
    pageSize: limit,
  })
}

export async function getFeaturedEventsWithFilters(
  locale: string,
  options?: {
    category?: string
    dateFilter?: DateFilterType
    cityDocumentId?: string
  }
): Promise<StrapiEvent[]> {
  const { dateFilter } = options || {}
  const { startDate, endDate } = buildDateRange(dateFilter)
  const slice = await fetchEvents({
    locale,
    featured: true,
    startDate,
    endDate,
    sort: "startDateTime:asc",
    pageSize: 5,
  })
  return slice.events
}
