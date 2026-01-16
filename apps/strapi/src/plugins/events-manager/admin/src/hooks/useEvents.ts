import { useCallback, useEffect, useState } from "react"
import { useFetchClient } from "@strapi/strapi/admin"

interface Venue {
  id: number
  name: string
}

interface Event {
  id: number
  documentId: string
  title: string
  slug: string
  startDate: string
  endDate?: string
  status: "scheduled" | "cancelled" | "completed"
  publishedAt: string | null
  venue?: Venue
  tmdbId?: number
}

interface EventsResponse {
  results: Event[]
  pagination: {
    page: number
    pageSize: number
    pageCount: number
    total: number
  }
}

interface UseEventsOptions {
  status?: "published" | "draft"
  page?: number
  pageSize?: number
  venueId?: string
}

export const useEvents = (options: UseEventsOptions = {}) => {
  const { get } = useFetchClient()
  const { status, page = 1, pageSize = 10, venueId } = options

  const [events, setEvents] = useState<Event[]>([])
  const [pagination, setPagination] = useState<
    EventsResponse["pagination"] | null
  >(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchEvents = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params: Record<string, unknown> = {
        page,
        pageSize,
        sort: "startDate:desc",
        populate: ["venue"],
      }

      // Filter by publication status
      if (status === "published") {
        params.filters = { publishedAt: { $notNull: true } }
      } else if (status === "draft") {
        params.filters = { publishedAt: { $null: true } }
      }

      // Filter by venue
      if (venueId) {
        params.filters = {
          ...((params.filters as object) || {}),
          venue: { id: venueId },
        }
      }

      const response = await get<EventsResponse>(
        "/content-manager/collection-types/plugin::events-manager.event",
        { params }
      )
      setEvents(response.data.results ?? [])
      setPagination(response.data.pagination ?? null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [get, status, page, pageSize, venueId])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return {
    events,
    pagination,
    isLoading,
    error,
    refetch: fetchEvents,
  }
}
