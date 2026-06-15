"use client"

import Image from "next/image"
import Link from "next/link"
import { Clock, ExternalLink, Play, Star } from "lucide-react"

import type { MouseEvent } from "react"
import type {
  ShortFilmCardLabels,
  ShortFilmCard as ShortFilmCardType,
} from "../../types"

import { cn } from "@/lib/utils"
import { isArabic } from "@/lib/utils/isArabic"

import { ShortFilmCardSkeleton } from "./ShortFilmCardSkeleton"

// Placeholder blur data URL
const BLUR_DATA_URL =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAYH/8QAIhAAAgEEAgIDAQAAAAAAAAAAAQIDAAQFESEGEhMxQVFh/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQADAQEBAAAAAAAAAAAAAAABAgMAEUH/2gAMAwEAAhEDEEA/ANM4/wAix+TwGNvIZ4Xknt0kkiWVWeNmUEqw+iCexrxSlOhIqnAiYp//2Q=="

const defaultLabels: ShortFilmCardLabels = {
  watchNow: "Regarder",
  viewDetails: "Détails",
  playTrailer: "Bande-annonce",
  minutes: "min",
  notAvailableOnline: "Non disponible en ligne",
  featured: "À la une",
}

export interface ShortFilmCardProps {
  /** Short film data */
  film: ShortFilmCardType
  /** Show the play trailer button on hover */
  showPlayButton?: boolean
  /** Whether to show loading skeleton */
  isLoading?: boolean
  /** Called when play button is clicked */
  onPlayTrailer?: () => void
  /** Called when the card is clicked */
  onClick?: () => void
  /** Additional class names */
  className?: string
  /** Localized labels */
  labels?: ShortFilmCardLabels
}

export function ShortFilmCard({
  film,
  showPlayButton = true,
  isLoading = false,
  onPlayTrailer,
  onClick,
  className,
  labels = defaultLabels,
}: ShortFilmCardProps) {
  const handlePlayClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onPlayTrailer?.()
  }

  const handleCardClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onClick?.()
  }

  if (isLoading) {
    return <ShortFilmCardSkeleton className={className} />
  }

  const hasArabicOriginalTitle =
    film.originalTitle &&
    film.originalTitle !== film.title &&
    isArabic(film.originalTitle)

  const filmUrl = `/shorts/${film.slug}`

  return (
    <article
      aria-label={film.title}
      className={cn(
        "group relative overflow-hidden rounded-lg",
        "aspect-[2/3] w-full",
        // Subtle film grain texture effect via pseudo-element
        "before:pointer-events-none before:absolute before:inset-0 before:z-[1] before:opacity-0 before:transition-opacity before:duration-300",
        "before:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')]",
        "hover:before:opacity-100",
        className
      )}
    >
      {/* Mobile: Direct link */}
      <Link
        href={filmUrl}
        className="absolute inset-0 z-10 md:hidden"
        aria-label={film.title}
      >
        <span className="sr-only">{film.title}</span>
      </Link>

      {/* Poster Image */}
      <Image
        src={film.posterUrl}
        alt={film.title}
        fill
        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
        className={cn(
          "object-cover",
          "transition-all duration-500 ease-out",
          "md:group-hover:scale-105 md:group-hover:opacity-40"
        )}
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
      />

      {/* Featured badge */}
      {film.isFeatured && (
        <div className="absolute start-2 top-2 z-[6]">
          <span className="bg-primary text-primary-foreground rounded-full px-2.5 py-1 text-xs font-semibold">
            {labels.featured}
          </span>
        </div>
      )}

      {/* Duration badge */}
      {film.duration && (
        <div className="absolute end-2 top-2 z-[6]">
          <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
            <Clock className="h-3 w-3" />
            {film.duration} {labels.minutes}
          </span>
        </div>
      )}

      {/* Mobile: Bottom info overlay */}
      <div className="absolute inset-x-0 bottom-0 z-[5] bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 pt-12 md:hidden">
        <h3 className="line-clamp-2 text-sm font-semibold text-white">
          {film.title}
        </h3>
        {hasArabicOriginalTitle && (
          <p
            className="font-arabic mt-0.5 text-xs text-white/70"
            dir="rtl"
            lang="ar"
          >
            {film.originalTitle}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-2 text-xs text-white/60">
          {film.director && <span>{film.director}</span>}
          {film.director && film.releaseYear && <span>•</span>}
          {film.releaseYear && <span>{film.releaseYear}</span>}
        </div>
        {film.rating && (
          <div className="mt-1.5 flex items-center gap-1">
            <Star className="fill-primary text-primary h-3 w-3" />
            <span className="text-xs font-medium text-white">
              {film.rating.toFixed(1)}
            </span>
          </div>
        )}
        {/* Online availability indicator */}
        {film.isAvailableOnline && (
          <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
            <ExternalLink className="h-3 w-3" />
            <span>{labels.watchNow}</span>
          </div>
        )}
      </div>

      {/* Desktop: Hover overlay */}
      <div
        className={cn(
          "absolute inset-0 z-[5] hidden flex-col items-center justify-between p-4",
          "md:flex",
          "opacity-0 transition-all duration-300 ease-out",
          "group-hover:opacity-100"
        )}
      >
        {/* Title at top */}
        <div className="w-full text-center">
          <h3 className="text-lg font-bold text-white drop-shadow-lg">
            {film.title}
          </h3>
          {hasArabicOriginalTitle && (
            <p
              className="font-arabic mt-1 text-sm text-white/90"
              dir="rtl"
              lang="ar"
            >
              {film.originalTitle}
            </p>
          )}
          <div className="mt-2 flex items-center justify-center gap-2 text-sm text-white/70">
            {film.director && <span>{film.director}</span>}
            {film.director && film.releaseYear && <span>•</span>}
            {film.releaseYear && <span>{film.releaseYear}</span>}
          </div>
          {film.rating && (
            <div className="mt-2 flex items-center justify-center gap-1">
              <Star className="fill-primary text-primary h-4 w-4" />
              <span className="text-sm font-medium text-white">
                {film.rating.toFixed(1)}
              </span>
            </div>
          )}
          {/* Genres */}
          {film.genres && film.genres.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-1">
              {film.genres.slice(0, 2).map((genre) => (
                <span
                  key={genre}
                  className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Play button - centered */}
        {showPlayButton && (
          <button
            type="button"
            onClick={handlePlayClick}
            aria-label={labels.playTrailer}
            className={cn(
              "flex h-16 w-16 items-center justify-center",
              "rounded-full bg-white/20 backdrop-blur-sm",
              "transition-all duration-200",
              "hover:scale-110 hover:bg-white/30",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              "active:scale-95",
              // Glow effect
              "shadow-[0_0_30px_rgba(248,235,6,0.3)]",
              "hover:shadow-[0_0_40px_rgba(248,235,6,0.5)]"
            )}
          >
            <Play className="h-8 w-8 fill-white text-white" />
          </button>
        )}

        {!showPlayButton && <div />}

        {/* CTA Button at bottom */}
        <button
          type="button"
          onClick={handleCardClick}
          className={cn(
            "w-full px-6 py-2.5",
            "bg-primary",
            "text-primary-foreground text-sm font-bold tracking-wide uppercase",
            "rounded-full",
            "shadow-lg",
            "transition-all duration-200",
            "hover:shadow-xl hover:brightness-110",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
            "active:scale-95"
          )}
        >
          {film.isAvailableOnline ? labels.watchNow : labels.viewDetails}
        </button>
      </div>
    </article>
  )
}

ShortFilmCard.displayName = "ShortFilmCard"
