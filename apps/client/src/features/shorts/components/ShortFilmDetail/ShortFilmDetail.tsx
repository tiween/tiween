"use client"

import * as React from "react"
import Image from "next/image"
import {
  Award,
  Calendar,
  Clock,
  ExternalLink,
  Globe,
  Play,
  Share2,
  Star,
  User,
  X,
} from "lucide-react"

import type { ShortFilm } from "../../types"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

// Platform icons/colors with default fallback
const defaultPlatformConfig = { label: "Autre", color: "bg-zinc-600" }
const platformConfig: Record<string, { label: string; color: string }> = {
  youtube: { label: "YouTube", color: "bg-red-600" },
  vimeo: { label: "Vimeo", color: "bg-sky-500" },
  dailymotion: { label: "Dailymotion", color: "bg-blue-600" },
  mubi: { label: "MUBI", color: "bg-zinc-800" },
  netflix: { label: "Netflix", color: "bg-red-700" },
  other: defaultPlatformConfig,
}

/**
 * Strip HTML tags from synopsis for safe rendering
 * Synopsis comes from Strapi CMS which is a trusted source,
 * but we strip HTML to ensure plain text display
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "")
}

export interface ShortFilmDetailLabels {
  watchNow: string
  watchTrailer: string
  notAvailableOnline: string
  notAvailableMessage: string
  minutes: string
  synopsis: string
  director: string
  directors: string
  cast: string
  genres: string
  country: string
  language: string
  releaseYear: string
  rating: string
  awards: string
  watchOn: string
  share: string
  close: string
}

const defaultLabels: ShortFilmDetailLabels = {
  watchNow: "Regarder",
  watchTrailer: "Bande-annonce",
  notAvailableOnline: "Non disponible en ligne",
  notAvailableMessage:
    "Ce court métrage n'est pas disponible en streaming. Vous pouvez le découvrir lors de projections en festival ou en salle.",
  minutes: "min",
  synopsis: "Synopsis",
  director: "Réalisateur",
  directors: "Réalisateurs",
  cast: "Distribution",
  genres: "Genres",
  country: "Pays",
  language: "Langue",
  releaseYear: "Année",
  rating: "Note",
  awards: "Récompenses",
  watchOn: "Regarder sur",
  share: "Partager",
  close: "Fermer",
}

export interface ShortFilmDetailProps {
  /** Short film data */
  film: ShortFilm | null
  /** Whether the dialog is open */
  isOpen: boolean
  /** Called when dialog should close */
  onClose: () => void
  /** Called when play trailer is clicked */
  onPlayTrailer?: (film: ShortFilm) => void
  /** Called when watch link is clicked */
  onWatch?: (film: ShortFilm, url: string) => void
  /** Additional class names */
  className?: string
  /** Localized labels */
  labels?: ShortFilmDetailLabels
}

