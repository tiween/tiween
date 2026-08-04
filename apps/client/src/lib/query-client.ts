import { isServer, QueryClient } from "@tanstack/react-query"

/**
 * The app-wide react-query client.
 *
 * Lives in its own module (rather than inside `ClientProviders`) so non-React
 * code — notably the shared sign-out path, which must evict per-user caches
 * before NextAuth tears the session down — can reach the very same instance
 * that `QueryClientProvider` hands to the tree.
 *
 * On the server there is deliberately NO singleton: `ClientProviders` is a
 * client component, but client components still render on the server, and a
 * module-scope instance would be one cache shared by every concurrent SSR
 * request — exactly the cross-user bleed Story 5.8 exists to close. Each server
 * render therefore gets a fresh client; only the browser reuses one, and that
 * browser instance is what the sign-out eviction acts on.
 */
function makeQueryClient() {
  return new QueryClient()
}

let browserQueryClient: QueryClient | undefined

export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient()

  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}
