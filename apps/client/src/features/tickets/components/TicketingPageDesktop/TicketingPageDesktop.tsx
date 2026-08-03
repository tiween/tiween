"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  MapPin,
} from "lucide-react"
import { useLocale } from "next-intl"

import type { ShowtimeSlot } from "../VenueShowtimeCard"

import { toNumeralSafeLocale } from "@/lib/intl-locale"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import {
  DateSelectorDesktop,
  generateDateOptions,
} from "../DateSelectorDesktop"
import { VenueShowtimeCard } from "../VenueShowtimeCard"

// Placeholder blur
const BLUR_DATA_URL =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAYH/8QAIhAAAgEEAgIDAQAAAAAAAAAAAQIDAAQFESEGEhMxQVFh/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQADAQEBAAAAAAAAAAAAAAABAgMAEUH/2gAMAwEAAhEDEQA/ANM4/wAix+TwGNvIZ4Xknt0kkiWVWeNmUEqw+iCexrxSlOhIqnAiYp//2Q=="

export interface Venue {
  id: string
  name: string
  address: string
  city?: string
}

export interface Showtime {
  id: string | number
  venueId: string
  time: string // ISO datetime
  formats: ("VOST" | "VF" | "VO" | "3D" | "IMAX" | "4DX")[]
  price?: number
  endTime?: string
  ticketsAvailable?: number
}

export interface MovieInfo {
  title: string
  director?: string
  posterUrl?: string
  duration?: number
  releaseYear?: number
}

export interface TicketingPageDesktopLabels {
  title: string
  subtitle: string
  chooseSession: string
  selectDate: string
  back: string
  chooseThisSession: string
  from: string
  at: string
  soldOut: string
}

const defaultLabels: TicketingPageDesktopLabels = {
  title: "Billetterie",
  subtitle: "Choisir des billets",
  chooseSession: "Choisissez la séance qui vous convient :",
  selectDate: "Sélectionner une date",
  back: "Retour",
  chooseThisSession: "Choisir cette séance",
  from: "de",
  at: "à",
  soldOut: "Complet",
}

export interface TicketingPageDesktopProps {
  movie: MovieInfo
  venues: Venue[]
  showtimes: Showtime[]
  eventDocumentId: string
  labels?: TicketingPageDesktopLabels
  className?: string
}

/**
 * TicketingPageDesktop - Desktop ticketing/session selection page
 *
 * Based on Tiween ticketing desktop design:
 * - Two-column layout: selection on left, movie card on right
 * - Horizontal date selector with week view
 * - Venue cards grouped with showtime grids
 * - Selected session summary in sidebar
 * - Prominent CTA button when session selected
 */
