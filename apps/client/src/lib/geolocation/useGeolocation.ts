"use client"

import * as React from "react"

import type { Coordinates } from "./distance"

import { isWithinTunisia, LOCATION_CACHE_KEY } from "./constants"

/**
 * Geolocation permission and position state
 */
export interface GeolocationState {
  /** Current position coordinates (null if unavailable) */
  position: Coordinates | null
  /** Current status of geolocation request */
  status: "idle" | "loading" | "success" | "error" | "denied" | "unavailable"
  /** Error message if status is 'error' */
  error: string | null
  /** Whether geolocation is supported by the browser */
  isSupported: boolean
  /** Request the user's location */
  requestLocation: () => void
  /** Clear the cached location */
  clearLocation: () => void
}

/**
 * Geolocation options
 */
export interface UseGeolocationOptions {
  /** Enable high accuracy (uses GPS on mobile, slower) */
  enableHighAccuracy?: boolean
  /** Maximum age of cached position in ms (default: 5 minutes) */
  maximumAge?: number
  /** Timeout for position request in ms (default: 10 seconds) */
  timeout?: number
  /** Auto-request location on mount */
  autoRequest?: boolean
}

const defaultOptions: Required<UseGeolocationOptions> = {
  enableHighAccuracy: false,
  maximumAge: 5 * 60 * 1000, // 5 minutes
  timeout: 10 * 1000, // 10 seconds
  autoRequest: false,
}

/**
 * Get cached location from session storage
 */
function getCachedLocation(): Coordinates | null {
  if (typeof window === "undefined") return null

  try {
    const cached = sessionStorage.getItem(LOCATION_CACHE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached) as Coordinates
      if (
        typeof parsed.latitude === "number" &&
        typeof parsed.longitude === "number"
      ) {
        return parsed
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

/**
 * Save location to session storage
 */
function setCachedLocation(coords: Coordinates): void {
  if (typeof window === "undefined") return

  try {
    sessionStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(coords))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear cached location from session storage
 */
function clearCachedLocation(): void {
  if (typeof window === "undefined") return

  try {
    sessionStorage.removeItem(LOCATION_CACHE_KEY)
  } catch {
    // Ignore storage errors
  }
}

/**
 * Hook for accessing user's geolocation with caching and error handling
 *
 * Features:
 * - Session-based caching to avoid repeated permission prompts
 * - Permission state tracking (idle, loading, success, error, denied)
 * - High accuracy mode for mobile GPS
 * - Tunisia bounds validation
 * - SSR-safe (no window access during SSR)
 *
 * @example
 * ```tsx
 * function NearMeButton() {
 *   const { position, status, requestLocation, error } = useGeolocation()
 *
 *   if (status === "denied") {
 *     return <div>Please enable location in your browser settings</div>
 *   }
 *
 *   return (
 *     <button onClick={requestLocation} disabled={status === "loading"}>
 *       {status === "loading" ? "Locating..." : "Near Me"}
 *     </button>
 *   )
 * }
 * ```
 */
export function useGeolocation(
  options: UseGeolocationOptions = {}
): GeolocationState {
  const opts = { ...defaultOptions, ...options }

  // Check if geolocation is supported
  const isSupported =
    typeof window !== "undefined" && "geolocation" in navigator

  // State
  const [position, setPosition] = React.useState<Coordinates | null>(() =>
    getCachedLocation()
  )
  const [status, setStatus] = React.useState<GeolocationState["status"]>(() =>
    getCachedLocation() ? "success" : "idle"
  )
  const [error, setError] = React.useState<string | null>(null)

  // Request location callback
  const requestLocation = React.useCallback(() => {
    if (!isSupported) {
      setStatus("unavailable")
      setError("Geolocation is not supported by your browser")
      return
    }

    // Check if we have a cached position
    const cached = getCachedLocation()
    if (cached) {
      setPosition(cached)
      setStatus("success")
      return
    }

    setStatus("loading")
    setError(null)

    navigator.geolocation.getCurrentPosition(
      // Success callback
      (pos) => {
        const coords: Coordinates = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }

        // Validate that location is within Tunisia
        if (!isWithinTunisia(coords)) {
          setStatus("error")
          setError(
            "Your location appears to be outside Tunisia. Please select a city manually."
          )
          return
        }

        // Cache the location
        setCachedLocation(coords)

        setPosition(coords)
        setStatus("success")
        setError(null)
      },
      // Error callback
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setStatus("denied")
            setError(
              "Location permission was denied. Please enable location in your browser settings."
            )
            break
          case err.POSITION_UNAVAILABLE:
            setStatus("error")
            setError(
              "Unable to determine your location. Please try again or select a city manually."
            )
            break
          case err.TIMEOUT:
            setStatus("error")
            setError(
              "Location request timed out. Please try again or select a city manually."
            )
            break
          default:
            setStatus("error")
            setError("An unknown error occurred while getting your location.")
        }
      },
      // Options
      {
        enableHighAccuracy: opts.enableHighAccuracy,
        maximumAge: opts.maximumAge,
        timeout: opts.timeout,
      }
    )
  }, [isSupported, opts.enableHighAccuracy, opts.maximumAge, opts.timeout])

  // Clear location callback
  const clearLocation = React.useCallback(() => {
    clearCachedLocation()
    setPosition(null)
    setStatus("idle")
    setError(null)
  }, [])

  // Auto-request on mount if option is enabled
  React.useEffect(() => {
    if (opts.autoRequest && status === "idle" && !position) {
      requestLocation()
    }
  }, [opts.autoRequest, status, position, requestLocation])

  return {
    position,
    status,
    error,
    isSupported,
    requestLocation,
    clearLocation,
  }
}
