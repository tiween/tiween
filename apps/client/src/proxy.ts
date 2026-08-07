import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "next-auth/middleware"
import createMiddleware from "next-intl/middleware"

import {
  isTicketPurchaseEnabled,
  isTicketPurchasePath,
} from "./lib/feature-flags"
import { isDevelopment } from "./lib/general-helpers"
import { routing } from "./lib/navigation"

// https://next-intl-docs.vercel.app/docs/getting-started/app-router
const intlMiddleware = createMiddleware(routing)

// List all pages that require authentication (non-public)
// `/venue/profile` is the venue-manager dashboard (Story 7.2): it must not be
// reachable anonymously through the proxy. The page ALSO guards with
// `getServerSession`, and Strapi re-checks the role on every call — this entry
// only stops an unauthenticated render from happening at all.
const authPages = ["/auth/change-password", "/auth/signout", "/venue/profile"]

// Auth-required PREFIXES (Story 7.3). The venue-manager surfaces live under
// `/venue/...` and include a dynamic preview route
// (`/venue/events/[documentId]`) that cannot be enumerated exactly, so the
// whole `/venue` subtree is guarded by prefix. The exact `authPages` entries
// above keep working unchanged (`/venue/profile` is now doubly covered).
// `/venues/...` (the PUBLIC venue pages, plural) is deliberately NOT matched:
// the prefix regex requires the segment to END at `/venue` or continue with
// `/`.
const authPrefixes = ["/venue"]

const authMiddleware = withAuth(
  // Note that this callback is only invoked if
  // the `authorized` callback has returned `true`
  // and not for pages listed in `pages`.
  (req) => intlMiddleware(req),
  {
    callbacks: {
      authorized: ({ token }) => token != null,
    },
    pages: {
      signIn: "/auth/signin",
    },
  }
)

// Next.js 16 renamed the `middleware` file convention to `proxy` (this file
// used to be `src/middleware.ts`). Two consequences beyond the name: execution
// moved from the edge runtime into the Node.js server process, and
// route-segment config (e.g. `runtime`) is no longer allowed in `config`
// below — only `matcher`.
//
// "Proxy" here means the Next request-interception convention. It is unrelated
// to this app's Strapi `/api/public-proxy` and `/api/private-proxy` route
// handlers, which share the word but nothing else.
export default function proxy(req: NextRequest) {
  // Handle HTTPS redirection in production, behind Heroku's TLS terminator.
  // `isDevelopment()` already makes this dormant locally — do not comment the
  // block out to run `next start`, the guard covers it.
  const xForwardedProtoHeader = req.headers.get("x-forwarded-proto")
  if (
    !isDevelopment() &&
    (xForwardedProtoHeader === null ||
      xForwardedProtoHeader.includes("https") === false)
  ) {
    return NextResponse.redirect(
      `https://${req.headers.get("host")}${req.nextUrl.pathname}`,
      301
    )
  }

  // Aggregation-only v1 (Story 3.12): with the purchase flag off, checkout /
  // purchase routes and the routable ticketing prototypes are rewritten to a
  // non-existent path so the app answers 404. Rewrite (not redirect) keeps the
  // URL; the purchase pages ALSO guard with `notFound()` server-side. `/tickets`
  // exact ("Mes Billets", Story 6.4) is viewing, not purchase — never matched.
  if (
    !isTicketPurchaseEnabled() &&
    isTicketPurchasePath(req.nextUrl.pathname)
  ) {
    return NextResponse.rewrite(new URL("/not-found-404", req.url))
  }

  // Build regex for auth (non-public) pages
  const authPathnameRegex = RegExp(
    `^(/(${routing.locales.join("|")}))?(${authPages.join("|")})/?$`,
    "i"
  )
  // Prefix-guarded subtrees (Story 7.3): matches the prefix itself and
  // anything BELOW it (`/venue`, `/venue/events/abc123`), never a sibling
  // sharing the prefix as a substring (`/venues/...`).
  const authPrefixRegex = RegExp(
    `^(/(${routing.locales.join("|")}))?(${authPrefixes.join("|")})(/.*)?$`,
    "i"
  )
  const isAuthPage =
    authPathnameRegex.test(req.nextUrl.pathname) ||
    authPrefixRegex.test(req.nextUrl.pathname)

  // If the request is for a non-public (auth) page, require authentication
  if (isAuthPage) {
    return (authMiddleware as (req: NextRequest) => NextResponse)(req)
  }

  // All other pages are public
  return intlMiddleware(req)
}

export const config = {
  // Match only internationalized pathnames
  matcher: [
    // Enable a redirect to a matching locale at the root
    "/",
    // Set a cookie to remember the previous locale for
    // all requests that have a locale prefix (ar, fr, en)
    `/(ar|fr|en)/:path*`,

    // Skip all paths that should not be internationalized
    "/((?!_next|_vercel|api|robots.txt|favicon.ico|sitemap|.*\\..*).*)",
  ],
}
