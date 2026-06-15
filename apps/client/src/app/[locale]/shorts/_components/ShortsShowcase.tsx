"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Play,
  Star,
  Volume2,
  VolumeX,
} from "lucide-react"

import type { ShortFilm } from "@/features/shorts/types"

interface ShortsShowcaseProps {
  locale: string
  featuredFilms: ShortFilm[]
  latestFilms: ShortFilm[]
  awardWinners: ShortFilm[]
  dramaFilms: ShortFilm[]
  allFilms: ShortFilm[]
  genres: { slug: string; name: string }[]
}

export function ShortsShowcase({
  locale,
  featuredFilms,
  latestFilms,
  awardWinners,
  dramaFilms,
  allFilms,
  genres,
}: ShortsShowcaseProps) {
  const [activeHeroIndex, setActiveHeroIndex] = useState(0)
  const [isMuted, setIsMuted] = useState(true)
  const heroFilm = featuredFilms[activeHeroIndex]

  // Auto-rotate hero every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveHeroIndex((prev) => (prev + 1) % featuredFilms.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [featuredFilms.length])

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#032523]">
      {/* Film grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Hero Section */}
      <section className="relative h-[85vh] min-h-[600px] w-full">
        {/* Hero Background */}
        <div className="absolute inset-0">
          {heroFilm?.backdrop?.url || heroFilm?.poster?.url ? (
            <Image
              src={heroFilm.backdrop?.url || heroFilm.poster?.url || ""}
              alt={heroFilm.title}
              fill
              priority
              className="object-cover transition-all duration-1000"
              sizes="100vw"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#0A3533] to-[#032523]" />
          )}

          {/* Multi-layer gradient overlay for cinematic depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#032523] via-[#032523]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#032523]/90 via-[#032523]/30 to-transparent" />
          <div className="absolute inset-0 bg-[#032523]/20" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex h-full flex-col justify-end px-6 pb-32 md:px-12 lg:px-16">
          {/* Title with animation */}
          <div
            key={heroFilm?.slug}
            className="animate-in fade-in slide-in-from-bottom-4 duration-700"
          >
            {/* Original Title (Arabic) */}
            {heroFilm?.originalTitle && (
              <p className="font-arabic mb-2 text-2xl text-white/60 md:text-3xl">
                {heroFilm.originalTitle}
              </p>
            )}

            {/* Main Title */}
            <h1 className="font-display mb-4 max-w-3xl text-5xl leading-tight text-white md:text-7xl lg:text-8xl">
              {heroFilm?.title}
            </h1>

            {/* Meta info row */}
            <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-white/80 md:text-base">
              {heroFilm?.rating && (
                <span className="flex items-center gap-1.5 rounded-md bg-[#F8EB06]/20 px-2.5 py-1 font-semibold text-[#F8EB06]">
                  <Star className="h-4 w-4 fill-current" />
                  {heroFilm.rating.toFixed(1)}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {heroFilm?.duration} min
              </span>
              <span>{heroFilm?.releaseYear}</span>
              {heroFilm?.directors?.[0] && (
                <span className="text-white/60">
                  Réalisé par{" "}
                  <span className="text-white">
                    {heroFilm.directors[0].name}
                  </span>
                </span>
              )}
              {heroFilm?.awards && heroFilm.awards.length > 0 && (
                <span className="flex items-center gap-1.5 text-[#F8EB06]">
                  <Award className="h-4 w-4" />
                  {heroFilm.awards.length} Prix
                </span>
              )}
            </div>

            {/* Synopsis */}
            <p className="mb-8 max-w-2xl text-base leading-relaxed text-white/70 md:text-lg">
              {heroFilm?.synopsis?.slice(0, 200)}...
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <Link
                href={`/${locale}/shorts/${heroFilm?.slug}`}
                className="group flex items-center gap-3 rounded-lg bg-[#F8EB06] px-8 py-4 font-semibold text-[#032523] transition-all hover:scale-105 hover:bg-white"
              >
                <Play className="h-6 w-6 fill-current transition-transform group-hover:scale-110" />
                Regarder
              </Link>
              <Link
                href={`/${locale}/shorts/${heroFilm?.slug}`}
                className="flex items-center gap-3 rounded-lg bg-white/10 px-8 py-4 font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                <Info className="h-5 w-5" />
                Plus d'infos
              </Link>
            </div>
          </div>

          {/* Hero Navigation Dots */}
          <div className="absolute bottom-8 left-6 flex gap-2 md:left-12 lg:left-16">
            {featuredFilms.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveHeroIndex(idx)}
                className={`h-1 rounded-full transition-all duration-300 ${
                  idx === activeHeroIndex
                    ? "w-8 bg-[#F8EB06]"
                    : "w-4 bg-white/40 hover:bg-white/60"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Sound toggle (decorative) */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="absolute right-6 bottom-8 rounded-full border border-white/30 p-3 text-white/60 transition-all hover:border-white/50 hover:text-white md:right-12 lg:right-16"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </button>
        </div>
      </section>

      {/* Content Rows */}
      <div className="relative z-20 -mt-24 space-y-12 pb-20">
        {/* Featured Row */}
        <FilmRow
          title="À la Une"
          films={featuredFilms}
          locale={locale}
          featured
        />

        {/* Award Winners */}
        {awardWinners.length > 0 && (
          <FilmRow
            title="Primés & Sélectionnés"
            subtitle="Films récompensés dans les festivals internationaux"
            films={awardWinners}
            locale={locale}
            showAwards
          />
        )}

        {/* Latest Films */}
        <FilmRow
          title="Ajoutés Récemment"
          films={latestFilms}
          locale={locale}
        />

        {/* Drama Films */}
        <FilmRow
          title="Drames Tunisiens"
          subtitle="Histoires poignantes du cinéma tunisien"
          films={dramaFilms}
          locale={locale}
        />

        {/* All Films */}
        <FilmRow
          title="Tous les Courts Métrages"
          films={allFilms}
          locale={locale}
        />

        {/* Genre Pills */}
        <section className="px-6 md:px-12 lg:px-16">
          <h2 className="mb-6 text-xl font-semibold text-white">
            Explorer par Genre
          </h2>
          <div className="flex flex-wrap gap-3">
            {genres.map((genre) => (
              <button
                key={genre.slug}
                className="rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80 backdrop-blur-sm transition-all hover:border-[#F8EB06]/50 hover:bg-[#F8EB06]/10 hover:text-[#F8EB06]"
              >
                {genre.name}
              </button>
            ))}
          </div>
        </section>

        {/* Back Link */}
        <div className="px-6 pt-8 md:px-12 lg:px-16">
          <Link
            href={`/${locale}/desktop-prototypes`}
            className="text-sm text-white/50 transition-colors hover:text-[#F8EB06]"
          >
            ← Retour aux prototypes
          </Link>
        </div>
      </div>
    </div>
  )
}

// Film Row Component with horizontal scroll
interface FilmRowProps {
  title: string
  subtitle?: string
  films: ShortFilm[]
  locale: string
  featured?: boolean
  showAwards?: boolean
}

function FilmRow({
  title,
  subtitle,
  films,
  locale,
  featured,
  showAwards,
}: FilmRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  useEffect(() => {
    checkScroll()
    const ref = scrollRef.current
    if (ref) {
      ref.addEventListener("scroll", checkScroll)
      return () => ref.removeEventListener("scroll", checkScroll)
    }
  }, [])

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.75
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  return (
    <section className="group/row relative">
      {/* Title */}
      <div className="mb-4 px-6 md:px-12 lg:px-16">
        <h2 className="text-xl font-semibold text-white md:text-2xl">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
      </div>

      {/* Scroll Container */}
      <div className="relative">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute top-1/2 left-2 z-30 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white opacity-0 backdrop-blur-sm transition-all group-hover/row:opacity-100 hover:bg-black/80 md:left-4"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute top-1/2 right-2 z-30 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white opacity-0 backdrop-blur-sm transition-all group-hover/row:opacity-100 hover:bg-black/80 md:right-4"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {/* Films */}
        <div
          ref={scrollRef}
          className="no-scrollbar flex gap-3 overflow-x-auto px-6 md:gap-4 md:px-12 lg:px-16"
        >
          {films.map((film, idx) => (
            <FilmCard
              key={film.slug}
              film={film}
              locale={locale}
              index={idx}
              featured={featured}
              showAward={showAwards}
            />
          ))}
        </div>

        {/* Gradient Edges */}
        <div className="pointer-events-none absolute top-0 left-0 h-full w-12 bg-gradient-to-r from-[#032523] to-transparent md:w-16" />
        <div className="pointer-events-none absolute top-0 right-0 h-full w-12 bg-gradient-to-l from-[#032523] to-transparent md:w-16" />
      </div>
    </section>
  )
}

// Film Card with Netflix-style hover effect
interface FilmCardProps {
  film: ShortFilm
  locale: string
  index: number
  featured?: boolean
  showAward?: boolean
}

function FilmCard({ film, locale, index, featured, showAward }: FilmCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Link
      href={`/${locale}/shorts/${film.slug}`}
      className="group relative flex-shrink-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Card Container with hover scale */}
      <div
        className={`relative overflow-hidden rounded-lg transition-all duration-300 ease-out ${
          featured
            ? "h-[280px] w-[200px] md:h-[320px] md:w-[230px]"
            : "h-[180px] w-[280px] md:h-[200px] md:w-[320px]"
        } ${
          isHovered
            ? "z-20 scale-110 shadow-2xl shadow-black/50"
            : "z-10 scale-100"
        }`}
      >
        {/* Image */}
        {film.poster?.url || film.backdrop?.url ? (
          <Image
            src={
              featured
                ? film.poster?.url || film.backdrop?.url || ""
                : film.backdrop?.url || film.poster?.url || ""
            }
            alt={film.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes={
              featured
                ? "(max-width: 768px) 200px, 230px"
                : "(max-width: 768px) 280px, 320px"
            }
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#0A3533] to-[#0F4542]" />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Award Badge */}
        {showAward && film.awards && film.awards.length > 0 && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-[#F8EB06] px-2.5 py-1 text-xs font-bold text-[#032523]">
            <Award className="h-3.5 w-3.5" />
            {film.awards.some((a) => a.won) ? "Lauréat" : "Sélectionné"}
          </div>
        )}

        {/* Rating Badge */}
        {film.rating && film.rating >= 8 && !showAward && (
          <div className="absolute top-3 right-3 flex items-center gap-1 rounded bg-[#F8EB06]/90 px-2 py-0.5 text-xs font-bold text-[#032523]">
            <Star className="h-3 w-3 fill-current" />
            {film.rating.toFixed(1)}
          </div>
        )}

        {/* Content (visible on hover) */}
        <div
          className={`absolute inset-x-0 bottom-0 p-4 transition-all duration-300 ${
            isHovered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          <h3 className="mb-1 line-clamp-1 font-semibold text-white">
            {film.title}
          </h3>
          <div className="mb-2 flex items-center gap-2 text-xs text-white/70">
            <span>{film.releaseYear}</span>
            <span className="h-1 w-1 rounded-full bg-white/40" />
            <span>{film.duration} min</span>
            {film.rating && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/40" />
                <span className="flex items-center gap-0.5 text-[#F8EB06]">
                  <Star className="h-3 w-3 fill-current" />
                  {film.rating.toFixed(1)}
                </span>
              </>
            )}
          </div>
          {film.directors?.[0] && (
            <p className="line-clamp-1 text-xs text-white/50">
              {film.directors[0].name}
            </p>
          )}
        </div>

        {/* Default Title (when not hovered) */}
        <div
          className={`absolute inset-x-0 bottom-0 p-4 transition-all duration-300 ${
            isHovered ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
          }`}
        >
          <h3 className="line-clamp-2 text-sm font-medium text-white drop-shadow-lg">
            {film.title}
          </h3>
        </div>

        {/* Play Icon on Hover */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-[#032523] shadow-lg backdrop-blur-sm transition-transform group-hover:scale-110">
            <Play className="ml-1 h-6 w-6 fill-current" />
          </div>
        </div>
      </div>
    </Link>
  )
}
