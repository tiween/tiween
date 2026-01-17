"use client"

import * as React from "react"

import type { GuestCheckoutData } from "../components/GuestCheckoutForm"

const GUEST_CHECKOUT_KEY = "tiween_guest_checkout"

/**
 * Session storage for guest checkout information
 *
 * Stores guest email and contact info in sessionStorage so it persists
 * during the checkout flow but is cleared when the browser is closed.
 */
export interface GuestCheckoutState {
  /** Guest contact information */
  guestInfo: GuestCheckoutData | null
  /** Save guest info to session storage */
  setGuestInfo: (data: GuestCheckoutData) => void
  /** Clear guest info from session storage */
  clearGuestInfo: () => void
  /** Whether guest info is stored */
  hasGuestInfo: boolean
}

/**
 * Hook for managing guest checkout state
 *
 * Features:
 * - Persists guest info in sessionStorage
 * - Auto-hydrates on mount
 * - Clears automatically on payment success (call clearGuestInfo)
 *
 * @example
 * ```tsx
 * const { guestInfo, setGuestInfo, hasGuestInfo } = useGuestCheckout()
 *
 * // In GuestCheckoutForm
 * <GuestCheckoutForm
 *   defaultValues={guestInfo ?? undefined}
 *   onSubmit={(data) => {
 *     setGuestInfo(data)
 *     router.push('/checkout/payment')
 *   }}
 * />
 *
 * // After successful payment
 * clearGuestInfo()
 * ```
 */
export function useGuestCheckout(): GuestCheckoutState {
  const [guestInfo, setGuestInfoState] =
    React.useState<GuestCheckoutData | null>(null)
  const [isHydrated, setIsHydrated] = React.useState(false)

  // Hydrate from sessionStorage on mount
  React.useEffect(() => {
    try {
      const stored = sessionStorage.getItem(GUEST_CHECKOUT_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as GuestCheckoutData
        setGuestInfoState(parsed)
      }
    } catch {
      // Ignore parse errors
    }
    setIsHydrated(true)
  }, [])

  const setGuestInfo = React.useCallback((data: GuestCheckoutData) => {
    setGuestInfoState(data)
    try {
      sessionStorage.setItem(GUEST_CHECKOUT_KEY, JSON.stringify(data))
    } catch {
      // Ignore storage errors (e.g., private browsing)
    }
  }, [])

  const clearGuestInfo = React.useCallback(() => {
    setGuestInfoState(null)
    try {
      sessionStorage.removeItem(GUEST_CHECKOUT_KEY)
    } catch {
      // Ignore storage errors
    }
  }, [])

  return {
    guestInfo,
    setGuestInfo,
    clearGuestInfo,
    hasGuestInfo: isHydrated && guestInfo !== null,
  }
}
