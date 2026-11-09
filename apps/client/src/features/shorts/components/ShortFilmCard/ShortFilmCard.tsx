"use client"

import Image from "next/image"
import { Clock, ExternalLink, Play } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import type { MouseEvent } from "react"
import type {
  ShortFilmCardLabels,
  ShortFilmCard as ShortFilmCardType,
} from "../../types"

import { Link } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { isArabic } from "@/lib/utils/isArabic"

import { formatCount, positiveNumber } from "../../utils"
import { ReservedArtwork } from "../ReservedArtwork"
import { ShortFilmCardSkeleton } from "./ShortFilmCardSkeleton"

// Placeholder blur data URL
const BLUR_DATA_URL =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAYH/8QAIhAAAgEEAgIDAQAAAAAAAAAAAQIDAAQFESEGEhMxQVFh/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQADAQEBAAAAAAAAAAAAAAABAgMAEUH/2gAMAwEAAhEDEEA/ANM4/wAix+TwGNvIZ4Xknt0kkiWVWeNmUEqw+iCexrxSlOhIqnAiYp//2Q=="

export interface ShortFilmCardProps {
  /** Short film data */
  film: ShortFilmCardType
  /** Show the play-trailer control on hover/focus (desktop, needs a handler) */
  showPlayButton?: boolean
  /** Whether to show loading skeleton */
  isLoading?: boolean
  /** Called when the play-trailer control is activated */
  onPlayTrailer?: () => void
  /** Additional class names */
  className?: string
  /** Overrides for the translated labels (rarely needed) */
  labels?: Partial<ShortFilmCardLabels>
}

/**
 * A 2:3 poster card. The whole card is ONE locale-aware link to the film's
 * detail page at every breakpoint, so it works with a keyboard, with a screen
 * reader and without any click handler. The desktop hover overlay also opens
 * on keyboard focus; the optional trailer control sits above the link as an
 * independent target.
 */