export function ShortFilmDetail({
  film,
  isOpen,
  onClose,
  onPlayTrailer,
  onWatch,
  className,
  labels = defaultLabels,
}: ShortFilmDetailProps) {
  const handleShare = async () => {
    if (!film) return

    const shareData = {
      title: film.title,
      text: film.synopsis
        ? stripHtmlTags(film.synopsis).slice(0, 200)
        : film.title,
      url: window.location.href,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href)
    }
  }

  if (!film) return null

  const hasStreamingLinks =
    film.streamingLinks && film.streamingLinks.length > 0
  const synopsisText = film.synopsis ? stripHtmlTags(film.synopsis) : null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn("max-h-[90vh] max-w-3xl overflow-hidden p-0", className)}
      >
        {/* Visually hidden title for accessibility */}
        <DialogTitle className="sr-only">{film.title}</DialogTitle>

        {/* Header with backdrop */}
        <div className="relative aspect-video w-full">
          <Image
            src={
              film.backdrop?.formats?.large?.url ||
              film.backdrop?.url ||
              film.poster?.formats?.large?.url ||
              film.poster?.url ||
              "/images/backdrop-placeholder.jpg"
            }
            alt={film.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
          />

          {/* Gradient overlay */}
          <div className="from-background via-background/60 absolute inset-0 bg-gradient-to-t to-transparent" />

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute end-4 top-4 rounded-full bg-black/50 text-white hover:bg-black/70"
            aria-label={labels.close}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Play trailer button overlay */}
          {film.trailer && (
            <button
              onClick={() => onPlayTrailer?.(film)}
              className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                "flex h-20 w-20 items-center justify-center",
                "rounded-full bg-white/20 backdrop-blur-sm",
                "transition-all duration-200",
                "hover:scale-110 hover:bg-white/30",
                "shadow-[0_0_40px_rgba(248,235,6,0.3)]"
              )}
              aria-label={labels.watchTrailer}
            >
              <Play className="h-10 w-10 fill-white text-white" />
            </button>
          )}

          {/* Title overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 p-6">
            <h2 className="text-2xl font-bold text-white drop-shadow-lg md:text-3xl">
              {film.title}
            </h2>
            {film.originalTitle && film.originalTitle !== film.title && (
              <p className="mt-1 text-lg text-white/70">{film.originalTitle}</p>
            )}

            {/* Meta badges */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/80">
              {film.releaseYear && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {film.releaseYear}
                </span>
              )}
              {film.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {film.duration} {labels.minutes}
                </span>
              )}
              {film.rating && (
                <span className="flex items-center gap-1">
                  <Star className="text-primary fill-primary h-4 w-4" />
                  {film.rating.toFixed(1)}
                </span>
              )}
              {film.country && (
                <span className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  {film.country}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[50vh] space-y-6 overflow-y-auto p-6">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            {hasStreamingLinks ? (
              film.streamingLinks!.map((link, index) => {
                const config =
                  platformConfig[link.platform] ?? defaultPlatformConfig
                return (
                  <Button
                    key={index}
                    onClick={() => onWatch?.(film, link.url)}
                    className={cn("gap-2", config.color, "hover:opacity-90")}
                  >
                    <ExternalLink className="h-4 w-4" />
                    {labels.watchOn} {config.label}
                  </Button>
                )
              })
            ) : (
              <div className="bg-muted rounded-lg p-4">
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4" />
                  {labels.notAvailableMessage}
                </p>
              </div>
            )}

            {film.trailer && (
              <Button
                variant="outline"
                onClick={() => onPlayTrailer?.(film)}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                {labels.watchTrailer}
              </Button>
            )}

            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Genres */}
          {film.genres && film.genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {film.genres.map((genre) => (
                <Badge key={genre.slug} variant="secondary">
                  {genre.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Synopsis - rendered as plain text for security */}
          {synopsisText && (
            <div>
              <h3 className="text-foreground mb-2 font-semibold">
                {labels.synopsis}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                {synopsisText}
              </p>
            </div>
          )}

          {/* Directors */}
          {film.directors && film.directors.length > 0 && (
            <div>
              <h3 className="text-foreground mb-2 font-semibold">
                {film.directors.length > 1 ? labels.directors : labels.director}
              </h3>
              <div className="flex flex-wrap gap-3">
                {film.directors.map((director) => (
                  <div key={director.slug} className="flex items-center gap-2">
                    {director.photo ? (
                      <Image
                        src={
                          director.photo.formats?.thumbnail?.url ||
                          director.photo.url
                        }
                        alt={director.name}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                        <User className="text-muted-foreground h-5 w-5" />
                      </div>
                    )}
                    <span className="text-foreground">{director.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cast */}
          {film.cast && film.cast.length > 0 && (
            <div>
              <h3 className="text-foreground mb-2 font-semibold">
                {labels.cast}
              </h3>
              <div className="flex flex-wrap gap-3">
                {film.cast.slice(0, 6).map((castMember, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {castMember.person.photo ? (
                      <Image
                        src={
                          castMember.person.photo.formats?.thumbnail?.url ||
                          castMember.person.photo.url
                        }
                        alt={castMember.person.name}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                        <User className="text-muted-foreground h-5 w-5" />
                      </div>
                    )}
                    <div>
                      <span className="text-foreground block text-sm">
                        {castMember.person.name}
                      </span>
                      {castMember.role && (
                        <span className="text-muted-foreground text-xs">
                          {castMember.role}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Awards */}
          {film.awards && film.awards.length > 0 && (
            <div>
              <h3 className="text-foreground mb-2 flex items-center gap-2 font-semibold">
                <Award className="text-primary h-5 w-5" />
                {labels.awards}
              </h3>
              <ul className="space-y-2">
                {film.awards.map((award, index) => (
                  <li
                    key={index}
                    className={cn(
                      "flex items-start gap-2 text-sm",
                      award.won ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <Award
                      className={cn(
                        "mt-0.5 h-4 w-4",
                        award.won && "fill-primary"
                      )}
                    />
                    <span>
                      {award.name}
                      {award.category && ` - ${award.category}`}
                      {award.year && ` (${award.year})`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Additional info */}
          <div className="text-muted-foreground grid gap-2 text-sm sm:grid-cols-2">
            {film.language && (
              <div>
                <span className="text-foreground font-medium">
                  {labels.language}:
                </span>{" "}
                {film.language}
              </div>
            )}
            {film.ageRating && (
              <div>
                <Badge variant="outline">{film.ageRating}</Badge>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

ShortFilmDetail.displayName = "ShortFilmDetail"
