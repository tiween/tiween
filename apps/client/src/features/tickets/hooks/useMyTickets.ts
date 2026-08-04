"use client"

import {
  myTicketKeys,
  UNRESOLVED_USER_ID,
} from "@/features/tickets/utils/ticketQueryKeys"
import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"

import type { TicketView } from "@/features/tickets/types"

import { PrivateStrapiClient } from "@/lib/strapi-api"

/**
 * The signed-in buyer's own tickets (Story 6.4).
 *
 * Reads `GET /ticketing/my-tickets` through the PRIVATE proxy, which attaches
 * the NextAuth JWT; the backend scopes the result to that user, so no id is
 * ever sent from the client.
 */

/**
 * The key factory lives in `utils/ticketQueryKeys` so cache-eviction consumers
 * (`lib/sign-out.ts`) can import it without pulling in the Strapi client.
 * Re-exported here because this is where callers expect to find it.
 */
export { myTicketKeys, UNRESOLVED_USER_ID }

export function useMyTickets() {
  const { data: session, status } = useSession()
  const isAuthenticated = status === "authenticated"
  const userId = session?.user?.userId
  const scope = userId ?? UNRESOLVED_USER_ID

  return useQuery({
    queryKey: myTicketKeys.list(scope),
    queryFn: async () => {
      const response = await PrivateStrapiClient.fetchAPI(
        "/ticketing/my-tickets",
        undefined,
        { method: "GET" },
        { useProxy: true }
      )
      return (response.data ?? []) as TicketView[]
    },
    // Never fire under an ambiguous session (loading, or an authenticated
    // session whose id has not materialised): `Session["user"].userId` is
    // optional, so firing on `isAuthenticated` alone would park a real result
    // on the shared `UNRESOLVED_USER_ID` scope, where the NEXT account on the
    // device could match it. Mirrors `useWatchlist`.
    enabled: isAuthenticated && !!userId,
    staleTime: 30 * 1000,
  })
}
