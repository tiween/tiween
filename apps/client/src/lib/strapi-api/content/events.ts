import "server-only"

import { mapCategoryToType } from "@/features/events/utils"

import type { StrapiEvent } from "@/features/events/types"

import { PublicStrapiClient } from "@/lib/strapi-api"

/**
 * Date filter type for event queries
 */
export type DateFilterType =
  | "today"
  | "tomorrow"
  | "this-week"
  | "weekend"
  | string

/**
 * Extended filter options including city filtering
 */
export interface EventFilterOptions {
  category?: string
  dateFilter?: DateFilterType
  cityDocumentId?: string
  limit?: number
  offset?: number
}

/**
 * Calculate date range based on filter type
 */
function getDateRange(
  dateFilter?: DateFilterType
): { startDate: string; endDate: string } | null {
  if (!dateFilter) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split("T")[0]

  switch (dateFilter) {
    case "today":
      return { startDate: todayStr, endDate: todayStr }

    case "tomorrow": {
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split("T")[0]
      return { startDate: tomorrowStr, endDate: tomorrowStr }
    }

    case "this-week": {
      const endOfWeek = new Date(today)
      const dayOfWeek = today.getDay()
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek
      endOfWeek.setDate(today.getDate() + daysUntilSunday)
      return {
        startDate: todayStr,
        endDate: endOfWeek.toISOString().split("T")[0],
      }
    }

    case "weekend": {
      const dayOfWeek = today.getDay()
      const daysUntilSaturday = dayOfWeek === 6 ? 0 : (6 - dayOfWeek + 7) % 7
      const saturday = new Date(today)
      saturday.setDate(today.getDate() + daysUntilSaturday)

      const sunday = new Date(saturday)
      sunday.setDate(saturday.getDate() + 1)

      if (dayOfWeek === 6) {
        return {
          startDate: todayStr,
          endDate: sunday.toISOString().split("T")[0],
        }
      }
      if (dayOfWeek === 0) {
        return { startDate: todayStr, endDate: todayStr }
      }

      return {
        startDate: saturday.toISOString().split("T")[0],
        endDate: sunday.toISOString().split("T")[0],
      }
    }

    default: {
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
    return {
      endDate: { $gte: new Date().toISOString().split("T")[0] },
    }
  }

  return {
    startDate: { $lte: range.endDate },
    endDate: { $gte: range.startDate },
  }
}

/**
 * Fetch upcoming events with category, date, AND city filters
 * This extends the base getUpcomingEvents with city filtering capability
 */
export async function getEventsWithFilters(
  locale: string,
  options?: EventFilterOptions
): Promise<{ events: StrapiEvent[]; total: number }> {
  const {
    category,
    dateFilter,
    cityDocumentId,
    limit = 10,
    offset = 0,
  } = options || {}

  try {
    // Build category filter
    const categoryFilter = category
      ? {
          creativeWork: {
            type: { $eq: mapCategoryToType(category) },
          },
        }
      : {}

    // Build city filter - filter events by venue's city
    const cityFilter = cityDocumentId
      ? {
          venue: {
            city: {
              documentId: { $eq: cityDocumentId },
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
          ...cityFilter,
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
    console.error("[getEventsWithFilters] Error fetching events:", error)
    return { events: [], total: 0 }
  }
}

/**
 * Fetch featured events with optional filters including city
 */
export async function getFeaturedEventsWithFilters(
  locale: string,
  options?: {
    category?: string
    dateFilter?: DateFilterType
    cityDocumentId?: string
  }
): Promise<StrapiEvent[]> {
  const { category, dateFilter, cityDocumentId } = options || {}

  try {
    const categoryFilter = category
      ? {
          creativeWork: {
            type: { $eq: mapCategoryToType(category) },
          },
        }
      : {}

    const cityFilter = cityDocumentId
      ? {
          venue: {
            city: {
              documentId: { $eq: cityDocumentId },
            },
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
          ...cityFilter,
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
    console.error(
      "[getFeaturedEventsWithFilters] Error fetching featured events:",
      error
    )
    return []
  }
}
