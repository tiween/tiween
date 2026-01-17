"use client"

import * as React from "react"

import type { Coordinates } from "@/lib/geolocation"
import type { StrapiEvent } from "../types/strapi.types"

export interface NearbyEvent extends StrapiEvent {
  distance: number
}

export interface UseNearbyEventsResult {
  events: NearbyEvent[]
  total: number
  isLoading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => void
}

export interface UseNearbyEventsOptions {
  locale?: string
  category?: string
  limit?: number
  radius?: number
  enabled?: boolean
}

/**
 * Hook for fetching events sorted by distance from user's location
 *
 * @param location - User's coordinates (null = disabled)
 * @param options - Filtering and pagination options
 *
 * @example
 * ```tsx
 * function NearbyEventsList() {
 *   const { position } = useGeolocation()
 *   const { events, isLoading, hasMore, loadMore } = useNearbyEvents(position, {
 *     locale: "fr",
 *     category: "cinema",
 *   })
 *
 *   return (
 *     <div>
 *       {events.map(event => (
 *         <EventCard
 *           key={event.documentId}
 *           event={event}
 *           distance={event.distance}
 *         />
 *       ))}
 *       {hasMore && <button onClick={loadMore}>Load More</button>}
 *     </div>
 *   )
 * }
 * ```
 */
export function useNearbyEvents(
  location: Coordinates | null,
  options: UseNearbyEventsOptions = {}
): UseNearbyEventsResult {
  const {
    locale = "fr",
    category,
    limit = 20,
    radius = 50,
    enabled = true,
  } = options

  const [events, setEvents] = React.useState<NearbyEvent[]>([])
  const [total, setTotal] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [offset, setOffset] = React.useState(0)

  // Fetch events when location changes or options change
  React.useEffect(() => {
    if (!location || !enabled) {
      setEvents([])
      setTotal(0)
      setError(null)
      return
    }

    const fetchEvents = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          lat: String(location.latitude),
          lng: String(location.longitude),
          locale,
          limit: String(limit),
          offset: "0",
          radius: String(radius),
        })

        if (category) {
          params.set("category", category)
        }

        const response = await fetch(`/api/events/nearby?${params.toString()}`)

        if (!response.ok) {
          throw new Error("Failed to fetch nearby events")
        }

        const data = await response.json()

        setEvents(data.events || [])
        setTotal(data.total || 0)
        setOffset(data.events?.length || 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
        setEvents([])
        setTotal(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [
    location?.latitude,
    location?.longitude,
    locale,
    category,
    limit,
    radius,
    enabled,
  ])

  // Load more handler
  const loadMore = React.useCallback(async () => {
    if (!location || isLoading || events.length >= total) return

    setIsLoading(true)

    try {
      const params = new URLSearchParams({
        lat: String(location.latitude),
        lng: String(location.longitude),
        locale,
        limit: String(limit),
        offset: String(offset),
        radius: String(radius),
      })

      if (category) {
        params.set("category", category)
      }

      const response = await fetch(`/api/events/nearby?${params.toString()}`)

      if (!response.ok) {
        throw new Error("Failed to load more events")
      }

      const data = await response.json()

      setEvents((prev) => [...prev, ...(data.events || [])])
      setOffset((prev) => prev + (data.events?.length || 0))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }, [
    location,
    isLoading,
    events.length,
    total,
    locale,
    category,
    limit,
    offset,
    radius,
  ])

  const hasMore = events.length < total

  return {
    events,
    total,
    isLoading,
    error,
    hasMore,
    loadMore,
  }
}
