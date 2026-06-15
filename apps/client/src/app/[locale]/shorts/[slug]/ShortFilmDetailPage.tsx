"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ShortFilmCard } from "@/features/shorts/components"
import { toShortFilmCard } from "@/features/shorts/types"
import {
  ArrowLeft,
  Award,
  Calendar,
  ChevronRight,
  Clock,
  ExternalLink,
  Globe,
  Play,
  Share2,
  Star,
  User,
} from "lucide-react"
import { useLocale } from "next-intl"

import type { ShortFilm } from "@/features/shorts/types"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// Platform config with default fallback
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
 * Strip HTML tags from text for safe rendering
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "")
}

interface ShortFilmDetailPageProps {
  film: ShortFilm
  relatedShorts: ShortFilm[]
}

export function ShortFilmDetailPage({
  film,
  relatedShorts,
}: ShortFilmDetailPageProps) {
  const router = useRouter()
  const locale = useLocale()
  const isRTL = locale === "ar"

  const handlePlayTrailer = () => {
    if (film.trailer) {
      window.open(film.trailer, "_blank", "noopener,noreferrer")
    }
  }

  const handleWatch = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const handleShare = async () => {
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
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(window.location.href)
    }
  }

  const hasStreamingLinks =
    film.streamingLinks && film.streamingLinks.length > 0
  const synopsisText = film.synopsis ? stripHtmlTags(film.synopsis) : null

  return (
    <div className="bg-background min-h-screen">
      {/* Hero backdrop */}
      <div className="relative">
        <div className="relative aspect-[21/9] w-full md:aspect-[3/1]">
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
            priority
            sizes="100vw"
          />

          {/* Gradient overlays */}
          <div className="from-background via-background/70 absolute inset-0 bg-gradient-to-t to-transparent" />
          <div className="from-background/90 absolute inset-0 bg-gradient-to-r via-transparent to-transparent rtl:bg-gradient-to-l" />

          {/* Vignette */}
          <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.6)]" />
        </div>

        {/* Back button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="absolute start-4 top-4 rounded-full bg-black/50 text-white hover:bg-black/70"
        >
          <ArrowLeft className={cn("h-5 w-5", isRTL && "rotate-180")} />
        </Button>

        {/* Play trailer button */}
        {film.trailer && (
          <button
            onClick={handlePlayTrailer}
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
              "flex h-20 w-20 items-center justify-center md:h-24 md:w-24",
              "rounded-full bg-white/20 backdrop-blur-sm",
              "transition-all duration-200",
              "hover:scale-110 hover:bg-white/30",
              "shadow-[0_0_50px_rgba(248,235,6,0.4)]"
            )}
            aria-label="Regarder la bande-annonce"
          >
            <Play className="h-10 w-10 fill-white text-white md:h-12 md:w-12" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="relative -mt-32 md:-mt-48">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="flex flex-col gap-8 md:flex-row">
            {/* Poster */}
            <div className="relative mx-auto w-48 shrink-0 md:mx-0 md:w-64">
              <div className="aspect-[2/3] overflow-hidden rounded-lg shadow-2xl">
                <Image
                  src={
                    film.poster?.formats?.medium?.url ||
                    film.poster?.url ||
                    "/images/poster-placeholder.jpg"
                  }
                  alt={film.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 192px, 256px"
                />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 pt-4 md:pt-16">
              {/* Title */}
              <h1 className="text-2xl font-bold text-white md:text-4xl">
                {film.title}
              </h1>
              {film.originalTitle && film.originalTitle !== film.title && (
                <p className="mt-1 text-lg text-white/70">
                  {film.originalTitle}
                </p>
              )}

              {/* Meta */}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/80 md:text-base">
                {film.releaseYear && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {film.releaseYear}
                  </span>
                )}
                {film.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {film.duration} min
                  </span>
                )}
                {film.rating && (
                  <span className="flex items-center gap-1">
                    <Star className="fill-primary text-primary h-4 w-4" />
                    {film.rating.toFixed(1)}
                  </span>
                )}
                {film.country && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    {film.country}
                  </span>
                )}
                {film.ageRating && (
                  <Badge variant="outline">{film.ageRating}</Badge>
                )}
              </div>

              {/* Genres */}
              {film.genres && film.genres.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {film.genres.map((genre) => (
                    <Badge key={genre.slug} variant="secondary">
                      {genre.name}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-6 flex flex-wrap gap-3">
                {hasStreamingLinks ? (
                  film.streamingLinks!.map((link, index) => {
                    const config =
                      platformConfig[link.platform] ?? defaultPlatformConfig
                    return (
                      <Button
                        key={index}
                        onClick={() => handleWatch(link.url)}
                        className={cn(
                          "gap-2",
                          config.color,
                          "hover:opacity-90"
                        )}
                        size="lg"
                      >
                        <ExternalLink className="h-5 w-5" />
                        Regarder sur {config.label}
                      </Button>
                    )
                  })
                ) : (
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4" />
                      Ce court métrage n&apos;est pas disponible en streaming.
                    </p>
                  </div>
                )}

                {film.trailer && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handlePlayTrailer}
                    className="gap-2"
                  >
                    <Play className="h-5 w-5" />
                    Bande-annonce
                  </Button>
                )}

                <Button variant="ghost" size="icon" onClick={handleShare}>
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Details section */}
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {/* Synopsis */}
            <div className="md:col-span-2">
              {synopsisText && (
                <div className="mb-8">
                  <h2 className="text-foreground mb-3 text-lg font-semibold">
                    Synopsis
                  </h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {synopsisText}
                  </p>
                </div>
              )}

              {/* Directors */}
              {film.directors && film.directors.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-foreground mb-3 text-lg font-semibold">
                    {film.directors.length > 1 ? "Réalisateurs" : "Réalisateur"}
                  </h2>
                  <div className="flex flex-wrap gap-4">
                    {film.directors.map((director) => (
                      <div
                        key={director.slug}
                        className="flex items-center gap-3"
                      >
                        {director.photo ? (
                          <Image
                            src={
                              director.photo.formats?.thumbnail?.url ||
                              director.photo.url
                            }
                            alt={director.name}
                            width={48}
                            height={48}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
                            <User className="text-muted-foreground h-6 w-6" />
                          </div>
                        )}
                        <span className="text-foreground font-medium">
                          {director.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cast */}
              {film.cast && film.cast.length > 0 && (
                <div>
                  <h2 className="text-foreground mb-3 text-lg font-semibold">
                    Distribution
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {film.cast.slice(0, 8).map((castMember, index) => (
                      <div key={index} className="flex items-center gap-3">
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
                          <span className="text-foreground block text-sm font-medium">
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
            </div>

            {/* Sidebar */}
            <div>
              {/* Awards */}
              {film.awards && film.awards.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-foreground mb-3 flex items-center gap-2 text-lg font-semibold">
                    <Award className="text-primary h-5 w-5" />
                    Récompenses
                  </h2>
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
                            "mt-0.5 h-4 w-4 shrink-0",
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
              <div className="bg-card rounded-lg p-4">
                <h3 className="text-foreground mb-3 font-semibold">
                  Informations
                </h3>
                <dl className="text-sm">
                  {film.language && (
                    <>
                      <dt className="text-muted-foreground">Langue</dt>
                      <dd className="text-foreground mb-2">{film.language}</dd>
                    </>
                  )}
                  {film.country && (
                    <>
                      <dt className="text-muted-foreground">Pays</dt>
                      <dd className="text-foreground mb-2">{film.country}</dd>
                    </>
                  )}
                  {film.releaseYear && (
                    <>
                      <dt className="text-muted-foreground">Année</dt>
                      <dd className="text-foreground mb-2">
                        {film.releaseYear}
                      </dd>
                    </>
                  )}
                  {film.duration && (
                    <>
                      <dt className="text-muted-foreground">Durée</dt>
                      <dd className="text-foreground">
                        {film.duration} minutes
                      </dd>
                    </>
                  )}
                </dl>
              </div>
            </div>
          </div>

          {/* Related shorts */}
          {relatedShorts.length > 0 && (
            <section className="mt-12 pb-12">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-foreground text-xl font-bold">
                  À découvrir aussi
                </h2>
                <Link
                  href={`/${locale}/shorts`}
                  className="text-primary flex items-center gap-1 text-sm hover:underline"
                >
                  Voir tout
                  <ChevronRight
                    className={cn("h-4 w-4", isRTL && "rotate-180")}
                  />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {relatedShorts.map((short) => (
                  <ShortFilmCard
                    key={short.documentId}
                    film={toShortFilmCard(short)}
                    onClick={() =>
                      router.push(`/${locale}/shorts/${short.slug}`)
                    }
                    onPlayTrailer={() => {
                      if (short.trailer) {
                        window.open(
                          short.trailer,
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                    }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
