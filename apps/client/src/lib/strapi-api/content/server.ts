import "server-only"

import { cache } from "react"

import { mapCategoryToType } from "@/features/events/utils"

import type { StrapiEvent } from "@/features/events/types"

import { PublicStrapiClient } from "@/lib/strapi-api"

// Re-export for convenience
export type { StrapiEvent }

/**
 * Date filter type for event queries
 * - 'today': Events happening today
 * - 'tomorrow': Events happening tomorrow
 * - 'this-week': Events from today through end of week (Sunday)
 * - 'weekend': Events on Saturday and Sunday
 * - 'YYYY-MM-DD': Specific date
 */
export type DateFilterType =
  | "today"
  | "tomorrow"
  | "this-week"
  | "weekend"
  | string

/**
 * Calculate date range based on filter type
 * Returns { startDate, endDate } in YYYY-MM-DD format
 */
function getDateRange(
  dateFilter?: DateFilterType
): { startDate: string; endDate: string } | null {
  if (!dateFilter) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split("T")[0]

  switch (dateFilter) {
    case "today": {
      return { startDate: todayStr, endDate: todayStr }
    }

    case "tomorrow": {
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split("T")[0]
      return { startDate: tomorrowStr, endDate: tomorrowStr }
    }

    case "this-week": {
      // End of week is Sunday (day 0 in JS, but we want the coming Sunday)
      const endOfWeek = new Date(today)
      const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, ...
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek
      endOfWeek.setDate(today.getDate() + daysUntilSunday)
      return {
        startDate: todayStr,
        endDate: endOfWeek.toISOString().split("T")[0],
      }
    }

    case "weekend": {
      // Find the next Saturday and Sunday
      const dayOfWeek = today.getDay()
      const daysUntilSaturday = dayOfWeek === 6 ? 0 : (6 - dayOfWeek + 7) % 7
      const saturday = new Date(today)
      saturday.setDate(today.getDate() + daysUntilSaturday)

      const sunday = new Date(saturday)
      sunday.setDate(saturday.getDate() + 1)

      // If today is Saturday, start is today; if Sunday, start is today
      if (dayOfWeek === 6) {
        return {
          startDate: todayStr,
          endDate: sunday.toISOString().split("T")[0],
        }
      }
      if (dayOfWeek === 0) {
        return {
          startDate: todayStr,
          endDate: todayStr,
        }
      }

      return {
        startDate: saturday.toISOString().split("T")[0],
        endDate: sunday.toISOString().split("T")[0],
      }
    }

    default: {
      // Assume it's a specific date in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateFilter)) {
        return { startDate: dateFilter, endDate: dateFilter }
      }
      return null
    }
  }
}

/**
 * Build date filter object for Strapi query
 */
function buildDateFilter(dateFilter?: DateFilterType): Record<string, unknown> {
  const range = getDateRange(dateFilter)
  if (!range) {
    // No date filter - just ensure event hasn't ended
    return {
      endDate: { $gte: new Date().toISOString().split("T")[0] },
    }
  }

  // Filter events that overlap with the date range
  // An event overlaps if: startDate <= range.endDate AND endDate >= range.startDate
  return {
    startDate: { $lte: range.endDate },
    endDate: { $gte: range.startDate },
  }
}

/**
 * Common filter options for event queries
 */
export interface EventFilterOptions {
  category?: string
  dateFilter?: DateFilterType
  limit?: number
  offset?: number
}

/**
 * Fetch a single event by documentId with full details
 * Wrapped with React.cache() for request-level deduplication
 * (e.g., between generateMetadata and page component)
 */
