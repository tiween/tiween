"use client"

import { useTranslations } from "next-intl"

import { useShortFilmHeart } from "@/features/watchlist/hooks/useShortFilmHeart"
import { WatchlistButton } from "@/features/watchlist/components/WatchlistButton"

export interface ShortFilmHeartProps {
  /** Only what the heart needs from the film. */
  film: { documentId: string; title: string }
}

/**
 * The card heart (FR19, FR20; UI-SPEC B1, Part E; D-13, D-14, D-15).
 *
 * A `WatchlistButton` pinned to the poster's top-end corner (4px inset, logical
 * so it is top-left in Arabic) above the card link (`z-20` over the link's
 * `z-10`). It is rendered as a SIBLING of the link, never inside it, and its
 * click stops propagation and default, so a heart tap never navigates.
 *
 * The saved state comes from the grid's `ShortsWatchlistProvider` (one list
 * request), not from a per-card check. Signed-out taps keep the control enabled:
 * it is an invitation to sign in (D-14), not a disabled control. The accessible
 * name names the film so 24 hearts on a page are distinguishable, and always
 * agrees with `aria-pressed`.
 */
export function ShortFilmHeart({ film }: ShortFilmHeartProps) {
  const t = useTranslations("shorts.card")
  const { isSaved, isBusy, toggle } = useShortFilmHeart(film.documentId, {
    surface: "card",
  })

  return (
    <WatchlistButton
      variant="overlay"
      isWatchlisted={isSaved}
      busy={isBusy}
      onToggle={toggle}
      labels={{
        add: t("watchlistAdd", { title: film.title }),
        remove: t("watchlistRemove", { title: film.title }),
      }}
      className="absolute end-1 top-1 z-20"
    />
  )
}

ShortFilmHeart.displayName = "ShortFilmHeart"
