"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { useLocale } from "next-intl"

import { routing, usePathname, useRouter } from "@/lib/navigation"

/**
 * Applies the authenticated user's stored `preferredLanguage` (Story 4.5).
 *
 * On the first authenticated render for a given user, if their saved language
 * differs from the active locale, it switches once via the next-intl navigation
 * router (`router.replace(pathname, { locale })`) — the same immediate +
 * `NEXT_LOCALE`-cookie-persistent idiom as `LocaleSwitcher`. A `useRef` seeded to
 * the acted-on `userId` guards it to at most once per mount, so a logged-in user
 * can still browse another locale within the session without being forced back
 * until the next load (and the guard also prevents a switch → re-render loop).
 * Renders nothing.
 */
export function PreferenceSync() {
  const { data: session, status } = useSession()
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const appliedForUserRef = React.useRef<number | null>(null)

  const userId = session?.user?.userId
  const preferredLanguage = session?.user?.preferredLanguage
  const sessionError = session?.error

  React.useEffect(() => {
    if (status !== "authenticated") return
    // A session flagged with an error is on its way to sign-out (see
    // ClientProviders' TokenProvider); don't switch locale off its stale data.
    if (sessionError) return
    if (userId == null || !preferredLanguage) return
    // Evaluate at most once per authenticated user: marking the ref here (even
    // when no switch is needed) is what lets the user browse another locale
    // later in the session without being forced back to their preference.
    if (appliedForUserRef.current === userId) return
    appliedForUserRef.current = userId
    // Defensive: only route to a locale the app actually supports (the stored
    // value is enum-constrained in Strapi, but never trust it into the router).
    if (!routing.locales.includes(preferredLanguage)) return
    if (preferredLanguage !== locale) {
      // next-intl's `router.replace` drops query params, so re-attach them (the
      // same idiom as `LocaleSwitcher`) to preserve any active filter state.
      const query = searchParams.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, {
        locale: preferredLanguage,
      })
    }
  }, [
    status,
    sessionError,
    userId,
    preferredLanguage,
    locale,
    pathname,
    searchParams,
    router,
  ])

  return null
}

export default PreferenceSync
