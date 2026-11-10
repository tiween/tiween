"use client"

/**
 * Loading state for the `/shorts` directory (SPAGE-01, UI-SPEC C5).
 *
 * Shows the real intro (static text, no skeleton for the h1), a 120px bar for
 * the result line and 12 card skeletons in the exact grid the loaded directory
 * uses, so nothing jumps when the page arrives. No gold, no spinner (a spinner
 * before 200ms reads as flicker), and the pulse is off under reduced motion.
 *
 * Client component so the copy follows the provider locale like the error and
 * not-found boundaries do.
 */
import { ShortFilmCardSkeleton } from "@/features/shorts/components/ShortFilmCard/ShortFilmCardSkeleton"
import {
  SHORTS_GRID_CLASS,
  SHORTS_PAGE_CLASS,
} from "@/features/shorts/components/shortsLayout"
import { ShortsPageIntro } from "@/features/shorts/components/ShortsPageIntro"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

const CARD_SKELETON_COUNT = 12

export default function ShortsLoading() {
  const t = useTranslations("shorts.directory")

  return (
    <main
      aria-busy="true"
      className={cn(SHORTS_PAGE_CLASS, "motion-reduce:[&_*]:animate-none")}
    >
      <ShortsPageIntro
        title={t("title")}
        description={t("description")}
        restoreFocus={false}
      />

      {/* Result line: Meta 14/20, 16 / 16 / 24 under the description. */}
      <Skeleton className="mt-4 h-5 w-[120px] xl:mt-6" />

      <div className={cn(SHORTS_GRID_CLASS, "mt-2 xl:mt-4")}>
        {Array.from({ length: CARD_SKELETON_COUNT }, (_, index) => (
          <ShortFilmCardSkeleton key={index} />
        ))}
      </div>

      <span role="status" className="sr-only">
        {t("loading")}
      </span>
    </main>
  )
}
