"use client"

/**
 * EventDetailPage with Map Integration
 *
 * This is an enhanced version of EventDetailPage that includes:
 * - Interactive venue map with Leaflet
 * - Directions button to Google Maps
 *
 * USAGE: Replace EventDetailPage.tsx with this file once Leaflet deps are installed:
 *   yarn workspace @tiween/client add leaflet react-leaflet
 *   yarn workspace @tiween/client add -D @types/leaflet
 */
import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ShowtimeButton } from "@/features/tickets/components/ShowtimeButton"
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Heart,
  MapPin,
  Navigation,
  Share2,
  Star,
  Ticket,
} from "lucide-react"
import { useLocale } from "next-intl"

import type { EventCardEvent } from "../../types/event.types"
import type { StrapiEvent } from "../../types/strapi.types"
import type { VenueLocation } from "../Map"

import { formatDate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

import { mapTypeToCategory } from "../../utils"
import { EventSection } from "../EventSection"
import { VenueMap } from "../Map"

// Placeholder blur data URL for images
const BLUR_DATA_URL =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAYH/8QAIhAAAgEEAgIDAQAAAAAAAAAAAQIDAAQFESEGEhMxQVFh/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQADAQEBAAAAAAAAAAAAAAABAgMAEUH/2gAMAwEAAhEDEQA/ANM4/wAix+TwGNvIZ4Xknt0kkiWVWeNmUEqw+iCexrxSlOhIqnAiYp//2Q=="

export interface EventDetailPageWithMapLabels {
  back: string
  share: string
  addToWatchlist: string
  removeFromWatchlist: string
  synopsis: string
  showMore: string
  showLess: string
  showtimes: string
  noShowtimes: string
  buyTickets: string
  ticketsAvailable: (count: number) => string
  soldOut: string
  cast: string
  directors: string
  relatedEvents: string
  minutes: string
  venue: string
  dateRange: string
  directions: string
}

const defaultLabels: EventDetailPageWithMapLabels = {
  back: "Retour",
  share: "Partager",
  addToWatchlist: "Ajouter à la liste",
  removeFromWatchlist: "Retirer de la liste",
  synopsis: "Synopsis",
  showMore: "Voir plus",
  showLess: "Voir moins",
  showtimes: "Séances",
  noShowtimes: "Aucune séance disponible",
  buyTickets: "Acheter des billets",
  ticketsAvailable: (count) => `${count} billets disponibles`,
  soldOut: "Complet",
  cast: "Distribution",
  directors: "Réalisation",
  relatedEvents: "Vous aimerez aussi",
  minutes: "min",
  venue: "Lieu",
  dateRange: "Du %start% au %end%",
  directions: "Itinéraire",
}

export interface EventDetailPageWithMapProps {
  /** Event data */
  event: StrapiEvent
  /** Related events */
  relatedEvents?: StrapiEvent[]
  /** Whether the event is in user's watchlist */
  isWatchlisted?: boolean
  /** Localized labels */
  labels?: EventDetailPageWithMapLabels
}

/**
 * Convert venue data to VenueLocation for map
 */
function toVenueLocation(venue: StrapiEvent["venue"]): VenueLocation | null {
  if (!venue) return null

  // Check if venue has coordinates
  const lat = venue.latitude ?? (venue as any).lat
  const lng = venue.longitude ?? (venue as any).lng ?? (venue as any).lon

  if (typeof lat !== "number" || typeof lng !== "number") {
    return null
  }

  return {
    documentId: venue.documentId,
    name: venue.name,
    address: venue.address,
    city: venue.city?.name,
    latitude: lat,
    longitude: lng,
    type: (venue as any).type || "other",
    logoUrl:
      (venue as any).logo?.formats?.thumbnail?.url || (venue as any).logo?.url,
  }
}

/**
 * EventDetailPageWithMap - Enhanced event detail view with map
 *
 * Features:
 * - Full-bleed hero with backdrop image
 * - Synopsis with expand/collapse
 * - Interactive venue map with Leaflet
 * - Showtimes grouped by date
 * - Cast & crew section
 * - Related events section
 * - Sticky buy tickets CTA
 */
export function EventDetailPageWithMap({
  event,
  relatedEvents = [],
  isWatchlisted = false,
  labels = defaultLabels,
}: EventDetailPageWithMapProps) {
  const router = useRouter()
  const locale = useLocale()
  const isRTL = locale === "ar"
  const [watchlisted, setWatchlisted] = React.useState(isWatchlisted)
  const [synopsisExpanded, setSynopsisExpanded] = React.useState(false)

  // Creative work data
  const work = event.creativeWork
  const category = mapTypeToCategory(work?.type)

  // Get backdrop or poster URL
  const backdropUrl =
    work?.backdrop?.url ||
    work?.poster?.formats?.large?.url ||
    work?.poster?.url

  // Convert venue to map location
  const venueLocation = React.useMemo(
    () => toVenueLocation(event.venue),
    [event.venue]
  )

  // Group showtimes by date
  const showtimesByDate = React.useMemo(() => {
    const grouped: Record<string, typeof event.showtimes> = {}
    event.showtimes?.forEach((showtime) => {
      const date = showtime.time.split("T")[0]
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date]!.push(showtime)
    })
    return grouped
  }, [event.showtimes])

  // Handle back navigation
  const handleBack = () => {
    router.back()
  }

  // Handle share
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: work?.title || event.title,
          text: work?.synopsis?.slice(0, 100),
          url: window.location.href,
        })
      } catch {
        // User cancelled or share failed
      }
    }
  }

  // Handle watchlist toggle
  const handleWatchlist = () => {
    setWatchlisted((prev) => !prev)
    // TODO: Persist to backend when auth is implemented
  }

  // Handle showtime selection
  const handleShowtimeSelect = (showtimeId: string | number) => {
    router.push(`/${locale}/tickets/${event.documentId}/${showtimeId}`)
  }

  // Handle directions
  const handleDirections = () => {
    if (!venueLocation) return
    const url = `https://www.google.com/maps/dir/?api=1&destination=${venueLocation.latitude},${venueLocation.longitude}`
    window.open(url, "_blank", "noopener,noreferrer")
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
  const shouldTruncate = synopsis.length > 200
  const displaySynopsis =
    shouldTruncate && !synopsisExpanded
      ? synopsis.slice(0, 200) + "..."
      : synopsis

  // Arrow icon based on RTL
  const BackArrow = isRTL ? ArrowRight : ArrowLeft

  return (
    <div className="bg-background min-h-screen pb-24">
      {/* Hero Section */}
      <div className="relative h-[350px] w-full md:h-[400px] lg:h-[450px]">
        {/* Backdrop Image */}
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

        {/* Gradient Overlay */}
        <div
          className="from-background via-background/80 absolute inset-0 bg-gradient-to-t to-transparent"
          aria-hidden="true"
        />

        {/* Top Navigation */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-10 w-10 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
            aria-label={labels.back}
          >
            <BackArrow className="h-5 w-5" />
          </Button>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="h-10 w-10 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
              aria-label={labels.share}
            >
              <Share2 className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleWatchlist}
              className="h-10 w-10 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
              aria-label={
                watchlisted ? labels.removeFromWatchlist : labels.addToWatchlist
              }
              aria-pressed={watchlisted}
            >
              <Heart
                className={cn(
                  "h-5 w-5 transition-all",
                  watchlisted ? "fill-primary text-primary" : "fill-transparent"
                )}
              />
            </Button>
          </div>
        </div>

        {/* Content - Bottom */}
        <div className="absolute inset-x-0 bottom-0 p-4 md:p-6">
          {/* Badges Row */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="default">{category}</Badge>
            {work?.genres?.map((genre) => (
              <Badge key={genre.slug} variant="outline">
                {genre.name}
              </Badge>
            ))}
          </div>

          {/* Title */}
          <h1 className="font-display text-foreground mb-3 text-2xl md:text-3xl lg:text-4xl">
            {work?.title || event.title}
          </h1>

          {/* Original Title */}
          {work?.originalTitle && work.originalTitle !== work.title && (
            <p className="text-muted-foreground mb-3 text-sm">
              {work.originalTitle}
            </p>
          )}

          {/* Metadata Row */}
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

            {work?.releaseYear !== undefined && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{work.releaseYear}</span>
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
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Synopsis Section */}
        {synopsis && (
          <section className="mb-6">
            <h2 className="text-foreground mb-3 text-lg font-semibold">
              {labels.synopsis}
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {displaySynopsis}
            </p>
            {shouldTruncate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                className="text-primary mt-2 h-auto p-0"
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

        <Separator className="my-6" />

        {/* Venue Section with Map */}
        {event.venue && (
          <section className="mb-6">
            <h2 className="text-foreground mb-3 text-lg font-semibold">
              {labels.venue}
            </h2>

            {/* Venue Info Card */}
            <div className="bg-secondary rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
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

                {/* Directions Button */}
                {venueLocation && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDirections}
                    className="shrink-0 gap-2"
                  >
                    <Navigation className="h-4 w-4" />
                    {labels.directions}
                  </Button>
                )}
              </div>
            </div>

            {/* Interactive Map */}
            {venueLocation && (
              <div className="mt-4">
                <VenueMap
                  venue={venueLocation}
                  height="250px"
                  showDirections
                  className="rounded-lg shadow-sm"
                />
              </div>
            )}
          </section>
        )}

        {/* Date Range */}
        {event.startDate && event.endDate && (
          <div className="bg-secondary mb-6 rounded-lg p-4">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              <span>
                Du {formatDate(event.startDate, locale)} au{" "}
                {formatDate(event.endDate, locale)}
              </span>
            </div>
          </div>
        )}

        <Separator className="my-6" />

        {/* Showtimes Section */}
        <section className="mb-6">
          <h2 className="text-foreground mb-4 text-lg font-semibold">
            {labels.showtimes}
          </h2>

          {Object.keys(showtimesByDate).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(showtimesByDate).map(([date, showtimes]) => (
                <div key={date}>
                  <p className="text-foreground mb-2 text-sm font-medium">
                    {formatDate(date, locale)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {showtimes?.map((showtime) => {
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
                        <ShowtimeButton
                          key={showtime.documentId}
                          time={time}
                          price={showtime.price}
                          currency="TND"
                          format={showtime.format}
                          isAvailable={!isSoldOut}
                          onClick={() =>
                            handleShowtimeSelect(showtime.documentId)
                          }
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              {labels.noShowtimes}
            </p>
          )}
        </section>

        <Separator className="my-6" />

        {/* Directors Section */}
        {work?.directors && work.directors.length > 0 && (
          <section className="mb-6">
            <h2 className="text-foreground mb-3 text-lg font-semibold">
              {labels.directors}
            </h2>
            <div className="flex flex-wrap gap-3">
              {work.directors.map((person) => (
                <div
                  key={person.slug}
                  className="bg-secondary flex items-center gap-3 rounded-lg p-3"
                >
                  {person.photo?.url ? (
                    <Image
                      src={person.photo.url}
                      alt={person.name}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                      <span className="text-muted-foreground text-sm">
                        {person.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <span className="text-foreground text-sm font-medium">
                    {person.name}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Cast Section */}
        {work?.cast && work.cast.length > 0 && (
          <section className="mb-6">
            <h2 className="text-foreground mb-3 text-lg font-semibold">
              {labels.cast}
            </h2>
            <div className="no-scrollbar flex gap-3 overflow-x-auto">
              {work.cast.map((person) => (
                <div
                  key={person.slug}
                  className="flex w-20 shrink-0 flex-col items-center"
                >
                  {person.photo?.url ? (
                    <Image
                      src={person.photo.url}
                      alt={person.name}
                      width={64}
                      height={64}
                      className="mb-2 rounded-full object-cover"
                    />
                  ) : (
                    <div className="bg-muted mb-2 flex h-16 w-16 items-center justify-center rounded-full">
                      <span className="text-muted-foreground">
                        {person.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <span className="text-foreground text-center text-xs">
                    {person.name}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Related Events Section */}
      {relatedCards.length > 0 && (
        <EventSection
          title={labels.relatedEvents}
          events={relatedCards}
          variant="default"
          onEventClick={(id) => router.push(`/${locale}/events/${id}`)}
          labels={{
            seeAll: "",
            noEvents: "",
          }}
        />
      )}

      {/* Sticky Buy Tickets CTA */}
      {event.showtimes && event.showtimes.length > 0 && (
        <div className="bg-background/95 fixed inset-x-0 bottom-0 border-t p-4 backdrop-blur-sm">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <div>
              <p className="text-foreground text-sm font-medium">
                {event.showtimes.length} séance
                {event.showtimes.length > 1 ? "s" : ""}
              </p>
              <p className="text-muted-foreground text-xs">
                À partir de{" "}
                {Math.min(...event.showtimes.map((s) => s.price || 0))} TND
              </p>
            </div>
            <Button
              size="lg"
              className="gap-2"
              onClick={() => {
                // Scroll to showtimes section
                document
                  .querySelector("section h2")
                  ?.scrollIntoView({ behavior: "smooth" })
              }}
            >
              <Ticket className="h-5 w-5" />
              {labels.buyTickets}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

EventDetailPageWithMap.displayName = "EventDetailPageWithMap"
