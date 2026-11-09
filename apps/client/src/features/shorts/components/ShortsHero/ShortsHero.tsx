"use client"

import * as React from "react"
import Image from "next/image"
import Autoplay from "embla-carousel-autoplay"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight, Clock, Play } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import type { ShortFilm } from "../../types"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import {
  formatCount,
  positiveNumber,
  stripHtmlTags,
  toSafeExternalUrl,
} from "../../utils"
import { ReservedArtwork } from "../ReservedArtwork"

export interface ShortsHeroLabels {
  watchTrailer: string
  viewDetails: string
  minutes: string
  featured: string
  slideLabel: string
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
}

export function ShortsHero({
  films,
  onPlayTrailer,
  onViewDetails,
  className,
}: ShortsHeroProps) {
  const locale = useLocale()
  const t = useTranslations("shorts")
  const isRTL = locale === "ar"

  const autoplay = React.useRef(
    Autoplay({
      delay: 6000,
      stopOnInteraction: true,
      stopOnMouseEnter: true,
      // Keyboard users tabbing into a slide must not have it rotate away.
      stopOnFocusIn: true,
    })
  )

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: films.length > 1,
      direction: isRTL ? "rtl" : "ltr",
      align: "start",
    },
    [autoplay.current]
  )

  const [selectedIndex, setSelectedIndex] = React.useState(0)

  const scrollPrev = React.useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = React.useCallback(() => emblaApi?.scrollNext(), [emblaApi])
  const scrollTo = React.useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi]
  )

  const onSelect = React.useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
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

  // Auto-advancing content is motion: honour the OS-level reduced-motion
  // preference (WCAG 2.2.2), and never rotate a single slide.
  React.useEffect(() => {
    if (!emblaApi) return
    const plugin = autoplay.current
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => {
      if (query.matches || films.length < 2) plugin.stop()
      else plugin.play()
    }
    sync()
    query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [emblaApi, films.length])

  if (films.length === 0) {
    return null
  }

  // "Previous" always sits at the inline START and points toward it, so it
  // mirrors in RTL with no per-direction label swapping.
  const PrevIcon = isRTL ? ChevronRight : ChevronLeft
  const NextIcon = isRTL ? ChevronLeft : ChevronRight

  return (
    <section
      className={cn("relative overflow-hidden", className)}
      aria-roledescription="carousel"
      aria-label={t("hero.region")}
    >
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {films.map((film, index) => {
            const mediaUrl =
              film.backdrop?.formats?.large?.url ||
              film.backdrop?.url ||
              film.poster?.formats?.large?.url ||
              film.poster?.url ||
              null
            const trailerUrl = toSafeExternalUrl(film.trailer)
            const duration = positiveNumber(film.duration)
            const year = positiveNumber(film.releaseYear)
            const directors = film.directors ?? []
            const meta: React.ReactNode[] = []
            if (directors.length > 0) {
              meta.push(
                <bdi key="d" className="min-w-0 truncate">
                  {directors.map((d) => d.name).join(", ")}
                </bdi>
              )
            }
            if (year !== null) meta.push(<bdi key="y">{year}</bdi>)
            if (duration !== null) {
              meta.push(
                <span key="m" className="flex items-center gap-1">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  <bdi>
                    {t("durationMinutes", {
                      count: duration,
                      display: formatCount(duration, locale),
                    })}
                  </bdi>
                </span>
              )
            }

            return (
              <div
                key={film.documentId}
                className="relative min-w-0 flex-[0_0_100%]"
                role="group"
                aria-roledescription={t("hero.slideRole")}
                aria-label={t("hero.slide", {
                  index: String(index + 1),
                  total: String(films.length),
                  title: film.title,
                })}
                // Off-screen slides stay out of the tab order and the
                // accessibility tree.
                inert={index !== selectedIndex ? true : undefined}
              >
                <div className="relative aspect-[16/9] w-full md:aspect-[21/9]">
                  {mediaUrl ? (
                    <Image
                      src={mediaUrl}
                      alt=""
                      fill
                      className="object-cover"
                      priority={index === 0}
                      sizes="100vw"
                    />
                  ) : (
                    <ReservedArtwork />
                  )}

                  {/* Scrims carry legibility (no vignette shadow, no text
                      shadow: Flat Chrome). At 70% the field color keeps white
                      text above 4.5:1 even over a white frame. */}
                  <div className="from-background via-background/70 to-background/10 absolute inset-0 bg-gradient-to-t" />
                  <div className="from-background/80 absolute inset-0 bg-gradient-to-r via-transparent to-transparent rtl:bg-gradient-to-l" />
                </div>

                <div className="absolute inset-0 flex items-end">
                  <div className="w-full min-w-0 px-4 pb-12 md:w-2/3 md:px-8 md:pb-14 lg:w-1/2 lg:px-12">
                    <div className="mb-3">
                      {/* Editorial label, not an action: neutral chip. */}
                      <span className="bg-aubergine-deep/80 text-foreground border-border inline-block rounded-[8px] border px-[11px] py-1 text-[11px] leading-[1.4] font-semibold">
                        {t("hero.region")}
                      </span>
                    </div>

                    <h2 className="mb-2 line-clamp-2 text-2xl font-bold break-words text-white md:text-4xl lg:text-5xl">
                      <bdi>{film.title}</bdi>
                    </h2>

                    {film.originalTitle &&
                      film.originalTitle !== film.title && (
                        <p
                          className="mb-3 line-clamp-1 text-base text-white/70 md:text-lg"
                          dir="auto"
                        >
                          {film.originalTitle}
                        </p>
                      )}

                    {meta.length > 0 && (
                      <div className="mb-4 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/80 md:text-base">
                        {meta.map((part, i) => (
                          <React.Fragment key={i}>
                            {i > 0 && (
                              <span
                                className="text-white/40"
                                aria-hidden="true"
                              >
                                •
                              </span>
                            )}
                            {part}
                          </React.Fragment>
                        ))}
                      </div>
                    )}

                    {film.genres && film.genres.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        {film.genres.slice(0, 3).map((genre) => (
                          <span
                            key={genre.slug}
                            className="rounded-full border border-white/30 px-3 py-1 text-xs text-white/90"
                          >
                            <bdi>{genre.name}</bdi>
                          </span>
                        ))}
                      </div>
                    )}

                    {film.synopsis && (
                      <p className="mb-6 line-clamp-2 text-sm text-white/70 md:line-clamp-3 md:text-base">
                        {stripHtmlTags(film.synopsis)}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-3">
                      {trailerUrl && onPlayTrailer && (
                        <Button
                          onClick={() => onPlayTrailer(film)}
                          className="gap-2"
                          size="lg"
                        >
                          <Play
                            className="h-5 w-5 fill-current"
                            aria-hidden="true"
                          />
                          {t("hero.watchTrailer")}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => onViewDetails?.(film)}
                        className="border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                      >
                        {t("hero.viewDetails")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {films.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={scrollPrev}
            className={cn(
              "absolute start-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 rounded-full bg-black/30 text-white backdrop-blur-sm md:flex",
              "hover:bg-black/50"
            )}
            aria-label={t("hero.previous")}
          >
            <PrevIcon className="h-6 w-6" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={scrollNext}
            className={cn(
              "absolute end-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 rounded-full bg-black/30 text-white backdrop-blur-sm md:flex",
              "hover:bg-black/50"
            )}
            aria-label={t("hero.next")}
          >
            <NextIcon className="h-6 w-6" aria-hidden="true" />
          </Button>

          {/* Each dot is a 44px target around an 8px visual. */}
          <div className="absolute inset-x-0 bottom-1 z-10 flex justify-center">
            {films.map((film, index) => (
              <button
                key={film.documentId}
                type="button"
                onClick={() => scrollTo(index)}
                className="group/dot flex h-11 min-w-11 items-center justify-center"
                aria-label={t("hero.goToSlide", {
                  index: String(index + 1),
                  total: String(films.length),
                })}
                aria-current={index === selectedIndex ? "true" : undefined}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "block h-2 rounded-full transition-all duration-300",
                    index === selectedIndex
                      ? "bg-primary w-6"
                      : "w-2 bg-white/50 group-hover/dot:bg-white/70"
                  )}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

ShortsHero.displayName = "ShortsHero"
