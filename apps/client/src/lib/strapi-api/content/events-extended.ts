import "server-only"

import type { StrapiEvent } from "@/features/events/types"
import type { Locale } from "next-intl"

import { PublicStrapiClient } from "@/lib/strapi-api"

/** Coerce a raw locale string to the frontend `Locale` union expected by the client. */
function asLocale(locale?: string): Locale | undefined {
  return locale as Locale | undefined
}

/**
 * Server-only fetchers for the public events browse API (Story 3.1a).
 *
 * The plugin exposes flat, allowlisted query params — `page`, `pageSize`,
 * `featured`, `eventStatus`, `startDate`/`endDate` (ISO datetime range on
 * `startDateTime`), `sort` (`startDateTime|title` × `asc|desc`), `locale`.
 * Unknown params are stripped server-side; there is NO raw `filters`/`populate`
 * pass-through, and responses are the Strapi v5 shape (`{ data, meta }`) with no
 * transformation layer. Category/venue/city filtering is out of scope for the
 * curated homepage (Stories 3.2 / 3.4 / 3.5).
 *
 * Every fetcher is fail-soft: an upstream error resolves to an empty slice so
 * the homepage degrades gracefully and never becomes a cold empty page.
 */

const EVENTS_PATH = "/events-manager/events"
const TRENDING_PATH = "/events-manager/events/trending"
const DEFAULT_SLICE_SIZE = 12
const REVALIDATE_SECONDS = 60

export type DateFilterType =
  | "today"
  | "tomorrow"
  | "this-week"
  | "weekend"
  | string

export interface EventFilterOptionsExtended {
  category?: string
  dateFilter?: DateFilterType
  cityDocumentId?: string
  venueDocumentId?: string
  limit?: number
  offset?: number
}

export type EventSort =
  | "startDateTime:asc"
  | "startDateTime:desc"
  | "title:asc"
  | "title:desc"

export interface EventQueryParams {
  locale?: string
  page?: number
  pageSize?: number
  featured?: boolean
  eventStatus?: "scheduled" | "cancelled" | "postponed" | "rescheduled"
  /** ISO datetime; lower bound on `startDateTime`. */
  startDate?: string
  /** ISO datetime; upper bound on `startDateTime`. */
  endDate?: string
  sort?: EventSort
}

export interface EventsSlice {
  events: StrapiEvent[]
  total: number
}

const EMPTY_SLICE: EventsSlice = { events: [], total: 0 }

// Curated "what's on" windows are anchored to the audience's calendar day, not
// the server's. Tunisia observes a fixed UTC+1 offset year-round (no DST), so we
// compute day boundaries in Africa/Tunis regardless of the host timezone —
// otherwise a UTC server mis-buckets late-night screenings around midnight.
const TUNIS_TZ = "Africa/Tunis"

/** `[year, month, day]` of `now` as seen on the Africa/Tunis calendar. */
function tunisDateParts(now: Date): [number, number, number] {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: TUNIS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
  const [y, m, d] = formatted.split("-").map(Number)
  return [y!, m!, d!]
}

/** Start (00:00:00.000 Africa/Tunis) of the day `addDays` from now, as ISO UTC. */
function tunisStartOfDay(now: Date, addDays: number): string {
  const [y, m, d] = tunisDateParts(now)
  // UTC hour -1 === 23:00 the previous day === 00:00 Africa/Tunis (UTC+1).
  return new Date(Date.UTC(y, m - 1, d + addDays, -1, 0, 0, 0)).toISOString()
}

/** End (23:59:59.999 Africa/Tunis) of the day `addDays` from now, as ISO UTC. */
function tunisEndOfDay(now: Date, addDays: number): string {
  const [y, m, d] = tunisDateParts(now)
  // UTC hour 22 === 23:00 Africa/Tunis; keep 59:59.999 for an inclusive bound.
  return new Date(
    Date.UTC(y, m - 1, d + addDays, 22, 59, 59, 999)
  ).toISOString()
}

/** Start of the current Tunisian day as an ISO datetime string. */
export function startOfToday(now: Date = new Date()): string {
  return tunisStartOfDay(now, 0)
}

/** Start of the Tunisian day `days` from now as an ISO datetime string. */
export function startOfDayInDays(days: number, now: Date = new Date()): string {
  return tunisStartOfDay(now, days)
}

/** End of the current Tunisian day (23:59:59.999) as an ISO datetime string. */
export function endOfToday(now: Date = new Date()): string {
  return tunisEndOfDay(now, 0)
}

/** End of the Tunisian day `days` from now (inclusive window) as an ISO datetime string. */
export function endOfDayInDays(days: number, now: Date = new Date()): string {
  return tunisEndOfDay(now, days)
}

/**
 * Normalize a Strapi v5 list response into an `EventsSlice`. Exported for tests.
 */
export function toEventsSlice(response: unknown): EventsSlice {
  const r = response as {
    data?: StrapiEvent[]
    meta?: { pagination?: { total?: number } }
  } | null
  const events = Array.isArray(r?.data) ? r.data : []
  const total = r?.meta?.pagination?.total ?? events.length
  return { events, total }
}

/**
 * Low-level list fetch against the public events endpoint. Fail-soft: returns an
 * empty slice (and logs) on any upstream error.
 */
