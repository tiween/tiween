"use client"

import * as React from "react"

/**
 * Reactive online/offline detector (Story 5.4).
 *
 * Returns a boolean that reflects `navigator.onLine` and updates on the window
 * `online`/`offline` events. Initializes to `true` so server render and the first
 * client paint agree (SSR has no `navigator`) — the real value is read on mount,
 * avoiding a hydration mismatch.
 *
 * Consolidates the scattered `navigator.onLine` checks into one reusable hook for
 * the offline banner + card gating. (Existing hooks that read `navigator.onLine`
 * directly are left untouched in this story.)
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = React.useState(true)

  React.useEffect(() => {
    // Sync to the real value on mount (post-hydration).
    setOnline(navigator.onLine)

    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return online
}
