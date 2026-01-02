"use client"

import Image from "next/image"
import Link from "next/link"
import { Play } from "lucide-react"

import type { MouseEvent } from "react"
import type { FilmCardFilm, FilmCardLabels } from "../../types/film.types"

import { cn } from "@/lib/utils"
import { isArabic } from "@/lib/utils/isArabic"

import { FilmCardSkeleton } from "./FilmCardSkeleton"

// Placeholder blur data URL for images
const BLUR_DATA_URL =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAYH/8QAIhAAAgEEAgIDAQAAAAAAAAAAAQIDAAQFESEGEhMxQVFh/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQADAQEBAAAAAAAAAAAAAAABAgMAEUH/2gAMAwEAAhEDEEA/ANM4/wAix+TwGNvIZ4Xknt0kkiWVWeNmUEqw+iCexrxSlOhIqnAiYp//2Q=="

const defaultLabels: FilmCardLabels = {
  showtimes: "Séances",
  playTrailer: "Voir la bande-annonce",
}

export interface FilmCardProps {
  /** Film data to display */
  film: FilmCardFilm
  /** Show the play trailer button on hover */
  showPlayTrailerButton?: boolean
  /** Whether to show loading skeleton */
  isLoading?: boolean
  /** Called when play trailer button is clicked */
  onPlayTrailer?: () => void
  /** Called when the card/Séances button is clicked */
  onClick?: () => void
  /** Additional class names */
  className?: string
  /** Localized labels */
  labels?: FilmCardLabels
}

export function FilmCard({
  film,
  showPlayTrailerButton = false,
  isLoading = false,
  onPlayTrailer,
  onClick,
  className,
  labels = defaultLabels,
}: FilmCardProps) {
  // Handle play trailer click without triggering navigation
  const handlePlayTrailerClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onPlayTrailer?.()
  }

  // Handle CTA button click
  const handleCtaClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onClick?.()
  }

  if (isLoading) {
    return <FilmCardSkeleton className={className} />
  }

  const hasArabicOriginalTitle =
    film.originalTitle &&
    film.originalTitle !== film.title &&
    isArabic(film.originalTitle)

  const filmUrl = `/films/${film.slug}`

  return (
    <article
      aria-label={film.title}
      className={cn(
        // Base styles
        "group relative overflow-hidden rounded-lg",
        // Size - 2:3 aspect ratio
        "aspect-[2/3] w-full",
        className
      )}
    >
      {/* Mobile: Direct link wrapping entire card */}
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
          // Desktop: dim on hover
          "transition-opacity duration-300 ease-in-out",
          "md:group-hover:opacity-25"
        )}
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
      />

      {/* Mobile: Title overlay at bottom - always visible */}
      <div className="absolute inset-x-0 bottom-0 z-[5] bg-gradient-to-t from-black/80 to-transparent p-3 md:hidden">
        <h3 className="text-sm font-semibold text-white drop-shadow-md">
          {film.title}
        </h3>
        {hasArabicOriginalTitle && (
          <p
            className="font-arabic mt-0.5 text-xs text-white/80"
            dir="rtl"
            lang="ar"
          >
            {film.originalTitle}
          </p>
        )}
      </div>

      {/* Desktop: Hover overlay - hidden on mobile */}
      <div
        className={cn(
          "absolute inset-0 z-[5] hidden flex-col items-center justify-between p-4",
          // Desktop visibility
          "md:flex",
          // Fade in on hover
          "opacity-0 transition-opacity duration-300 ease-in-out",
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
              className="font-arabic mt-1 text-sm text-white/90 drop-shadow-md"
              dir="rtl"
              lang="ar"
            >
              {film.originalTitle}
            </p>
          )}
        </div>

        {/* Play button - centered, at top third */}
        {showPlayTrailerButton && (
          <button
            type="button"
            onClick={handlePlayTrailerClick}
            aria-label={labels.playTrailer}
            className={cn(
              // Size - 44x44px minimum touch target
              "flex h-14 w-14 items-center justify-center",
              // Styling
              "rounded-full bg-white/20 backdrop-blur-sm",
              // Hover state
              "transition-all duration-200",
              "hover:scale-110 hover:bg-white/30",
              // Focus styles
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              // Active state
              "active:scale-95"
            )}
          >
            <Play className="h-7 w-7 fill-white text-white" />
          </button>
        )}

        {/* Spacer when no play button */}
        {!showPlayTrailerButton && <div />}

        {/* CTA Button at bottom */}
        <button
          type="button"
          onClick={handleCtaClick}
          className={cn(
            // Size
            "w-full px-6 py-2.5",
            // Gradient background - Tiween brand colors
            "to-primary bg-gradient-to-r from-teal-500",
            // Text styling
            "text-background text-sm font-bold tracking-wide uppercase",
            // Shape
            "rounded-full",
            // Shadow
            "shadow-lg",
            // Hover state
            "transition-all duration-200",
            "hover:shadow-xl hover:brightness-110",
            // Focus styles
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
            // Active state
            "active:scale-95"
          )}
        >
          {labels.showtimes}
        </button>
      </div>
    </article>
  )
}

FilmCard.displayName = "FilmCard"