export async function fetchEvents(
  params: EventQueryParams
): Promise<EventsSlice> {
  const {
    locale,
    page = 1,
    pageSize = DEFAULT_SLICE_SIZE,
    featured,
    eventStatus,
    startDate,
    endDate,
    sort,
  } = params

  try {
    const response = await PublicStrapiClient.fetchAPI(
      EVENTS_PATH,
      {
        locale: asLocale(locale),
        page,
        pageSize,
        ...(featured !== undefined ? { featured } : {}),
        ...(eventStatus ? { eventStatus } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(sort ? { sort } : {}),
      },
      { next: { revalidate: REVALIDATE_SECONDS } }
    )
    return toEventsSlice(response)
  } catch (error) {
    console.error("[fetchEvents] Error fetching events:", error)
    return EMPTY_SLICE
  }
}

// ---------------------------------------------------------------------------
// Curated homepage slices (Story 3.1b)
// ---------------------------------------------------------------------------

/** Featured / hero slice — upcoming events flagged `featured=true`. */
export async function getFeaturedSlice(
  locale: string,
  now: Date = new Date()
): Promise<EventsSlice> {
  return fetchEvents({
    locale,
    featured: true,
    startDate: startOfToday(now),
    sort: "startDateTime:asc",
    pageSize: DEFAULT_SLICE_SIZE,
  })
}

/** "Ce soir" slice — events happening today. */
export async function getTonightSlice(
  locale: string,
  now: Date = new Date()
): Promise<EventsSlice> {
  return fetchEvents({
    locale,
    startDate: startOfToday(now),
    endDate: endOfToday(now),
    sort: "startDateTime:asc",
    pageSize: DEFAULT_SLICE_SIZE,
  })
}

/**
 * "Cette semaine" slice — events from tomorrow through the next 7 days. The
 * lower bound starts at tomorrow (not today) so events already surfaced in the
 * "Ce soir" slice are not rendered a second time in this section.
 */
export async function getThisWeekSlice(
  locale: string,
  now: Date = new Date()
): Promise<EventsSlice> {
  return fetchEvents({
    locale,
    startDate: startOfDayInDays(1, now),
    endDate: endOfDayInDays(7, now),
    sort: "startDateTime:asc",
    pageSize: DEFAULT_SLICE_SIZE,
  })
}

/** "Tendances" slice — trending endpoint (sum(screening.ticketsSold) desc). */
export async function getTrendingSlice(
  locale: string,
  pageSize: number = DEFAULT_SLICE_SIZE
): Promise<EventsSlice> {
  try {
    const response = await PublicStrapiClient.fetchAPI(
      TRENDING_PATH,
      { locale: asLocale(locale), page: 1, pageSize },
      { next: { revalidate: REVALIDATE_SECONDS } }
    )
    return toEventsSlice(response)
  } catch (error) {
    console.error("[getTrendingSlice] Error fetching trending events:", error)
    return EMPTY_SLICE
  }
}

// ---------------------------------------------------------------------------
// Preset date-range helper (used by legacy homepage variants)
// ---------------------------------------------------------------------------

/**
 * Map a preset/`YYYY-MM-DD` date filter to an ISO `startDateTime` range. Returns
 * an open upper-bounded "from now" window when no filter is provided.
 */
export function buildDateRange(
  dateFilter?: DateFilterType,
  now: Date = new Date()
): { startDate?: string; endDate?: string } {
  const base = new Date(now)
  base.setHours(0, 0, 0, 0)

  const atEndOfDay = (d: Date) => {
    const e = new Date(d)
    e.setHours(23, 59, 59, 999)
    return e.toISOString()
  }

  switch (dateFilter) {
    case undefined:
    case "":
      return { startDate: now.toISOString() }
    case "today":
      return { startDate: base.toISOString(), endDate: atEndOfDay(base) }
    case "tomorrow": {
      const t = new Date(base)
      t.setDate(t.getDate() + 1)
      return { startDate: t.toISOString(), endDate: atEndOfDay(t) }
    }
    case "this-week":
      return { startDate: base.toISOString(), endDate: endOfDayInDays(7, now) }
    case "weekend": {
      const day = base.getDay()
      const daysUntilSat = day === 6 ? 0 : (6 - day + 7) % 7
      const sat = new Date(base)
      sat.setDate(base.getDate() + daysUntilSat)
      const sun = new Date(sat)
      sun.setDate(sat.getDate() + 1)
      return { startDate: sat.toISOString(), endDate: atEndOfDay(sun) }
    }
    default: {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateFilter)) {
        const parts = dateFilter.split("-")
        const day = new Date(
          Number(parts[0]),
          Number(parts[1]) - 1,
          Number(parts[2])
        )
        day.setHours(0, 0, 0, 0)
        return { startDate: day.toISOString(), endDate: atEndOfDay(day) }
      }
      return { startDate: now.toISOString() }
    }
  }
}

// ---------------------------------------------------------------------------
// Back-compat fetchers (legacy homepage variants page.city.tsx / page.venue.tsx)
//
// The public endpoint no longer supports category/city/venue filtering, so those
// options are ignored here; the date/featured/pagination params are honored.
// ---------------------------------------------------------------------------

export async function getEventsWithAllFilters(
  locale: string,
  options?: EventFilterOptionsExtended
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

export async function getFeaturedEventsWithAllFilters(
  locale: string,
  options?: {
    category?: string
    dateFilter?: DateFilterType
    cityDocumentId?: string
    venueDocumentId?: string
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

export async function getEventsByVenue(
  _venueDocumentId: string,
  locale: string,
  options?: { dateFilter?: DateFilterType; limit?: number }
): Promise<EventsSlice> {
  return getEventsWithAllFilters(locale, {
    dateFilter: options?.dateFilter,
    limit: options?.limit || 20,
  })
}
