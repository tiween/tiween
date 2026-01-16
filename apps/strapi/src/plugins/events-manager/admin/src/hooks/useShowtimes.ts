import { useCallback, useEffect, useState } from "react"
import { useFetchClient } from "@strapi/strapi/admin"

interface CreativeWork {
  id: number
  title: string
  duration?: number
}

interface Event {
  id: number
  documentId: string
  title: string
  tmdbId?: number
  creativeWork?: CreativeWork
}

export interface ShowtimeWithEvent {
  id: number
  documentId: string
  datetime: string
  format: "VOST" | "VF" | "VO" | "THREE_D" | "IMAX"
  language: "ar" | "fr" | "en" | "other"
  subtitles: "ar" | "fr" | "en" | "none"
  price?: number
  premiere: boolean
  parentShowtimeId?: number
  event?: Event
}

interface ShowtimesResponse {
  results: ShowtimeWithEvent[]
  pagination: {
    page: number
    pageSize: number
    pageCount: number
    total: number
  }
}

interface UseShowtimesOptions {
  venueId: string
  startDate: string
  endDate: string
}

export const useShowtimes = ({
  venueId,
  startDate,
  endDate,
}: UseShowtimesOptions) => {
  const { get } = useFetchClient()

  const [showtimes, setShowtimes] = useState<ShowtimeWithEvent[]>([])
  const [pagination, setPagination] = useState<
    ShowtimesResponse["pagination"] | null
  >(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchShowtimes = useCallback(async () => {
    if (!venueId) {
      setShowtimes([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const params = {
        page: 1,
        pageSize: 500, // Get all showtimes in the date range
        sort: "datetime:asc",
        populate: ["event", "event.creativeWork"],
        filters: {
          venue: { id: venueId },
          datetime: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      }

      const response = await get<ShowtimesResponse>(
        "/content-manager/collection-types/plugin::events-manager.showtime",
        { params }
      )
      setShowtimes(response.data.results ?? [])
      setPagination(response.data.pagination ?? null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [get, venueId, startDate, endDate])

  useEffect(() => {
    fetchShowtimes()
  }, [fetchShowtimes])

  return {
    showtimes,
    pagination,
    isLoading,
    error,
    refetch: fetchShowtimes,
  }
}
