"use client"

import * as React from "react"
import Image from "next/image"
import Autoplay from "embla-carousel-autoplay"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight, Clock, Play, Star } from "lucide-react"
import { useLocale } from "next-intl"

import type { ShortFilm } from "../../types"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface ShortsHeroLabels {
  watchTrailer: string
  viewDetails: string
  minutes: string
  featured: string
  slideLabel: string
}

const defaultLabels: ShortsHeroLabels = {
  watchTrailer: "Bande-annonce",
  viewDetails: "Découvrir",
  minutes: "min",
  featured: "À la une",
  slideLabel: "Diapositive",
}

export interface ShortsHeroProps {
  /** Featured short films to display */
  films: ShortFilm[]
  /** Called when play trailer is clicked */
  onPlayTrailer?: (film: ShortFilm) => void
  /** Called when view details is clicked */
  onViewDetails?: (film: ShortFilm) => void
  /** Additional class names */
  className?: string
  /** Localized labels */
  labels?: ShortsHeroLabels
}

export function ShortsHero({
  films,
  onPlayTrailer,
  onViewDetails,
  className,
  labels = defaultLabels,
}: ShortsHeroProps) {
  const locale = useLocale()
  const isRTL = locale === "ar"

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      direction: isRTL ? "rtl" : "ltr",
      align: "start",
    },
    [
      Autoplay({
        delay: 6000,
        stopOnInteraction: true,
        stopOnMouseEnter: true,
      }),
    ]
  )

  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [canScrollPrev, setCanScrollPrev] = React.useState(false)
  const [canScrollNext, setCanScrollNext] = React.useState(false)

  const scrollPrev = React.useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = React.useCallback(() => emblaApi?.scrollNext(), [emblaApi])
  const scrollTo = React.useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi]
  )

  const onSelect = React.useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
    setCanScrollPrev(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())
  }, [emblaApi])

  React.useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on("select", onSelect)
    emblaApi.on("reInit", onSelect)
    return () => {
      emblaApi.off("select", onSelect)
      emblaApi.off("reInit", onSelect)
    }
  }, [emblaApi, onSelect])

  if (films.length === 0) {
    return null
  }

  return (
    <section
      className={cn("relative overflow-hidden", className)}
      aria-label={labels.featured}
    >
      {/* Carousel container */}
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {films.map((film, index) => (
            <div
              key={film.documentId}
              className="relative min-w-0 flex-[0_0_100%]"
              role="group"
              aria-roledescription="slide"
              aria-label={`${labels.slideLabel} ${index + 1} / ${films.length}: ${film.title}`}
            >
              {/* Backdrop image */}
              <div className="relative aspect-[16/9] w-full md:aspect-[21/9]">
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
                  priority={index === 0}
                  sizes="100vw"
                />

                {/* Gradient overlays */}
                <div className="from-background via-background/60 absolute inset-0 bg-gradient-to-t to-transparent" />
                <div className="from-background/80 absolute inset-0 bg-gradient-to-r via-transparent to-transparent rtl:bg-gradient-to-l" />

                {/* Vignette effect */}
                <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
              </div>

              {/* Content overlay */}
              <div className="absolute inset-0 flex items-end">
                <div className="w-full px-4 pb-8 md:w-2/3 md:px-8 md:pb-12 lg:w-1/2 lg:px-12">
                  {/* Featured badge */}
                  <div className="mb-3">
                    <span className="bg-primary text-primary-foreground inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase">
                      {labels.featured}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="mb-2 text-2xl font-bold text-white drop-shadow-lg md:text-4xl lg:text-5xl">
                    {film.title}
                  </h2>

                  {/* Original title if different */}
                  {film.originalTitle && film.originalTitle !== film.title && (
                    <p className="mb-3 text-base text-white/70 md:text-lg">
                      {film.originalTitle}
                    </p>
                  )}

                  {/* Meta info */}
                  <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-white/80 md:text-base">
                    {film.directors && film.directors.length > 0 && (
                      <span>
                        {film.directors.map((d) => d.name).join(", ")}
                      </span>
                    )}
                    {film.releaseYear && (
                      <>
                        <span className="text-white/40">•</span>
                        <span>{film.releaseYear}</span>
                      </>
                    )}
                    {film.duration && (
                      <>
                        <span className="text-white/40">•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {film.duration} {labels.minutes}
                        </span>
                      </>
                    )}
                    {film.rating && (
                      <>
                        <span className="text-white/40">•</span>
                        <span className="flex items-center gap-1">
                          <Star className="text-primary fill-primary h-4 w-4" />
                          {film.rating.toFixed(1)}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Genres */}
                  {film.genres && film.genres.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {film.genres.slice(0, 3).map((genre) => (
                        <span
                          key={genre.slug}
                          className="rounded-full border border-white/30 px-3 py-1 text-xs text-white/90"
                        >
                          {genre.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Synopsis */}
                  {film.synopsis && (
                    <p className="mb-6 line-clamp-2 text-sm text-white/70 md:line-clamp-3 md:text-base">
                      {film.synopsis.replace(/<[^>]*>/g, "")}
                    </p>
                  )}

                  {/* CTA buttons */}
                  <div className="flex flex-wrap gap-3">
                    {film.trailer && (
                      <Button
                        onClick={() => onPlayTrailer?.(film)}
                        className="gap-2"
                        size="lg"
                      >
                        <Play className="h-5 w-5 fill-current" />
                        {labels.watchTrailer}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => onViewDetails?.(film)}
                      className="border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                    >
                      {labels.viewDetails}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows - desktop only */}
      {films.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            className={cn(
              "absolute top-1/2 hidden h-12 w-12 -translate-y-1/2 rounded-full bg-black/30 text-white backdrop-blur-sm md:flex",
              "hover:bg-black/50",
              "disabled:opacity-30",
              isRTL ? "end-4" : "start-4"
            )}
            aria-label={isRTL ? "التالي" : "Précédent"}
          >
            {isRTL ? (
              <ChevronRight className="h-6 w-6" />
            ) : (
              <ChevronLeft className="h-6 w-6" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={scrollNext}
            disabled={!canScrollNext}
            className={cn(
              "absolute top-1/2 hidden h-12 w-12 -translate-y-1/2 rounded-full bg-black/30 text-white backdrop-blur-sm md:flex",
              "hover:bg-black/50",
              "disabled:opacity-30",
              isRTL ? "start-4" : "end-4"
            )}
            aria-label={isRTL ? "السابق" : "Suivant"}
          >
            {isRTL ? (
              <ChevronLeft className="h-6 w-6" />
            ) : (
              <ChevronRight className="h-6 w-6" />
            )}
          </Button>
        </>
      )}

      {/* Dot indicators */}
      {films.length > 1 && (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {films.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === selectedIndex
                  ? "bg-primary w-6"
                  : "w-2 bg-white/50 hover:bg-white/70"
              )}
              aria-label={`${labels.slideLabel} ${index + 1}`}
              aria-current={index === selectedIndex ? "true" : "false"}
            />
          ))}
        </div>
      )}
    </section>
  )
}

ShortsHero.displayName = "ShortsHero"