export function ShortFilmCard({
  film,
  showPlayButton = true,
  isLoading = false,
  onPlayTrailer,
  className,
  labels: labelOverrides,
}: ShortFilmCardProps) {
  const t = useTranslations("shorts")
  const locale = useLocale()

  if (isLoading) {
    return <ShortFilmCardSkeleton className={className} />
  }

  const labels: ShortFilmCardLabels = {
    watchNow: t("card.watchNow"),
    viewDetails: t("card.viewDetails"),
    playTrailer: t("card.playTrailer", { title: film.title }),
    minutes: t("minutes"),
    notAvailableOnline: t("card.notAvailableOnline"),
    featured: t("card.featured"),
    availableOnline: t("card.availableOnline"),
    ...labelOverrides,
  }

  const handlePlayClick = (e: MouseEvent) => {
    // The trailer control sits inside the card link's stacking area.
    e.preventDefault()
    e.stopPropagation()
    onPlayTrailer?.()
  }

  const hasArabicOriginalTitle =
    film.originalTitle &&
    film.originalTitle !== film.title &&
    isArabic(film.originalTitle)

  const duration = positiveNumber(film.duration)

  // Plural-aware: Arabic picks the noun form from the count.

  const durationText =

    duration !== null

      ? t("durationMinutes", {

          count: duration,

          display: formatCount(duration, locale),

        })

      : null
  const year = positiveNumber(film.releaseYear)
  const canPlayTrailer = showPlayButton && Boolean(onPlayTrailer)

  const byline = (
    <>
      {film.director && <bdi className="truncate">{film.director}</bdi>}
      {film.director && year !== null && <span aria-hidden="true">•</span>}
      {year !== null && <bdi className="shrink-0">{year}</bdi>}
    </>
  )

  return (
    <article
      className={cn(
        "group bg-surface relative overflow-hidden rounded-2xl",
        "aspect-[2/3] w-full",
        // Subtle film grain texture effect via pseudo-element
        "before:pointer-events-none before:absolute before:inset-0 before:z-[1] before:opacity-0 before:transition-opacity before:duration-300",
        "before:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')]",
        "hover:before:opacity-100",
        // The link is the focus target; ring the whole card when it has focus.
        "has-[a:focus-visible]:ring-ring has-[a:focus-visible]:ring-3",
        className
      )}
    >
      {/* Poster, or reserved artwork when the record has none */}
      {film.posterUrl ? (
        <Image
          src={film.posterUrl}
          alt=""
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className={cn(
            "object-cover",
            "transition-all duration-500 ease-out",
            "md:group-focus-within:scale-105 md:group-focus-within:opacity-40 md:group-hover:scale-105 md:group-hover:opacity-40"
          )}
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
        />
      ) : (
        <ReservedArtwork />
      )}

      {/* Featured badge: an editorial note, not an action, so it stays a
          neutral chip on an aubergine scrim (gold is reserved for actions). */}
      {film.isFeatured && (
        <div className="absolute start-2 top-2 z-[6] max-w-[calc(50%-0.5rem)]">
          <span className="bg-aubergine-deep/80 text-foreground border-border block truncate rounded-[8px] border px-[11px] py-1 text-[11px] leading-[1.4] font-semibold backdrop-blur-sm">
            {labels.featured}
          </span>
        </div>
      )}

      {/* Duration badge */}
      {duration !== null && (
        <div className="absolute end-2 top-2 z-[6]">
          <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-medium whitespace-nowrap text-white backdrop-blur-sm">
            <Clock className="h-3 w-3" aria-hidden="true" />
            <bdi>
              {durationText}
            </bdi>
          </span>
        </div>
      )}

      {/* Mobile: bottom info overlay */}
      <div className="absolute inset-x-0 bottom-0 z-[5] bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 pt-12 md:hidden">
        <h3 className="line-clamp-2 text-sm font-semibold break-words text-white">
          <bdi>{film.title}</bdi>
        </h3>
        {hasArabicOriginalTitle && (
          <p
            className="font-arabic mt-0.5 line-clamp-1 text-xs text-white/70"
            dir="rtl"
            lang="ar"
          >
            {film.originalTitle}
          </p>
        )}
        {(film.director || year !== null) && (
          <div className="mt-1.5 flex min-w-0 items-center gap-2 text-xs text-white/70">
            {byline}
          </div>
        )}
        {/* Availability note (a fact, not an action): icon + text, never
            color alone. */}
        {film.isAvailableOnline && (
          <div className="text-gold-tint mt-2 flex min-w-0 items-center gap-1 text-xs">
            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{labels.availableOnline}</span>
          </div>
        )}
      </div>

      {/* Desktop: overlay revealed on hover AND on keyboard focus */}
      <div
        className={cn(
          "absolute inset-0 z-[5] hidden flex-col items-center justify-between p-4",
          "md:flex",
          "opacity-0 transition-all duration-300 ease-out",
          "group-focus-within:opacity-100 group-hover:opacity-100"
        )}
      >
        <div className="w-full min-w-0 text-center">
          <h3 className="line-clamp-3 text-lg font-bold break-words text-white drop-shadow-lg">
            <bdi>{film.title}</bdi>
          </h3>
          {hasArabicOriginalTitle && (
            <p
              className="font-arabic mt-1 line-clamp-2 text-sm text-white/90"
              dir="rtl"
              lang="ar"
            >
              {film.originalTitle}
            </p>
          )}
          {(film.director || year !== null) && (
            <div className="mt-2 flex min-w-0 items-center justify-center gap-2 text-sm text-white/70">
              {byline}
            </div>
          )}
          {film.genres && film.genres.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-1">
              {film.genres.slice(0, 2).map((genre) => (
                <span
                  key={genre}
                  className="max-w-full truncate rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80"
                >
                  <bdi>{genre}</bdi>
                </span>
              ))}
            </div>
          )}
          {film.isAvailableOnline && (
            <div className="text-gold-tint mt-2 flex min-w-0 items-center justify-center gap-1 text-xs">
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{labels.availableOnline}</span>
            </div>
          )}
        </div>

        {/* Spacer keeps the CTA pinned to the bottom when there is no
            trailer control in the middle. */}
        <div className="h-16 w-16" aria-hidden="true" />

        {/* Visual affordance only — the card link already carries the name
            and the navigation (always to the detail page). A quiet translucent
            outline, not a gold fill: gold fills are reserved for real CTAs. */}
        <span
          aria-hidden="true"
          className={cn(
            "max-w-full truncate px-4 py-2 text-center",
            "bg-aubergine-deep/60 text-foreground rounded-full border border-white/25 text-sm font-semibold backdrop-blur-sm"
          )}
        >
          {labels.viewDetails}
        </span>
      </div>

      {/* The card's one navigation target, at every breakpoint */}
      <Link
        href={`/shorts/${film.slug}`}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none"
      >
        <span className="sr-only">
          {film.title}
          {film.director ? `, ${film.director}` : ""}
          {year !== null ? `, ${year}` : ""}
          {duration !== null ? `, ${durationText}` : ""}
          {film.isAvailableOnline ? `, ${labels.availableOnline}` : ""}
        </span>
      </Link>

      {/* Independent trailer target, above the link (desktop) */}
      {canPlayTrailer && (
        <button
          type="button"
          onClick={handlePlayClick}
          aria-label={labels.playTrailer}
          className={cn(
            "absolute start-1/2 top-1/2 z-20 hidden h-16 w-16 -translate-x-1/2 -translate-y-1/2 md:flex rtl:translate-x-1/2",
            "items-center justify-center rounded-full bg-white/20 backdrop-blur-sm",
            "opacity-0 transition-all duration-200",
            "group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100",
            "hover:scale-110 hover:bg-white/30 active:scale-95",
            "focus-visible:ring-ring focus-visible:ring-3 focus-visible:ring-offset-2 focus-visible:outline-none",
            // Soft gold halo ring (no box-shadow: Flat Chrome rule)
            "ring-primary/30 hover:ring-primary/50 ring-4"
          )}
        >
          <Play className="h-8 w-8 fill-white text-white" aria-hidden="true" />
        </button>
      )}
    </article>
  )
}

ShortFilmCard.displayName = "ShortFilmCard"
