"use client"

import * as React from "react"

import { PublicStrapiClient } from "@/lib/strapi-api"
import { extractErrorCode } from "@/features/tickets/utils/extractErrorCode"

/** Reconciled order status returned by the confirm endpoint (Story 6.3). */
export interface OrderStatusResult {
  orderNumber: string
  status: "pending" | "paid" | "failed" | "refunded" | "not_found"
  changed?: boolean
}

export interface UseOrderStatus {
  /** POST `/orders/:orderNumber/confirm` — idempotent gateway reconcile. */
  confirmOrder: (orderNumber: string) => Promise<OrderStatusResult>
  isConfirming: boolean
  errorCode: string | null
}

/**
 * Result-page hook (Story 6.3): triggers the idempotent reconciliation via
 * `POST /ticketing/orders/:orderNumber/confirm` (the client-triggered backstop
 * to the webhook) and returns the authoritative status.
 */
export function useOrderStatus(): UseOrderStatus {
  const [isConfirming, setIsConfirming] = React.useState(false)
  const [errorCode, setErrorCode] = React.useState<string | null>(null)

  const confirmOrder = React.useCallback(
    async (orderNumber: string): Promise<OrderStatusResult> => {
      setIsConfirming(true)
      setErrorCode(null)
      try {
        const response = await PublicStrapiClient.fetchAPI(
          `/ticketing/orders/${encodeURIComponent(orderNumber)}/confirm`,
          undefined,
          { method: "POST", body: JSON.stringify({}) },
          { useProxy: true }
        )
        return response.data as OrderStatusResult
      } catch (err) {
        setErrorCode(extractErrorCode(err))
        throw err
      } finally {
        setIsConfirming(false)
      }
    },
    []
  )

  return { confirmOrder, isConfirming, errorCode }
}
