import { env } from "@/env.mjs"
import { getSession } from "next-auth/react"

import { getAuth } from "@/lib/auth"

const ALLOWED_STRAPI_ENDPOINTS: Record<string, string[]> = {
  GET: [
    "api/pages",
    "api/footer",
    "api/navbar",
    "api/users/me",
    "api/auth/local",
    // Allow specific providers callbacks if needed
    // "api/auth/[provider]/callback",
    // Watchlist reads (Story 5.1). `startsWith` covers the list root and the
    // per-item `check/:id` probe. Every watchlist route is JWT-self-scoped.
    "api/user-engagement/watchlist",
    // Notification reads (Story 5.6). `startsWith` covers the list root and the
    // `unread-count` probe. Every notification route is JWT-self-scoped.
    "api/user-engagement/notifications",
    // Public ticket-tiers read for a sub-event (Story 6.1). `startsWith` covers
    // `.../showtimes/:documentId/ticket-tiers`. Public, read-only presentation.
    "api/events-manager/showtimes",
  ],
  POST: [
    "api/subscribers",
    "api/auth/local/register",
    "api/auth/forgot-password",
    "api/auth/reset-password",
    "api/auth/change-password",
    "api/auth/change-email",
    "api/auth/confirm-email-change",
    // Avatar upload (Story 4.4). The uploaded file is linked self-scoped via
    // PUT api/users/me — never with a `ref`/`refId` on the upload itself.
    "api/upload",
    // Watchlist add (Story 5.1). NOTE: this `startsWith` prefix also reaches
    // `.../watchlist/toggle` (which can remove) — acceptable because every
    // watchlist route is JWT-self-scoped and no Story 5.1 UI path invokes
    // toggle. Hard remove (DELETE) stays blocked until Story 5.2.
    "api/user-engagement/watchlist",
  ],
  // Self-scoped profile update only. `api/users` is intentionally NOT listed —
  // that would expose the stock `PUT api/users/:id` (arbitrary id + fields).
  // Notification mark-all-read (Story 5.6) — `startsWith` covers
  // `.../notifications/read-all`; JWT-self-scoped.
  PUT: ["api/users/me", "api/user-engagement/notifications"],
  // Watchlist hard remove (Story 5.2). `startsWith` covers
  // `.../watchlist/:creativeWorkId`. Every watchlist route is JWT-self-scoped,
  // so a user can only ever DELETE their own row. No other DELETE is allowed.
  DELETE: ["api/user-engagement/watchlist"],
}

/**
 * Check if the given Strapi Admin/API path is allowed to be accessed
 * with the provided HTTP method.
 */
export const isStrapiEndpointAllowed = (
  path: string,
  method: string
): boolean => {
  return (
    ALLOWED_STRAPI_ENDPOINTS[method]?.some((endpoint) =>
      path.startsWith(endpoint)
    ) ?? false
  )
}

/**
 * Create Strapi authorization header based on the request type.
 * If the request is private, it retrieves the user token from NextAuth.
 * If the request is public, it uses the appropriate API token based on read-only status.
 */
export const createStrapiAuthHeader = async ({
  isReadOnly,
  isPrivate,
}: {
  isReadOnly?: boolean
  isPrivate: boolean
}) => {
  if (isPrivate) {
    const userToken = await getStrapiUserTokenFromNextAuth()
    return formatStrapiAuthorizationHeader(userToken)
  }

  const apiToken = isReadOnly
    ? env.STRAPI_REST_READONLY_API_KEY
    : env.STRAPI_REST_CUSTOM_API_KEY

  return formatStrapiAuthorizationHeader(apiToken)
}

export const formatStrapiAuthorizationHeader = (token?: string) => {
  if (!token) {
    return {} as Record<string, string>
  }

  return {
    Authorization: `Bearer ${token}`,
  }
}

/**
 * Get user-permission token from the NextAuth session
 */
const getStrapiUserTokenFromNextAuth = async () => {
  const isRSC = typeof window === "undefined"
  if (isRSC) {
    // server side
    const session = await getAuth()
    return session?.strapiJWT
  }

  // client side
  // this makes HTTP request to /api/auth/session to get the session
  // this is not the best solution because it makes HTTP request to the server
  // but useSession() can't be used here
  const session = await getSession()
  return session?.strapiJWT
}
