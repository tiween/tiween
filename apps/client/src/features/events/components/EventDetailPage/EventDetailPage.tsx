"use client"

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
  MapPin,
  Ticket,
} from "lucide-react"
import { useLocale } from "next-intl"

import type { EventCardEvent } from "../../types/event.types"
import type { StrapiEvent } from "../../types/strapi.types"

import { formatDate, formatTime } from "@/lib/dates"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

import type { DirectionsPlatform } from "../../utils"

import { useAddToWatchlist } from "../../hooks/useAddToWatchlist"
import { useRemoveFromWatchlist } from "../../hooks/useRemoveFromWatchlist"
import {
  buildDirectionsUrl,
  buildEventShareUrl,
  getEventFilm,
  platformFromUserAgent,
  shouldFallbackAfterShareError,
  toEventCardEvent,
  toEventDetail,
  toFilmHeroEvent,
} from "../../utils"
import { EventSection } from "../EventSection"
import { FilmHero } from "../FilmHero"
import { VenueMap } from "../Map"
import { ShareDialog } from "../ShareDialog"

/**
 * Best-effort platform hint for choosing the maps provider at the directions
 * call site. SSR-safe (returns "other" when `navigator` is undefined); Apple
 * platforms (iOS/iPadOS/macOS) get an Apple Maps link, everything else Google.
 */
function detectDirectionsPlatform(): DirectionsPlatform {
  if (typeof navigator === "undefined") return "other"
  return platformFromUserAgent(`${navigator.userAgent} ${navigator.platform}`)
}

export interface EventDetailPageLabels {
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
  priceFrom: (price: string) => string
  ticketsAvailable: (count: number) => string
  soldOut: string
  cast: string
  directors: string
  relatedEvents: string
  minutes: string
  venue: string
  dateRange: string
  getDirections: string
  mapLoading: string
  copyLink: string
  linkCopied: string
  copyFailed: string
  shareVia: string
  shareOnWhatsapp: string
  shareOnFacebook: string
  shareOnTwitter: string
}

const defaultLabels: EventDetailPageLabels = {
  back: "Retour",
  share: "Partager",
  addToWatchlist: "Ajouter à la liste",
  removeFromWatchlist: "Retirer de la liste",
  synopsis: "Synopsis",
  showMore: "Voir plus",
  showLess: "Voir moins",
  showtimes: "Séances",
  noShowtimes: "Aucune séance disponible",
  buyTickets: "Réserver des billets",
  priceFrom: (price) => `À partir de ${price}`,
  ticketsAvailable: (count) => `${count}`,
  soldOut: "Complet",
  cast: "Distribution",
  directors: "Mise en scène",
  relatedEvents: "Vous pourriez aussi aimer...",
  minutes: "min",
  venue: "Lieu",
  dateRange: "Du {start} au {end}",
  getDirections: "Itinéraire",
  mapLoading: "Chargement de la carte...",
  copyLink: "Copier le lien",
  linkCopied: "Lien copié",
  copyFailed: "Échec de la copie du lien",
  shareVia: "Partager via",
  shareOnWhatsapp: "Partager sur WhatsApp",
  shareOnFacebook: "Partager sur Facebook",
  shareOnTwitter: "Partager sur Twitter",
}

export interface EventDetailPageProps {
  /** Event data (real Story 3.1a schema, deep-populated) */
  event: StrapiEvent
  /** Related events */
  relatedEvents?: StrapiEvent[]
  /** Localized labels (threaded from the route via next-intl) */
  labels?: EventDetailPageLabels
}

/**
 * EventDetailPage — full event detail view for a published cinema event.
 *
 * Reads the REAL events-manager schema through the pure `toEventDetail` mapper
 * (`screenings[0].movie` = the film, `screenings` = the showtimes, `venue` =
 * the location). The hero is rendered by `FilmHero`; showtimes drive
 * `ShowtimeButton` with its real `venueName`/`formats`/`status`/`onSelect` API;
 * a showtime tap navigates to the ticketing entrypoint (Epic 6).
 *
 * Resilient: an event with no movie / no screenings / no venue degrades to an
 * event-image hero, a no-showtimes state, and omitted cast/crew — never a crash.
 */
