"use client"

/**
 * Loading state for `/shorts/<slug>` (SPAGE-01, UI-SPEC A7).
 *
 * A hero-height Surface block with the reserved stripe, three bars for the
 * title block (chip row, title, meta line) and the 52px round block the
 * watchlist heart will occupy. Static under reduced motion; no spinner before
 * 200ms.
 *
 * This file is why the existence check lives in the `[slug]` layout (RESEARCH
 * E3/E4): a `loading.tsx` streams the response, and a `notFound()` raised below
 * it would already be a 200. Do not move any fetch or `notFound()` call here.
 */
import { ReservedArtwork } from "@/features/shorts/components/ReservedArtwork"
import { useTranslations } from "next-intl"

import { Skeleton } from "@/components/ui/skeleton"

export default function ShortFilmLoading() {
  const t = useTranslations("shorts.detail")

  return (
    <main
      aria-busy="true"
      className="bg-background min-h-dvh motion-reduce:[&_*]:animate-none"
    >
      <div className="mx-auto max-w-[920px]">
        <div className="bg-surface relative h-[clamp(440px,62vw,580px)] overflow-hidden">
          <ReservedArtwork />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-4">
            <Skeleton className="h-6 w-24 rounded-md" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>

        <div className="p-4">
          <Skeleton className="size-[52px] rounded-full" />
        </div>
      </div>

      <span role="status" className="sr-only">
        {t("loading")}
      </span>
    </main>
  )
}
