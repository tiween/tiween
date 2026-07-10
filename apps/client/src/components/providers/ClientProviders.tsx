"use client"

import React, { useEffect } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SessionProvider, signOut, useSession } from "next-auth/react"
import { ThemeProvider } from "next-themes"
import { z } from "zod"

import { useWatchlistSync } from "@/features/events/hooks/useWatchlistSync"
import { setupLibraries } from "@/lib/general-helpers"
import { useTranslatedZod } from "@/hooks/useTranslatedZod"

// Setup libraries in client environment
setupLibraries()

const queryClient = new QueryClient()

export function ClientProviders({
  children,
}: {
  readonly children: React.ReactNode
}) {
  useTranslatedZod(z)

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
      signOut({ callbackUrl: "/auth/signin" })
    }
  }, [session])

  return <>{children}</>
}