export function TicketingPageDesktop({
  movie,
  venues,
  showtimes,
  eventDocumentId,
  labels = defaultLabels,
  className,
}: TicketingPageDesktopProps) {
  const router = useRouter()
  const locale = useLocale()
  const isRTL = locale === "ar"

  // State
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null)
  const [selectedShowtimeId, setSelectedShowtimeId] = React.useState<
    string | number | null
  >(null)

  // Generate date options (next 7 days from first showtime)
  const dateOptions = React.useMemo(() => {
    if (showtimes.length === 0) return []

    const dates = showtimes.map((s) => new Date(s.time))
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
    minDate.setHours(0, 0, 0, 0)

    return generateDateOptions(minDate, 7, locale)
  }, [showtimes, locale])

  // Set default date
  React.useEffect(() => {
    if (dateOptions.length > 0 && !selectedDate) {
      setSelectedDate(dateOptions[0]!.date)
    }
  }, [dateOptions, selectedDate])

  // Filter showtimes by selected date
  const filteredShowtimes = React.useMemo(() => {
    if (!selectedDate) return []
    return showtimes.filter((s) => s.time.startsWith(selectedDate))
  }, [showtimes, selectedDate])

  // Group showtimes by venue
  const showtimesByVenue = React.useMemo(() => {
    const grouped: Record<string, Showtime[]> = {}
    filteredShowtimes.forEach((showtime) => {
      if (!grouped[showtime.venueId]) {
        grouped[showtime.venueId] = []
      }
      grouped[showtime.venueId]!.push(showtime)
    })
    return grouped
  }, [filteredShowtimes])

  // Get selected showtime details
  const selectedShowtime = React.useMemo(() => {
    if (!selectedShowtimeId) return null
    return showtimes.find((s) => s.id === selectedShowtimeId) || null
  }, [showtimes, selectedShowtimeId])

  const selectedVenue = React.useMemo(() => {
    if (!selectedShowtime) return null
    return venues.find((v) => v.id === selectedShowtime.venueId) || null
  }, [venues, selectedShowtime])

  // Handlers
  const handleBack = () => router.back()

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    setSelectedShowtimeId(null) // Reset selection when date changes
  }

  const handleShowtimeSelect = (showtimeId: string | number) => {
    setSelectedShowtimeId(showtimeId)
  }

  const handleConfirmSession = () => {
    if (selectedShowtimeId) {
      router.push(`/${locale}/tickets/${eventDocumentId}/${selectedShowtimeId}`)
    }
  }

  // Format time for display
  const formatTime = (isoTime: string) => {
    const date = new Date(isoTime)
    return date.toLocaleTimeString(
      toNumeralSafeLocale(
        locale === "ar" ? "ar-TN" : locale === "fr" ? "fr-TN" : "en-US"
      ),
      { hour: "2-digit", minute: "2-digit" }
    )
  }

  const formatDateLong = (isoDate: string) => {
    const date = new Date(isoDate)
    return date.toLocaleDateString(
      toNumeralSafeLocale(
        locale === "ar" ? "ar-TN" : locale === "fr" ? "fr-TN" : "en-US"
      ),
      { weekday: "short", day: "numeric", month: "short", year: "numeric" }
    )
  }

  const BackArrow = isRTL ? ArrowRight : ArrowLeft

  // Convert showtimes to slot format for VenueShowtimeCard
  const convertToSlots = (venueShowtimes: Showtime[]): ShowtimeSlot[] => {
    return venueShowtimes.map((s) => {
      const startTime = formatTime(s.time)
      const endTimeStr = s.endTime ? formatTime(s.endTime) : undefined

      return {
        id: s.id,
        startTime,
        endTime: endTimeStr,
        formats: s.formats,
        price: s.price,
        isAvailable: s.ticketsAvailable === undefined || s.ticketsAvailable > 0,
        isSelected: selectedShowtimeId === s.id,
      }
    })
  }

  return (
    <div className={cn("bg-background min-h-screen", className)}>
      {/* Header */}
      <header className="border-border/50 border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
          {/* Logo would go here - using back button for now */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-muted-foreground hover:text-foreground gap-2"
          >
            <BackArrow className="h-4 w-4" />
            <span>{labels.back}</span>
          </Button>

          {/* Nav items placeholder */}
          <nav className="hidden items-center gap-6 lg:flex">
            <span className="text-muted-foreground text-sm">Recherche</span>
            <span className="text-muted-foreground text-sm">Billets</span>
            <span className="text-muted-foreground text-sm">Compte</span>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-12 xl:grid-cols-[1fr_400px]">
          {/* Left Column - Selection */}
          <div>
            {/* Page Title */}
            <h1 className="font-display text-foreground mb-2 text-3xl lg:text-4xl">
              {labels.title}
            </h1>
            <h2 className="text-foreground mb-6 text-xl font-semibold">
              {labels.subtitle}
            </h2>

            <p className="text-muted-foreground mb-6">{labels.chooseSession}</p>

            {/* Date Selector */}
            <div className="mb-8">
              <DateSelectorDesktop
                dates={dateOptions}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
              />
            </div>

            {/* Venue Cards */}
            <div className="space-y-4">
              {venues.map((venue) => {
                const venueShowtimes = showtimesByVenue[venue.id]
                if (!venueShowtimes || venueShowtimes.length === 0) return null

                return (
                  <VenueShowtimeCard
                    key={venue.id}
                    venueName={venue.name}
                    venueAddress={
                      venue.city
                        ? `${venue.address}, ${venue.city}`
                        : venue.address
                    }
                    showtimes={convertToSlots(venueShowtimes)}
                    selectedShowtimeId={selectedShowtimeId}
                    onShowtimeSelect={handleShowtimeSelect}
                  />
                )
              })}

              {Object.keys(showtimesByVenue).length === 0 && (
                <p className="text-muted-foreground py-8 text-center">
                  Aucune séance disponible pour cette date.
                </p>
              )}
            </div>
          </div>

          {/* Right Column - Movie Card Sidebar */}
          <aside className="mt-8 lg:mt-0">
            <div className="bg-secondary sticky top-24 rounded-xl p-5">
              {/* Movie Info */}
              <div className="flex gap-4">
                {/* Poster */}
                {movie.posterUrl && (
                  <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={movie.posterUrl}
                      alt={movie.title}
                      fill
                      sizes="96px"
                      className="object-cover"
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                    />
                  </div>
                )}

                {/* Details */}
                <div className="flex-1">
                  <h3 className="text-foreground mb-1 text-lg font-bold">
                    {movie.title}
                  </h3>
                  {movie.director && (
                    <p className="text-muted-foreground text-sm">
                      {labels.from} {movie.director}
                    </p>
                  )}

                  {/* Selected Session Info */}
                  {selectedShowtime && selectedVenue && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarIcon className="text-muted-foreground h-4 w-4" />
                        <span className="text-foreground">
                          {formatDateLong(selectedShowtime.time)} {labels.at}{" "}
                          {formatTime(selectedShowtime.time)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="text-muted-foreground h-4 w-4" />
                        <span className="text-foreground">
                          {selectedVenue.name}
                        </span>
                      </div>
                      {selectedShowtime.formats.length > 0 && (
                        <div className="flex gap-1">
                          {selectedShowtime.formats.map((format) => (
                            <Badge
                              key={format}
                              variant="secondary"
                              className="text-xs"
                            >
                              {format}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* CTA Button */}
              <Button
                size="lg"
                className={cn(
                  "mt-6 w-full text-base transition-all",
                  !selectedShowtimeId && "cursor-not-allowed opacity-50"
                )}
                disabled={!selectedShowtimeId}
                onClick={handleConfirmSession}
              >
                {labels.chooseThisSession}
              </Button>
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile Bottom Bar */}
      <div className="bg-background/95 border-border/50 fixed inset-x-0 bottom-0 border-t p-4 backdrop-blur-sm lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-muted-foreground"
          >
            <BackArrow className="me-1 h-4 w-4" />
            {labels.back}
          </Button>

          <Button
            size="lg"
            className={cn(
              "flex-1 transition-all",
              !selectedShowtimeId && "cursor-not-allowed opacity-50"
            )}
            disabled={!selectedShowtimeId}
            onClick={handleConfirmSession}
          >
            {labels.chooseThisSession}
          </Button>
        </div>
      </div>
    </div>
  )
}

TicketingPageDesktop.displayName = "TicketingPageDesktop"
