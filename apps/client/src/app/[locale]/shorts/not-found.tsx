"use client"

/**
 * "Court métrage introuvable" for an unknown `/shorts/<slug>` (SPAGE-01, D-07).
 *
 * Only the API's `SHORT_FILM_NOT_FOUND` reaches this file (the `[slug]` layout
 * guard calls `notFound()` for nothing else), so it never doubles as an outage
 * screen. It is plain content, not an alert.
 *
 * It is a client component on purpose. The generic `[locale]/not-found.tsx`
 * resolves its copy server-side with `getTranslations()` and no locale, which
 * on the unprefixed default-locale path (`/shorts/<slug>`, an internal rewrite
 * to `/fr/...`) rendered English. Here the locale comes from the
 * `NextIntlClientProvider` the `[locale]` layout builds from the URL segment,
 * so French stays French and `/ar` and `/en` follow their segment.
 */
import {
  SHORTS_PRIMARY_PILL_CLASS,
  ShortsStateBlock,
  ShortsWordmarkHeader,
} from "@/features/shorts/components/ShortsBoundary"
import { Film } from "lucide-react"
import { useTranslations } from "next-intl"

import { Link } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export default function ShortsNotFound() {
  const t = useTranslations()

  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <ShortsWordmarkHeader />
      <main className="flex-1 px-4 md:px-6">
        <ShortsStateBlock
          icon={
            <Film
              className="text-muted-foreground size-12"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          }
          title={t("shorts.detail.notFoundTitle")}
          headingLevel={1}
          body={t("errors.SHORT_FILM_NOT_FOUND")}
        >
          <Button asChild className={cn("w-full", SHORTS_PRIMARY_PILL_CLASS)}>
            <Link href="/shorts">{t("shorts.detail.browseAll")}</Link>
          </Button>
        </ShortsStateBlock>
      </main>
    </div>
  )
}
