"use client"

import * as React from "react"

import type { PaymentMethod } from "@/features/tickets/components"
import type { TicketTierType } from "@/features/tickets/types"

import { PublicStrapiClient } from "@/lib/strapi-api"
import { extractErrorCode } from "@/features/tickets/utils/extractErrorCode"

/** POST body for the checkout endpoint (Story 6.3). `userId` is never sent. */
export interface CreateOrderPayload {
  eventId: string
  screeningId?: string
  performanceId?: string
  paymentMethod: PaymentMethod
  firstName: string
  lastName: string
  email: string
  phone?: string
  locale?: string
  tickets: Array<{ type: TicketTierType; price: number }>
}

export interface CreateOrderResult {
  orderNumber: string
  payUrl: string
  /**
   * Per-order credential that lets a GUEST read their own tickets later
   * (Story 6.4). Store it locally — never put it in a URL that leaves the
   * origin.
   */
  accessToken: string
}

export interface UseCreateOrder {
  createOrder: (payload: CreateOrderPayload) => Promise<CreateOrderResult>
  isSubmitting: boolean
  /** Last backend error CODE (for `t(errorCode)`), or null. */
  errorCode: string | null
}

/**
 * Checkout hook (Story 6.3): POST `/ticketing/orders` through the public proxy
 * to create an order + initialize a Konnect payment. Returns
 * `{ orderNumber, payUrl }`; the caller redirects the browser to `payUrl`.
 *
 * On failure the backend error CODE is surfaced via `errorCode` for i18n and
 * the original error is rethrown so the caller can skip the redirect.
 */
export function useCreateOrder(): UseCreateOrder {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errorCode, setErrorCode] = React.useState<string | null>(null)

  const createOrder = React.useCallback(
    async (payload: CreateOrderPayload): Promise<CreateOrderResult> => {
      setIsSubmitting(true)
      setErrorCode(null)
      try {
        const response = await PublicStrapiClient.fetchAPI(
          "/ticketing/orders",
          undefined,
          { method: "POST", body: JSON.stringify(payload) },
          { useProxy: true }
        )
        return response.data as CreateOrderResult
      } catch (err) {
        setErrorCode(extractErrorCode(err))
        throw err
      } finally {
        setIsSubmitting(false)
      }
    },
    []
  )

  return { createOrder, isSubmitting, errorCode }
}
