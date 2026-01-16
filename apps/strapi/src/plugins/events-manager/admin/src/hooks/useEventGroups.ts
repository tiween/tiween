import { useCallback, useEffect, useState } from "react"
import { useFetchClient } from "@strapi/strapi/admin"

interface EventGroup {
  id: number
  documentId: string
  title: string
  shortTitle?: string
  slug: string
  type: "festival" | "season" | "series" | "retrospective" | "special"
  startDate?: string
  endDate?: string
  featured: boolean
}

interface EventGroupsResponse {
  results: EventGroup[]
  pagination: {
    page: number
    pageSize: number
    pageCount: number
    total: number
  }
}

export const useEventGroups = () => {
  const { get } = useFetchClient()
  const [eventGroups, setEventGroups] = useState<EventGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchEventGroups = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await get<EventGroupsResponse>(
        "/content-manager/collection-types/plugin::events-manager.event-group",
        {
          params: {
            page: 1,
            pageSize: 100,
            sort: "title:asc",
          },
        }
      )
      setEventGroups(response.data.results ?? [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [get])

  useEffect(() => {
    fetchEventGroups()
  }, [fetchEventGroups])

  return {
    eventGroups,
    isLoading,
    error,
    refetch: fetchEventGroups,
  }
}
