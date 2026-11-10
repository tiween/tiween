"use client"

/**
 * Single error boundary for the whole `/shorts` segment (SPAGE-05).
 *
 * D-07: an outage is never an empty catalogue, an empty grid or a 404. Only the
 * sibling `not-found.tsx` says "introuvable"; everything that reaches this file
 * is a retryable failure. D-20: the directory renders it after hydration (HTTP
 * 200, accepted); a detail outage is a thrown layout error whose boundary is
 * this parent segment (RESEARCH E5), so the pathname decides which variant to
 * draw.
 *
 * Copy: in production Next replaces `error.message` with a digest
 * (RESEARCH Pitfall 4), so no API code is ever read from the error. The body is
 * `errors.NETWORK_ERROR` when the browser is offline and `errors.INTERNAL_ERROR`
 * otherwise. The message and digest are only logged, never rendered (T-02-14).
 *
 * Retry: `reset()` alone only re-renders and never refetches a failed server
 * component (RESEARCH Pitfall 5), so both run inside one transition, refresh
 * first.
 */
import * as React from "react"
import { useRouter } from "next/navigation"
import {
  SHORTS_PRIMARY_PILL_CLASS,
  ShortsStateBlock,
  ShortsWordmarkHeader,
} from "@/features/shorts/components/ShortsBoundary"
import { SHORTS_PAGE_CLASS } from "@/features/shorts/components/shortsLayout"
import { ShortsPageIntro } from "@/features/shorts/components/ShortsPageIntro"
import {
  consumeRetryFocus,
  markRetryPending,
} from "@/features/shorts/utils/retryFocus"
import { AlertCircle, Loader, RotateCw } from "lucide-react"
import { useTranslations } from "next-intl"

import { Link, usePathname } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/** A spinner earlier than this reads as flicker, not progress. */
const SPINNER_DELAY_MS = 200

interface ShortsErrorProps {
  readonly error: Error & { digest?: string }
  readonly reset: () => void
}

function subscribeToConnection(onChange: () => void) {
  window.addEventListener("online", onChange)
  window.addEventListener("offline", onChange)
  return () => {
    window.removeEventListener("online", onChange)
    window.removeEventListener("offline", onChange)
  }
}

/** The server snapshot is "online" so the first client render matches SSR. */
function useIsOnline() {
  return React.useSyncExternalStore(
    subscribeToConnection,
    () => window.navigator.onLine,
    () => true
  )
}

/** `/shorts/<slug>` is the detail page; `/shorts` is the directory. */
function isDetailPath(pathname: string) {
  return /^\/shorts\/[^/]+/.test(pathname)
}

export default function ShortsError({ error, reset }: ShortsErrorProps) {
  const t = useTranslations()
  const router = useRouter()
  const pathname = usePathname()
  const isOnline = useIsOnline()
  const [isPending, startTransition] = React.useTransition()
  const [showSpinner, setShowSpinner] = React.useState(false)
  const retryRef = React.useRef<HTMLButtonElement>(null)

  const isDetail = isDetailPath(pathname)

  React.useEffect(() => {
    // The only place the error is read. Never rendered.
    console.error("Shorts page error:", error)
  }, [error])

  // A failed retry mounts this boundary again; the mark the click left behind
  // puts focus back on the button instead of dropping it to <body>. A
  // successful retry unmounts this file, and the page heading takes the mark.
  React.useEffect(() => {
    consumeRetryFocus(retryRef.current)
  }, [])

  React.useEffect(() => {
    if (!isPending) {
      setShowSpinner(false)
      return
    }
    const timer = setTimeout(() => setShowSpinner(true), SPINNER_DELAY_MS)
    return () => clearTimeout(timer)
  }, [isPending])

  const handleRetry = () => {
    if (isPending) return
    markRetryPending()
    startTransition(() => {
      router.refresh()
      reset()
    })
  }

  const body = isOnline ? t("errors.INTERNAL_ERROR") : t("errors.NETWORK_ERROR")

  const retryButton = (
    <Button
      ref={retryRef}
      type="button"
      onClick={handleRetry}
      aria-busy={isPending ? true : undefined}
      aria-disabled={isPending ? true : undefined}
      className={cn("w-full", SHORTS_PRIMARY_PILL_CLASS)}
    >
      {showSpinner ? (
        <Loader
          data-retry-spinner=""
          className="size-5 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : (
        <RotateCw className="size-5" aria-hidden="true" />
      )}
      {t("shorts.directory.retry")}
    </Button>
  )

  const icon = (
    <AlertCircle
      className="text-destructive size-12"
      strokeWidth={1.75}
      aria-hidden="true"
    />
  )

  if (!isDetail) {
    return (
      <main className={SHORTS_PAGE_CLASS}>
        <ShortsPageIntro
          title={t("shorts.directory.title")}
          description={t("shorts.directory.description")}
          restoreFocus={false}
        />
        <ShortsStateBlock
          role="alert"
          icon={icon}
          title={t("shorts.directory.errorTitle")}
          headingLevel={2}
          body={body}
          className="pt-12"
        >
          {retryButton}
        </ShortsStateBlock>
      </main>
    )
  }

  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <ShortsWordmarkHeader />
      <main className="flex-1 px-4 md:px-6">
        <ShortsStateBlock
          role="alert"
          icon={icon}
          title={t("shorts.detail.errorTitle")}
          headingLevel={1}
          body={body}
        >
          {retryButton}
          <Button
            asChild
            variant="ghost"
            className="text-gold-tint hover:text-gold-tint h-11 rounded-full px-4 text-base font-bold hover:bg-transparent hover:underline"
          >
            <Link href="/shorts">{t("shorts.detail.browseAll")}</Link>
          </Button>
        </ShortsStateBlock>
      </main>
    </div>
  )
}
