"use client"

import { useQuery } from "@tanstack/react-query"

import type { TicketTiersResponse } from "@/features/tickets/types"

import { PublicStrapiClient } from "@/lib/strapi-api"

/**
 * React-query hook for a sub-event's ticket tiers (Story 6.1).
 *
 * Reads the public endpoint
 * `GET /events-manager/showtimes/:documentId/ticket-tiers` through the
 * `PublicStrapiClient` proxy (public, unauthenticated). Returns the endpoint's
 * `data` payload typed as {@link TicketTiersResponse}. Factory query keys follow
 * the repo convention (see `useWatchlist`).
 */

/** Query key factory for ticket-tier queries. */
export const ticketTierKeys = {
  all: ["ticket-tiers"] as const,
  list: (subEventId: string) =>
    [...ticketTierKeys.all, "list", subEventId] as const,
}

export function useTicketTiers(subEventId: string | undefined) {
  return useQuery({
    queryKey: ticketTierKeys.list(subEventId ?? ""),
    queryFn: async () => {
      const response = await PublicStrapiClient.fetchAPI(
        `/events-manager/showtimes/${subEventId}/ticket-tiers`,
        undefined,
        { method: "GET" },
        { useProxy: true }
      )
      return response.data as TicketTiersResponse
    },
    enabled: !!subEventId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}