export const getEventByDocumentId = cache(async function getEventByDocumentId(
  documentId: string,
  locale: string
): Promise<StrapiEvent | null> {
  try {
    const response = await PublicStrapiClient.fetchAPI(
      `/events-manager/events/${documentId}`,
      {
        locale,
        populate: {
          venue: {
            fields: [
              "name",
              "slug",
              "address",
              "coordinates",
              "phone",
              "email",
            ],
            populate: {
              city: {
                fields: ["name", "slug"],
                populate: {
                  region: {
                    fields: ["name", "slug"],
                  },
                },
              },
              images: {
                fields: ["url", "alternativeText", "formats"],
              },
            },
          },
          creativeWork: {
            fields: [
              "title",
              "originalTitle",
              "slug",
              "type",
              "synopsis",
              "duration",
              "releaseYear",
              "rating",
              "language",
              "country",
            ],
            populate: {
              poster: {
                fields: ["url", "alternativeText", "formats"],
              },
              backdrop: {
                fields: ["url", "alternativeText", "formats"],
              },
              genres: {
                fields: ["name", "slug"],
              },
              directors: {
                fields: ["name", "slug", "photo"],
                populate: {
                  photo: {
                    fields: ["url", "formats"],
                  },
                },
              },
              cast: {
                fields: ["name", "slug", "photo"],
                populate: {
                  photo: {
                    fields: ["url", "formats"],
                  },
                },
              },
            },
          },
          showtimes: {
            fields: [
              "time",
              "format",
              "language",
              "subtitles",
              "price",
              "ticketsAvailable",
              "ticketsSold",
            ],
            sort: ["time:asc"],
          },
        },
      },
      { next: { revalidate: 60 } }
    )

    return response.data || null
  } catch (error) {
    console.error("[getEventByDocumentId] Error fetching event:", error)
    return null
  }
})

/**
 * Parameters for fetching related events without needing the full event object
 * This allows parallel fetching of the event and related events
 */
export interface RelatedEventsParams {
  /** The documentId of the current event (to exclude from results) */
  excludeDocumentId: string
  /** The venue documentId to find events at the same venue */
  venueDocumentId?: string
  /** The creative work type to find similar events */
  creativeWorkType?: string
}

/**
 * Fetch related events by parameters (same venue or same creative work type)
 * This version accepts parameters directly instead of the full event object,
 * enabling parallel fetching with the main event query.
 */
export async function getRelatedEventsByParams(
  params: RelatedEventsParams,
  locale: string,
  limit = 4
): Promise<StrapiEvent[]> {
  const { excludeDocumentId, venueDocumentId, creativeWorkType } = params

  // Build $or conditions based on available params
  const orConditions: Record<string, unknown>[] = []
  if (venueDocumentId) {
    orConditions.push({ venue: { documentId: { $eq: venueDocumentId } } })
  }
  if (creativeWorkType) {
    orConditions.push({ creativeWork: { type: { $eq: creativeWorkType } } })
  }

  // If no conditions, return empty (can't find related events)
  if (orConditions.length === 0) {
    return []
  }

  try {
    const response = await PublicStrapiClient.fetchAPI(
      "/events-manager/events",
      {
        locale,
        filters: {
          documentId: { $ne: excludeDocumentId },
          status: { $in: ["scheduled", "active"] },
          endDate: { $gte: new Date().toISOString().split("T")[0] },
          $or: orConditions,
        },
        populate: {
          venue: {
            fields: ["name", "slug"],
          },
          creativeWork: {
            fields: ["title", "slug", "type", "duration"],
            populate: {
              poster: {
                fields: ["url", "formats"],
              },
            },
          },
        },
        sort: ["startDate:asc"],
        pagination: {
          page: 1,
          pageSize: limit,
        },
      },
      { next: { revalidate: 300 } }
    )

    return response.data || []
  } catch (error) {
    console.error(
      "[getRelatedEventsByParams] Error fetching related events:",
      error
    )
    return []
  }
}

/**
 * Fetch related events (same venue or same creative work type)
 * @deprecated Use getRelatedEventsByParams for parallel fetching
 */
export async function getRelatedEvents(
  event: StrapiEvent,
  locale: string,
  limit = 4
): Promise<StrapiEvent[]> {
  return getRelatedEventsByParams(
    {
      excludeDocumentId: event.documentId,
      venueDocumentId: event.venue?.documentId,
      creativeWorkType: event.creativeWork?.type,
    },
    locale,
    limit
  )
}

