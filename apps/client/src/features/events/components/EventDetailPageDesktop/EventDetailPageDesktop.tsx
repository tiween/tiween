"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Heart,
  Home,
  MapPin,
  Share2,
  Star,
  Ticket,
} from "lucide-react"
import { useLocale } from "next-intl"

import type { EventCardEvent } from "../../types/event.types"
import type { StrapiEvent } from "../../types/strapi.types"

import { formatDate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { DesktopNav } from "@/components/layout/DesktopNav"
import { Footer } from "@/components/layout/Footer"
import { MaxWidthContainer } from "@/components/layout/MaxWidthContainer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

import { mapTypeToCategory } from "../../utils"
import { EventSection } from "../EventSection"

// Placeholder blur data URL for images
const BLUR_DATA_URL =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAYH/8QAIhAAAgEEAgIDAQAAAAAAAAAAAQIDAAQFESEGEhMxQVFh/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQADAQEBAAAAAAAAAAAAAAABAgMAEUH/2gAMAwEAAhEDEQA/ANM4/wAix+TwGNvIZ4Xknt0kkiWVWeNmUEqw+iCexrxSlOhIqnAiYp//2Q=="

export interface EventDetailPageDesktopLabels {
  back: string
  share: string
  addToWatchlist: string
  removeFromWatchlist: string
  presentation: string
  synopsis: string
  showMore: string
  showLess: string
  showtimes: string
  noShowtimes: string
  buyTickets: string
  ticketsAvailable: (count: number) => string
  soldOut: string
  artisticTeam: string
  cast: string
  directors: string
  relatedEvents: string
  minutes: string
  venue: string
  dateRange: (start: string, end: string) => string
  chooseRepresentation: string
  photos: string
  seeAll: string
  // Breadcrumb labels
  home: string
  events: string
  // Additional labels
  by: string
  saved: string
  save: string
  noEvents: string
}

const defaultLabels: EventDetailPageDesktopLabels = {
  back: "Retour",
  share: "Partager",
  addToWatchlist: "Ajouter à la liste",
  removeFromWatchlist: "Retirer de la liste",
  presentation: "Présentation",
  synopsis: "Synopsis",
  showMore: "Voir plus",
  showLess: "Voir moins",
  showtimes: "Séances",
  noShowtimes: "Aucune séance disponible",
  buyTickets: "Réserver des billets",
  ticketsAvailable: (count) => `${count} billets disponibles`,
  soldOut: "Complet",
  artisticTeam: "Équipe artistique",
  cast: "Distribution",
  directors: "Mise en scène",
  relatedEvents: "Vous pourriez aussi aimer...",
  minutes: "min",
  venue: "Lieu",
  dateRange: (start, end) => `Du ${start} au ${end}`,
  chooseRepresentation: "Choisir une représentation",
  photos: "Photos",
  seeAll: "Voir tout",
  home: "Accueil",
  events: "Événements",
  by: "de",
  saved: "Enregistré",
  save: "Enregistrer",
  noEvents: "Aucun événement",
}

export interface EventDetailPageDesktopProps {
  event: StrapiEvent
  relatedEvents?: StrapiEvent[]
  isWatchlisted?: boolean
  labels?: EventDetailPageDesktopLabels
}

/**
 * EventDetailPageDesktop - Enhanced desktop layout for event details
 *
 * Features:
 * - Two-column layout: content left, poster/sidebar right
 * - Full-bleed hero on mobile, contained on desktop
 * - Horizontal showtime date selector
 * - Cast carousel with larger avatars
 * - Photos gallery section
 */
export function EventDetailPageDesktop({
  event,
  relatedEvents = [],
  isWatchlisted = false,
  labels = defaultLabels,
}: EventDetailPageDesktopProps) {
  const router = useRouter()
  const locale = useLocale()
  const isRTL = locale === "ar"
  const [watchlisted, setWatchlisted] = React.useState(isWatchlisted)
  const [synopsisExpanded, setSynopsisExpanded] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null)

  // Creative work data
  const work = event.creativeWork
  const category = mapTypeToCategory(work?.type)

  // Get backdrop and poster URLs
  const backdropUrl =
    work?.backdrop?.url ||
    work?.poster?.formats?.large?.url ||
    work?.poster?.url
  const posterUrl = work?.poster?.formats?.large?.url || work?.poster?.url

  // Group showtimes by date
  const showtimesByDate = React.useMemo(() => {
    const grouped: Record<string, typeof event.showtimes> = {}
    event.showtimes?.forEach((showtime) => {
      const date = showtime.time.split("T")[0]
      if (date) {
        if (!grouped[date]) {
          grouped[date] = []
        }
        grouped[date]!.push(showtime)
      }
    })
    return grouped
  }, [event.showtimes])

  // Get available dates for the date selector
  const availableDates = React.useMemo(() => {
    return Object.keys(showtimesByDate).sort()
  }, [showtimesByDate])

  // Set default selected date
  React.useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0]!)
    }
  }, [availableDates, selectedDate])

  // Handle navigation
  const handleBack = () => router.back()

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: work?.title || event.title,
          text: work?.synopsis?.slice(0, 100),
          url: window.location.href,
        })
      } catch {
        // User cancelled
      }
    }
  }

  const handleWatchlist = () => {
    setWatchlisted((prev) => !prev)
  }

  const handleShowtimeSelect = (showtimeId: string | number) => {
    router.push(`/${locale}/tickets/${event.documentId}/${showtimeId}`)
  }

  // Convert related events for EventSection
  const relatedCards: EventCardEvent[] = relatedEvents.map((e) => ({
    id: e.documentId,
    title: e.creativeWork?.title || e.title,
    posterUrl:
      e.creativeWork?.poster?.formats?.medium?.url ||
      e.creativeWork?.poster?.url,
    category: mapTypeToCategory(e.creativeWork?.type),
    venueName: e.venue?.name || "",
    date: e.startDate,
  }))

  // Synopsis truncation
  const synopsis = work?.synopsis || ""
  const shouldTruncate = synopsis.length > 300
  const displaySynopsis =
    shouldTruncate && !synopsisExpanded
      ? synopsis.slice(0, 300) + "..."
      : synopsis

  const BackArrow = isRTL ? ArrowRight : ArrowLeft

  // Get gallery images (from backdrop, stills, etc.)
  const galleryImages = React.useMemo(() => {
    const images: { url: string; alt: string }[] = []
    if (work?.backdrop?.url) {
      images.push({ url: work.backdrop.url, alt: work.title || "Backdrop" })
    }
    // Add more gallery images here if available
    return images
  }, [work])

  return (
    <div className="bg-background min-h-screen">
      {/* Desktop Navigation */}
      <DesktopNav />

      {/* Navigation Header - Mobile & Desktop secondary */}
      <header className="bg-background/80 border-border/50 sticky top-0 z-50 border-b backdrop-blur-md lg:top-16">
        <MaxWidthContainer className="flex items-center justify-between py-3">
          {/* Mobile: Back button */}
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-muted-foreground hover:text-foreground gap-2"
            >
              <BackArrow className="h-4 w-4" />
              <span className="hidden sm:inline">{labels.back}</span>
            </Button>
          </div>

          {/* Desktop: Breadcrumb navigation */}
          <nav
            aria-label="Breadcrumb"
            className="text-muted-foreground hidden items-center gap-1 text-sm lg:flex"
          >
            <Link
              href={`/${locale}`}
              className="hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>{labels.home}</span>
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link
              href={`/${locale}/search`}
              className="hover:text-foreground transition-colors"
            >
              {labels.events}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground max-w-[200px] truncate font-medium">
              {work?.title || event.title}
            </span>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="h-9 w-9"
              aria-label={labels.share}
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleWatchlist}
              className="h-9 w-9"
              aria-label={
                watchlisted ? labels.removeFromWatchlist : labels.addToWatchlist
              }
            >
              <Heart
                className={cn(
                  "h-4 w-4 transition-all",
                  watchlisted ? "fill-primary text-primary" : ""
                )}
              />
            </Button>
          </div>
        </MaxWidthContainer>
      </header>

      {/* Hero Section - Full width on mobile, contained on desktop */}
      <section className="relative">
        {/* Mobile: Full-bleed hero */}
        <div className="lg:hidden">
          <div className="relative h-[300px] w-full md:h-[350px]">
            {backdropUrl && (
              <Image
                src={backdropUrl}
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                priority
              />
            )}
            <div
              className="from-background via-background/80 absolute inset-0 bg-gradient-to-t to-transparent"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Desktop: Two-column layout */}
        <div className="hidden lg:block">
          <div className="mx-auto max-w-7xl px-8 pt-8">
            <div className="flex gap-12">
              {/* Left Column - Content */}
              <div className="flex-1">
                {/* Badges */}
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Badge variant="default">{category}</Badge>
                  {work?.genres?.map((genre) => (
                    <Badge key={genre.slug} variant="outline">
                      {genre.name}
                    </Badge>
                  ))}
                </div>

                {/* Title */}
                <h1 className="font-display text-foreground mb-2 text-4xl xl:text-5xl">
                  {work?.title || event.title}
                </h1>

                {/* Subtitle/Director */}
                {work?.directors?.[0] && (
                  <p className="text-primary mb-4 text-lg">
                    {labels.by} {work.directors[0].name}
                  </p>
                )}

                {/* Original Title */}
                {work?.originalTitle && work.originalTitle !== work.title && (
                  <p className="text-muted-foreground mb-4 text-sm italic">
                    {work.originalTitle}
                  </p>
                )}

                {/* Metadata Row */}
                <div className="text-muted-foreground mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                  {event.startDate && event.endDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {labels.dateRange(
                          formatDate(event.startDate, locale),
                          formatDate(event.endDate, locale)
                        )}
                      </span>
                    </div>
                  )}

                  {event.venue && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{event.venue.name}</span>
                    </div>
                  )}

                  {work?.duration !== undefined && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {work.duration} {labels.minutes}
                      </span>
                    </div>
                  )}

                  {work?.rating !== undefined && (
                    <div className="flex items-center gap-2">
                      <Star className="text-primary h-4 w-4 fill-current" />
                      <span className="font-medium">
                        {work.rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Hero Image - Desktop inline */}
                {backdropUrl && (
                  <div className="relative mb-8 aspect-video overflow-hidden rounded-xl">
                    <Image
                      src={backdropUrl}
                      alt={work?.title || event.title}
                      fill
                      sizes="(min-width: 1024px) 60vw, 100vw"
                      className="object-cover"
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                      priority
                    />
                    {/* Image navigation dots could go here */}
                    <div className="absolute right-4 bottom-4 flex items-center gap-2">
                      <span className="rounded bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm">
                        01 / 03
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Poster/Sidebar */}
              <aside className="w-80 shrink-0 xl:w-96">
                {/* Poster Card */}
                {posterUrl && (
                  <div className="bg-secondary sticky top-24 rounded-xl p-4">
                    <div className="relative mb-4 aspect-[2/3] overflow-hidden rounded-lg">
                      <Image
                        src={posterUrl}
                        alt={work?.title || event.title}
                        fill
                        sizes="320px"
                        className="object-cover"
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                      />
                    </div>

                    {/* Quick Info */}
                    <div className="space-y-3 text-sm">
                      {event.startDate && event.endDate && (
                        <div className="flex items-start gap-3">
                          <Calendar className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                          <span className="text-foreground">
                            {labels.dateRange(
                              formatDate(event.startDate, locale),
                              formatDate(event.endDate, locale)
                            )}
                          </span>
                        </div>
                      )}

                      {event.venue && (
                        <div className="flex items-start gap-3">
                          <MapPin className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                          <div>
                            <p className="text-foreground">
                              {event.venue.name}
                            </p>
                            {event.venue.address && (
                              <p className="text-muted-foreground text-xs">
                                {event.venue.address}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {work?.duration !== undefined && (
                        <div className="flex items-center gap-3">
                          <Clock className="text-muted-foreground h-4 w-4 shrink-0" />
                          <span className="text-foreground">
                            {work.duration} {labels.minutes}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 space-y-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleShare}
                      >
                        <Share2 className="me-2 h-4 w-4" />
                        {labels.share}
                      </Button>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full",
                          watchlisted && "border-primary text-primary"
                        )}
                        onClick={handleWatchlist}
                      >
                        <Heart
                          className={cn(
                            "me-2 h-4 w-4",
                            watchlisted && "fill-primary"
                          )}
                        />
                        {watchlisted ? labels.saved : labels.save}
                      </Button>
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Mobile-only: Title and metadata */}
        <div className="mb-6 lg:hidden">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="default">{category}</Badge>
            {work?.genres?.map((genre) => (
              <Badge key={genre.slug} variant="outline">
                {genre.name}
              </Badge>
            ))}
          </div>

          <h1 className="font-display text-foreground mb-2 text-2xl md:text-3xl">
            {work?.title || event.title}
          </h1>

          {work?.directors?.[0] && (
            <p className="text-primary mb-3">
              {labels.by} {work.directors[0].name}
            </p>
          )}

          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {work?.rating !== undefined && (
              <div className="flex items-center gap-1">
                <Star className="text-primary h-4 w-4 fill-current" />
                <span className="font-medium">{work.rating.toFixed(1)}</span>
              </div>
            )}
            {work?.duration !== undefined && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>
                  {work.duration} {labels.minutes}
                </span>
              </div>
            )}
            {event.venue && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{event.venue.name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-12 xl:grid-cols-[1fr_384px]">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Presentation/Synopsis Section */}
            {synopsis && (
              <section>
                <h2 className="text-foreground mb-4 text-xl font-semibold lg:text-2xl">
                  {labels.presentation}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {displaySynopsis}
                </p>
                {shouldTruncate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                    className="text-primary mt-3 h-auto p-0"
                  >
                    {synopsisExpanded ? (
                      <>
                        {labels.showLess}
                        <ChevronUp className="ms-1 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        {labels.showMore}
                        <ChevronDown className="ms-1 h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </section>
            )}

            {/* Artistic Team Section */}
            {((work?.directors && work.directors.length > 0) ||
              (work?.cast && work.cast.length > 0)) && (
              <section>
                <h2 className="text-foreground mb-4 text-xl font-semibold lg:text-2xl">
                  {labels.artisticTeam}
                </h2>

                <div className="space-y-6">
                  {/* Directors */}
                  {work?.directors && work.directors.length > 0 && (
                    <div>
                      <h3 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
                        {labels.directors}
                      </h3>
                      <div className="flex flex-wrap gap-4">
                        {work.directors.map((person) => (
                          <div
                            key={person.slug}
                            className="flex items-center gap-3"
                          >
                            {person.photo?.url ? (
                              <Image
                                src={person.photo.url}
                                alt={person.name}
                                width={48}
                                height={48}
                                className="rounded-full object-cover"
                              />
                            ) : (
                              <div className="bg-secondary flex h-12 w-12 items-center justify-center rounded-full">
                                <span className="text-muted-foreground font-medium">
                                  {person.name.charAt(0)}
                                </span>
                              </div>
                            )}
                            <span className="text-foreground font-medium">
                              {person.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cast/Distribution */}
                  {work?.cast && work.cast.length > 0 && (
                    <div>
                      <h3 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
                        {labels.cast}
                      </h3>
                      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2 lg:flex-wrap lg:overflow-visible">
                        {work.cast.map((person) => (
                          <div
                            key={person.slug}
                            className="flex w-20 shrink-0 flex-col items-center text-center lg:w-24"
                          >
                            {person.photo?.url ? (
                              <Image
                                src={person.photo.url}
                                alt={person.name}
                                width={80}
                                height={80}
                                className="mb-2 h-16 w-16 rounded-full object-cover lg:h-20 lg:w-20"
                              />
                            ) : (
                              <div className="bg-secondary mb-2 flex h-16 w-16 items-center justify-center rounded-full lg:h-20 lg:w-20">
                                <span className="text-muted-foreground text-lg">
                                  {person.name.charAt(0)}
                                </span>
                              </div>
                            )}
                            <span className="text-foreground text-xs lg:text-sm">
                              {person.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Choose Representation / Showtimes Section */}
            <section>
              <h2 className="text-foreground mb-4 text-xl font-semibold lg:text-2xl">
                {labels.chooseRepresentation}
              </h2>

              {availableDates.length > 0 ? (
                <div className="space-y-6">
                  {/* Date Selector - Horizontal */}
                  <div className="bg-secondary rounded-lg p-4">
                    <div className="no-scrollbar flex gap-2 overflow-x-auto">
                      {availableDates.map((date) => {
                        const dateObj = new Date(date)
                        const dayName = dateObj.toLocaleDateString(
                          locale === "ar"
                            ? "ar-TN"
                            : locale === "fr"
                              ? "fr-TN"
                              : "en-US",
                          { weekday: "short" }
                        )
                        const dayNum = dateObj.getDate()
                        const monthName = dateObj.toLocaleDateString(
                          locale === "ar"
                            ? "ar-TN"
                            : locale === "fr"
                              ? "fr-TN"
                              : "en-US",
                          { month: "short" }
                        )
                        const isSelected = selectedDate === date

                        return (
                          <button
                            key={date}
                            onClick={() => setSelectedDate(date)}
                            className={cn(
                              "flex min-w-[72px] flex-col items-center rounded-lg px-4 py-3 transition-all",
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-background/50 text-foreground hover:bg-background"
                            )}
                          >
                            <span className="text-xs uppercase">{dayName}</span>
                            <span className="text-2xl font-bold">{dayNum}</span>
                            <span className="text-xs">{monthName}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Showtimes for Selected Date */}
                  {selectedDate && showtimesByDate[selectedDate] && (
                    <div className="space-y-3">
                      {showtimesByDate[selectedDate]!.map((showtime) => {
                        const time = new Date(showtime.time).toLocaleTimeString(
                          locale === "ar"
                            ? "ar-TN"
                            : locale === "fr"
                              ? "fr-TN"
                              : "en-US",
                          { hour: "2-digit", minute: "2-digit" }
                        )
                        const isSoldOut =
                          showtime.ticketsAvailable !== undefined &&
                          showtime.ticketsAvailable <= 0

                        return (
                          <button
                            key={showtime.documentId}
                            onClick={() =>
                              !isSoldOut &&
                              handleShowtimeSelect(showtime.documentId)
                            }
                            disabled={isSoldOut}
                            className={cn(
                              "bg-secondary hover:bg-accent flex w-full items-center justify-between rounded-lg p-4 transition-all",
                              isSoldOut && "cursor-not-allowed opacity-50"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <span className="text-foreground text-xl font-bold">
                                {time}
                              </span>
                              {showtime.format && (
                                <Badge variant="secondary">
                                  {showtime.format}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              {showtime.price !== undefined && !isSoldOut && (
                                <span className="text-foreground font-medium">
                                  {showtime.price} TND
                                </span>
                              )}
                              {isSoldOut && (
                                <Badge variant="destructive">
                                  {labels.soldOut}
                                </Badge>
                              )}
                              <Ticket className="text-muted-foreground h-5 w-5" />
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* CTA Button */}
                  <Button size="lg" className="w-full gap-2 text-lg">
                    <Ticket className="h-5 w-5" />
                    {labels.buyTickets}
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground">{labels.noShowtimes}</p>
              )}
            </section>

            {/* Photos Gallery */}
            {galleryImages.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-foreground text-xl font-semibold lg:text-2xl">
                    {labels.photos}
                  </h2>
                  <Button variant="ghost" size="sm" className="text-primary">
                    {labels.seeAll}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {galleryImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-video overflow-hidden rounded-lg"
                    >
                      <Image
                        src={img.url}
                        alt={img.alt}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                        className="object-cover transition-transform hover:scale-105"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Sidebar - Mobile only (desktop sidebar is in hero section) */}
          <aside className="mt-8 lg:hidden">
            {/* Venue Card */}
            {event.venue && (
              <div className="bg-secondary mb-6 rounded-xl p-4">
                <h3 className="text-foreground mb-3 font-semibold">
                  {labels.venue}
                </h3>
                <p className="text-foreground font-medium">
                  {event.venue.name}
                </p>
                {event.venue.address && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {event.venue.address}
                  </p>
                )}
                {event.venue.city && (
                  <p className="text-muted-foreground text-sm">
                    {event.venue.city.name}
                  </p>
                )}
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Related Events Section */}
      {relatedCards.length > 0 && (
        <section className="border-border/50 border-t py-8">
          {/* Mobile: horizontal scroll */}
          <div className="lg:hidden">
            <EventSection
              title={labels.relatedEvents}
              events={relatedCards}
              variant="default"
              layout="scroll"
              onEventClick={(id) => router.push(`/${locale}/events/${id}`)}
              labels={{
                seeAll: labels.seeAll,
                noEvents: labels.noEvents,
              }}
            />
          </div>
          {/* Desktop: grid layout */}
          <MaxWidthContainer className="hidden lg:block">
            <EventSection
              title={labels.relatedEvents}
              events={relatedCards}
              variant="default"
              layout="grid"
              gridColumns={4}
              onEventClick={(id) => router.push(`/${locale}/events/${id}`)}
              labels={{
                seeAll: labels.seeAll,
                noEvents: labels.noEvents,
              }}
            />
          </MaxWidthContainer>
        </section>
      )}

      {/* Desktop Footer */}
      <Footer />
    </div>
  )
}

EventDetailPageDesktop.displayName = "EventDetailPageDesktop"
