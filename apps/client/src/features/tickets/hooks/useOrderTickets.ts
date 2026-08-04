"use client"

import { orderTicketKeys } from "@/features/tickets/utils/ticketQueryKeys"
import { useQuery } from "@tanstack/react-query"

import type { TicketView } from "@/features/tickets/types"

import { PublicStrapiClient } from "@/lib/strapi-api"

/**
 * One order's tickets, for a GUEST holding that order's access token
 * (Story 6.4).
 *
 * Reads `GET /ticketing/order-tickets/:orderNumber` through the public proxy.
 * The token is the whole authorization: the backend answers 403 for a wrong
 * token AND for an unknown order number, so this hook can never be used to
 * probe which order numbers exist.
 *
 * The token travels in the `x-order-access-token` REQUEST HEADER, never as a
 * query param: the proxy forwards `search` verbatim, so a `?token=` would be
 * written into Next, Strapi and CDN access logs — and this credential never
 * expires. The proxy also forwards every client header verbatim, so the header
 * reaches Strapi unchanged.
 */
export const ORDER_ACCESS_TOKEN_HEADER = "x-order-access-token"

/**
 * The key factory lives in `utils/ticketQueryKeys` so cache-eviction consumers
 * (`lib/sign-out.ts`) can import it without pulling in the Strapi client.
 * Re-exported here because this is where callers expect to find it.
 */
export { orderTicketKeys }

export function useOrderTickets(
  orderNumber: string | undefined,
  accessToken: string | undefined
) {
  const enabled = !!orderNumber && !!accessToken

  return useQuery({
    queryKey: orderTicketKeys.list(orderNumber ?? "", accessToken ?? ""),
    queryFn: async () => {
      const response = await PublicStrapiClient.fetchAPI(
        `/ticketing/order-tickets/${encodeURIComponent(orderNumber as string)}`,
        {},
        {
          method: "GET",
          headers: { [ORDER_ACCESS_TOKEN_HEADER]: accessToken as string },
        },
        { useProxy: true }
      )
      return (response.data ?? []) as TicketView[]
    },
    enabled,
    staleTime: 30 * 1000,
  })
}