export function EventDetailPage({
  event,
  relatedEvents = [],
  labels = defaultLabels,
}: EventDetailPageProps) {
  const router = useRouter()
  const locale = useLocale()
  const isRTL = locale === "ar"
  // Watchlist state is server-backed: the creative-work id comes from the
  // event's film (`screenings[0].movie`). `canWatchlist` is false when the event
  // has no film id, which disables the heart. The heart is a TOGGLE (Story 5.2):
  // a filled heart removes, an empty heart adds — resolved at the wire below.
  const creativeWorkId = getEventFilm(event)?.documentId
  const {
    isWatchlisted,
    add,
    canWatchlist,
    isPending: addIsPending,
  } = useAddToWatchlist(creativeWorkId)
  const { remove, isPending: removeIsPending } =
    useRemoveFromWatchlist(creativeWorkId)
  const [synopsisExpanded, setSynopsisExpanded] = React.useState(false)
  // Resolve the maps platform after mount (navigator is client-only) so the
  // initial SSR/hydration render defaults to Google, then upgrades on Apple.
  const [directionsPlatform, setDirectionsPlatform] =
    React.useState<DirectionsPlatform>("other")
  React.useEffect(() => {
    setDirectionsPlatform(detectDirectionsPlatform())
  }, [])
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false)

  const detail = React.useMemo(
    () => toEventDetail(event, locale),
    [event, locale]
  )
  const heroEvent = React.useMemo(
    () => toFilmHeroEvent(event, locale),
    [event, locale]
  )

  // Group the real showtimes by calendar day (from the ISO `startDateTime`).
  const showtimesByDate = React.useMemo(() => {
    const grouped: Record<string, typeof detail.showtimes> = {}
    for (const showtime of detail.showtimes) {
      const date = showtime.time ? showtime.time.split("T")[0]! : ""
      ;(grouped[date] ??= []).push(showtime)
    }
    return grouped
  }, [detail])

  // Canonical, absolute share URL — NOT window.location.href (avoids leaking
  // filter/query params). Mirrors generateMetadata's `canonical`.
  const shareUrl = React.useMemo(
    () =>
      buildEventShareUrl({
        baseUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://tiween.tn",
        locale,
        documentId: detail.documentId,
      }),
    [locale, detail.documentId]
  )

  const handleBack = () => {
    router.back()
  }

  const handleShare = async () => {
    // Native Web Share when supported (its sheet covers WhatsApp/Facebook/
    // Twitter on mobile); otherwise open the copy-to-clipboard fallback.
    const canNativeShare =
      typeof navigator !== "undefined" && typeof navigator.share === "function"
    if (canNativeShare) {
      try {
        await navigator.share({
          title: detail.title,
          text: detail.synopsis.slice(0, 100),
          url: shareUrl,
        })
      } catch (error) {
        // AbortError = user cancelled the native sheet: do nothing. Any other
        // error means native share failed — fall back to the dialog.
        if (shouldFallbackAfterShareError(error)) {
          setShareDialogOpen(true)
        }
      }
    } else {
      setShareDialogOpen(true)
    }
  }

  const handleShowtimeSelect = (screeningId: string) => {
    // Begin ticket purchase at the ticketing entrypoint (the flow is Epic 6).
    router.push(`/${locale}/tickets/${event.documentId}/${screeningId}`)
  }

  const relatedCards: EventCardEvent[] = relatedEvents.map((e) =>
    toEventCardEvent(e, locale)
  )

  // Synopsis truncation
  const synopsis = detail.synopsis
  const shouldTruncate = synopsis.length > 200
  const displaySynopsis =
    shouldTruncate && !synopsisExpanded
      ? synopsis.slice(0, 200) + "..."
      : synopsis

  const BackArrow = isRTL ? ArrowRight : ArrowLeft

  return (
    <div className="bg-background min-h-screen pb-24">
      {/* Hero */}
      <div className="relative">
        <FilmHero
          // A detail page is inherently one venue (shown in its own section
          // below), so drop the browse-oriented venue-count badge.
          event={{ ...heroEvent, venueCount: undefined }}
          isWatchlisted={isWatchlisted}
          // Toggle: filled heart removes, empty heart adds (Story 5.2).
          onWatchlist={isWatchlisted ? remove : add}
          // In-flight guard: disable the heart while EITHER mutation is pending
          // so a rapid double-tap can't race a DELETE and a POST at the same row
          // (add/remove are separate mutation instances — neither self-guards the
          // other). Without this the second tap fires the OPPOSITE op.
          watchlistDisabled={!canWatchlist || addIsPending || removeIsPending}
          onShare={handleShare}
          labels={{
            addToWatchlist: labels.addToWatchlist,
            removeFromWatchlist: labels.removeFromWatchlist,
            share: labels.share,
            // Required by FilmHeroLabels but never rendered here (venueCount is
            // undefined on the detail hero).
            inVenues: (count) => String(count),
            minutes: labels.minutes,
          }}
        />

        {/* Back control (direction-aware) overlaid at the top-start corner */}
        <div className="absolute inset-x-0 top-0 flex items-center p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-11 w-11 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
            aria-label={labels.back}
          >
            <BackArrow className="h-5 w-5" />
          </Button>
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

        {/* Venue Section */}
        {detail.venue && (
          <section className="mb-6">
            <h2 className="text-foreground mb-3 text-lg font-semibold">
              {labels.venue}
            </h2>
            <div className="bg-secondary rounded-lg p-4">
              <div className="flex items-start gap-2">
                <MapPin className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-foreground font-medium">
                    {detail.venue.name}
                  </p>
                  {detail.venue.address && (
                    <p className="text-muted-foreground mt-1 text-sm">
                      {detail.venue.address}
                    </p>
                  )}
                  {(detail.venue.city || detail.venue.region) && (
                    <p className="text-muted-foreground text-sm">
                      {[detail.venue.city, detail.venue.region]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                </div>
              </div>

              {/* Interactive map + directions — only when the venue has finite
                  coordinates; otherwise the address text above stands alone. */}
              {detail.venue.latitude !== undefined &&
                detail.venue.longitude !== undefined && (
                  <div className="mt-4 space-y-3">
                    <VenueMap
                      venue={{
                        documentId: detail.venue.documentId,
                        name: detail.venue.name,
                        address: detail.venue.address,
                        city: detail.venue.city,
                        latitude: detail.venue.latitude,
                        longitude: detail.venue.longitude,
                        type: "cinema",
                      }}
                      height="250px"
                      loadingLabel={labels.mapLoading}
                    />
                    <a
                      href={buildDirectionsUrl(
                        {
                          latitude: detail.venue.latitude,
                          longitude: detail.venue.longitude,
                        },
                        { platform: directionsPlatform }
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                    >
                      <MapPin className="h-4 w-4" />
                      {labels.getDirections}
                    </a>
                  </div>
                )}
            </div>
          </section>
        )}

        <Separator className="my-6" />

        {/* Showtimes Section */}
        <section className="mb-6">
          <h2 className="text-foreground mb-4 text-lg font-semibold">
            {labels.showtimes}
          </h2>

          {detail.showtimes.length > 0 ? (
            <div className="space-y-4">
              {Object.entries(showtimesByDate).map(([date, showtimes]) => (
                <div key={date || "undated"}>
                  {date && (
                    <p className="text-foreground mb-2 flex items-center gap-2 text-sm font-medium">
                      <Calendar className="h-4 w-4" />
                      {formatDate(date, locale)}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {showtimes?.map((showtime) => (
                      <ShowtimeButton
                        key={showtime.id}
                        time={formatTime(showtime.time, locale)}
                        venueName={detail.venue?.name ?? ""}
                        price={showtime.price}
                        currency={detail.currency}
                        formats={showtime.formats}
                        status={showtime.status}
                        onSelect={() => handleShowtimeSelect(showtime.id)}
                        labels={{
                          soldOut: labels.soldOut,
                          selectShowtime: labels.buyTickets,
                        }}
                      />
                    ))}
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

        {/* Directors Section */}
        {detail.directors.length > 0 && (
          <>
            <Separator className="my-6" />
            <section className="mb-6">
              <h2 className="text-foreground mb-3 text-lg font-semibold">
                {labels.directors}
              </h2>
              <div className="flex flex-wrap gap-3">
                {detail.directors.map((person, index) => (
                  <div
                    key={`${person.name}-${index}`}
                    className="bg-secondary flex items-center gap-3 rounded-lg p-3"
                  >
                    {person.photoUrl ? (
                      <Image
                        src={person.photoUrl}
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
          </>
        )}

        {/* Cast Section */}
        {detail.cast.length > 0 && (
          <section className="mb-6">
            <h2 className="text-foreground mb-3 text-lg font-semibold">
              {labels.cast}
            </h2>
            <div className="no-scrollbar flex gap-3 overflow-x-auto">
              {detail.cast.map((person, index) => (
                <div
                  key={`${person.name}-${index}`}
                  className="flex w-20 shrink-0 flex-col items-center"
                >
                  {person.photoUrl ? (
                    <Image
                      src={person.photoUrl}
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
                  {person.role && (
                    <span className="text-muted-foreground text-center text-[10px]">
                      {person.role}
                    </span>
                  )}
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
      {detail.showtimes.length > 0 && (
        <div className="bg-background/95 fixed inset-x-0 bottom-0 border-t p-4 backdrop-blur-sm">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <div>
              <p className="text-foreground text-sm font-medium">
                {detail.showtimes.length} {labels.showtimes}
              </p>
              {detail.minPrice !== undefined && (
                <p className="text-muted-foreground text-xs">
                  {labels.priceFrom(`${detail.minPrice} ${detail.currency}`)}
                </p>
              )}
            </div>
            <Button
              size="lg"
              className="gap-2"
              onClick={() => {
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

      {/* Copy-to-clipboard + social deep-link fallback (opened programmatically
          from the single FilmHero share button when Web Share is unavailable). */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        url={shareUrl}
        title={detail.title}
        labels={{
          shareVia: labels.shareVia,
          copyLink: labels.copyLink,
          linkCopied: labels.linkCopied,
          copyFailed: labels.copyFailed,
          shareOnWhatsapp: labels.shareOnWhatsapp,
          shareOnFacebook: labels.shareOnFacebook,
          shareOnTwitter: labels.shareOnTwitter,
        }}
      />
    </div>
  )
}

EventDetailPage.displayName = "EventDetailPage"
