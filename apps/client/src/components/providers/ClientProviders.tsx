"use client"

import React, { useEffect } from "react"
import { useWatchlistSync } from "@/features/events/hooks/useWatchlistSync"
import { QueryClientProvider } from "@tanstack/react-query"
import { SessionProvider, useSession } from "next-auth/react"
import { ThemeProvider } from "next-themes"
import { z } from "zod"

import { setupLibraries } from "@/lib/general-helpers"
import { getQueryClient } from "@/lib/query-client"
import { signOutAndClearCache } from "@/lib/sign-out"
import { useTranslatedZod } from "@/hooks/useTranslatedZod"

// Setup libraries in client environment
setupLibraries()

export function ClientProviders({
  children,
}: {
  readonly children: React.ReactNode
}) {
  useTranslatedZod(z)

  // The browser singleton — the same instance `signOutAndClearCache` evicts
  // from. On the server this is a fresh per-render client (see query-client.ts).
  const queryClient = getQueryClient()

  return (
    <SessionProvider>
      <TokenProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          forcedTheme="light"
        >
          <QueryClientProvider client={queryClient}>
            {/* Auth-gated, per-user offline pending-add drain (Story 5.1). Sits
                inside QueryClientProvider (react-query) and SessionProvider
                (NextAuth), so `useSession` + mutations resolve regardless of
                route. */}
            <WatchlistSyncMount />
            {children}
          </QueryClientProvider>
        </ThemeProvider>
      </TokenProvider>
    </SessionProvider>
  )
}

/** Mounts the app-wide watchlist reconnect drain (renders nothing). */
function WatchlistSyncMount() {
  useWatchlistSync()
  return null
}

function TokenProvider({ children }: { readonly children: React.ReactNode }) {
  const session = useSession()

  useEffect(() => {
    if (session.data?.error === "invalid_strapi_token") {
      signOutAndClearCache({ callbackUrl: "/auth/signin" })
    }
  }, [session])

  return <>{children}</>
}