/**
 * Fetch featured events for the homepage hero carousel
 */
export async function getFeaturedEvents(
  locale: string,
  options?: { category?: string; dateFilter?: DateFilterType }
): Promise<StrapiEvent[]> {
  const { category, dateFilter } = options || {}

  try {
    // Build category filter based on creative work type
    const categoryFilter = category
      ? {
          creativeWork: {
            type: { $eq: mapCategoryToType(category) },
          },
        }
      : {}

    const response = await PublicStrapiClient.fetchAPI(
      "/events-manager/events",
      {
        locale,
        filters: {
          featured: { $eq: true },
          status: { $in: ["scheduled", "active"] },
          ...buildDateFilter(dateFilter),
          ...categoryFilter,
        },
        populate: {
          venue: {
            fields: ["name", "slug", "address"],
            populate: {
              city: {
                fields: ["name", "slug"],
              },
            },
          },
          creativeWork: {
            fields: [
              "title",
              "originalTitle",
              "slug",
              "type",
              "synopsis",
              "duration",
              "releaseYear",
              "rating",
            ],
            populate: {
              poster: {
                fields: ["url", "alternativeText", "formats"],
              },
              backdrop: {
                fields: ["url", "alternativeText"],
              },
              genres: {
                fields: ["name", "slug"],
              },
              directors: {
                fields: ["name", "slug"],
              },
            },
          },
        },
        sort: ["startDate:asc"],
        pagination: {
          page: 1,
          pageSize: 5,
        },
      },
      { next: { revalidate: 60 } }
    )

    return response.data || []
  } catch (error) {
    console.error("[getFeaturedEvents] Error fetching featured events:", error)
    return []
  }
}

/**
 * Fetch upcoming events with optional category and date filters
 */
export async function getUpcomingEvents(
  locale: string,
  options?: EventFilterOptions
): Promise<{ events: StrapiEvent[]; total: number }> {
  const { category, dateFilter, limit = 10, offset = 0 } = options || {}

  try {
    // Build category filter based on creative work type
    const categoryFilter = category
      ? {
          creativeWork: {
            type: {
              $eq: mapCategoryToType(category),
            },
          },
        }
      : {}

    const response = await PublicStrapiClient.fetchAPI(
      "/events-manager/events",
      {
        locale,
        filters: {
          status: { $in: ["scheduled", "active"] },
          ...buildDateFilter(dateFilter),
          ...categoryFilter,
        },
        populate: {
          venue: {
            fields: ["name", "slug"],
            populate: {
              city: {
                fields: ["name", "slug"],
              },
            },
          },
          creativeWork: {
            fields: ["title", "slug", "type", "duration", "rating"],
            populate: {
              poster: {
                fields: ["url", "alternativeText", "formats"],
              },
              genres: {
                fields: ["name", "slug"],
              },
            },
          },
          showtimes: {
            fields: ["time", "price", "ticketsAvailable"],
            sort: ["time:asc"],
            pagination: {
              limit: 1,
            },
          },
        },
        sort: ["startDate:asc"],
        pagination: {
          page: Math.floor(offset / limit) + 1,
          pageSize: limit,
        },
      },
      { next: { revalidate: 60 } }
    )

    return {
      events: response.data || [],
      total: response.meta?.pagination?.total || 0,
    }
  } catch (error) {
    console.error("[getUpcomingEvents] Error fetching upcoming events:", error)
    return { events: [], total: 0 }
  }
}

/**
 * Fetch events happening today (convenience wrapper)
 */
export async function getTodayEvents(
  locale: string,
  options?: { category?: string }
): Promise<StrapiEvent[]> {
  const { category } = options || {}
  const result = await getUpcomingEvents(locale, {
    category,
    dateFilter: "today",
    limit: 10,
  })
  return result.events
}
