import { useCallback, useEffect, useState } from "react"
import { useFetchClient } from "@strapi/strapi/admin"

interface Venue {
  id: number
  documentId: string
  name: string
  slug: string
  address?: string
}

interface VenuesResponse {
  results: Venue[]
  pagination: {
    page: number
    pageSize: number
    pageCount: number
    total: number
  }
}

export const useVenues = () => {
  const { get } = useFetchClient()
  const [venues, setVenues] = useState<Venue[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchVenues = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await get<VenuesResponse>(
        "/content-manager/collection-types/plugin::events-manager.venue",
        {
          params: {
            page: 1,
            pageSize: 100,
            sort: "name:asc",
          },
        }
      )
      setVenues(response.data.results ?? [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [get])

  useEffect(() => {
    fetchVenues()
  }, [fetchVenues])

  return {
    venues,
    isLoading,
    error,
    refetch: fetchVenues,
  }
}
