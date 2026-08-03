"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  DateSelectorDesktop,
  VenueShowtimeCard,
} from "@/features/tickets/components"
import { ArrowLeft, Calendar, MapPin, Search, Ticket, User } from "lucide-react"
import { useLocale } from "next-intl"

import type { DateOption, ShowtimeSlot } from "@/features/tickets/components"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

/**
 * Ticketing Desktop Prototype
 *
 * Based on Tiween ticketing desktop design mockups showing:
 * - Header with logo and navigation
 * - Page title "Billetterie" with subtitle
 * - Horizontal date selector (week view)
 * - Venue cards with showtime grids
 * - Movie info sidebar with selection summary
 * - CTA button that activates when session is selected
 */

// Mock data matching the design mockup
const mockMovie = {
  title: "Bullet Train",
  director: "David Leitch",
  posterUrl: null, // Would be a real image in production
  duration: 126,
  releaseYear: 2022,
}

const mockVenues = [
  {
    id: "cine-alhambra",
    name: "Ciné Alhambra Zéphyr",
    address: "Rue de l'Amérique",
    city: "Marsa",
  },
  {
    id: "lagora",
    name: "L'Agora",
    address: "Avenue Taieb Mhiri",
    city: "La Marsa",
  },
  {
    id: "le-palace",
    name: "Le Palace",
    address: "Avenue Habib Bourguiba",
    city: "Tunis",
  },
]

// Generate dates for the next 7 days
function generateMockDates(): DateOption[] {
  const dates: DateOption[] = []
  const today = new Date()

  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)

    dates.push({
      date: date.toISOString().split("T")[0]!,
      dayName: date.toLocaleDateString("fr-TN", { weekday: "short" }),
      dayNumber: date.getDate(),
      monthName: date.toLocaleDateString("fr-TN", { month: "short" }),
      isToday: i === 0,
    })
  }

  return dates
}

// Generate mock showtimes for each venue
function generateMockShowtimes(venueId: string): ShowtimeSlot[] {
  const times = ["15h00", "16h30", "19h30", "21h00"]
  const formats: Array<("VOST" | "VF" | "3D")[]> = [
    ["VOST", "3D"],
    ["VF"],
    ["VF"],
    ["VOST"],
  ]

  return times.map((time, idx) => ({
    id: `${venueId}-${idx}`,
    startTime: time,
    endTime:
      idx === 0 ? "16h15" : idx === 1 ? "17h45" : idx === 2 ? "20h45" : "22h15",
    formats: formats[idx]!,
    price: 15,
    isAvailable: true,
  }))
}

// Find the showtime (and its venue) matching an id, across all venues
function findShowtimeDetails(showtimeId: string | number | null) {
  if (!showtimeId) return null

  for (const venue of mockVenues) {
    const showtimes = generateMockShowtimes(venue.id)
    const found = showtimes.find((s) => s.id === showtimeId)
    if (found) {
      return { ...found, venue }
    }
  }
  return null
}

export default function TicketingPrototype() {
  const router = useRouter()
  const locale = useLocale()
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null)
  const [selectedShowtimeId, setSelectedShowtimeId] = React.useState<
    string | number | null
  >(null)

  const dates = React.useMemo(() => generateMockDates(), [])

  // Set default date on mount
  React.useEffect(() => {
    if (dates.length > 0 && !selectedDate) {
      setSelectedDate(dates[0]!.date)
    }
  }, [dates, selectedDate])

  // Get selected showtime details. The lookup body was extracted to a pure
  // module-level function so the memo's dependency is just the id.
  const selectedShowtimeDetails = React.useMemo(
    () => findShowtimeDetails(selectedShowtimeId),
    [selectedShowtimeId]
  )

  const handleBack = () => router.back()

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    setSelectedShowtimeId(null)
  }

  const handleShowtimeSelect = (showtimeId: string | number) => {
    setSelectedShowtimeId(showtimeId)
  }

  const handleConfirmSession = () => {
    if (selectedShowtimeId) {
      // In real app, would navigate to ticket purchase flow
      alert(`Session selected: ${selectedShowtimeId}`)
    }
  }

  // Get formatted selected date
  const selectedDateFormatted = React.useMemo(() => {
    if (!selectedDate) return ""
    const date = new Date(selectedDate)
    return date.toLocaleDateString("fr-TN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }, [selectedDate])

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="border-border/50 border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
          {/* Logo / Back */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-full">
                <span className="text-primary-foreground text-sm font-bold">
                  T
                </span>
              </div>
              <span className="text-foreground font-display text-xl">
                tiween.com
              </span>
            </div>
            <Link
              href={`/${locale}/desktop-prototypes`}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              ← Back to Prototypes
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden items-center gap-8 lg:flex">
            <button className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors">
              <Search className="h-4 w-4" />
              Recherche
            </button>
            <button className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors">
              <Ticket className="h-4 w-4" />
              Billets
            </button>
            <button className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors">
              <User className="h-4 w-4" />
              Compte
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-12 xl:grid-cols-[1fr_400px]">
          {/* Left Column - Selection */}
          <div>
            {/* Page Title */}
            <h1 className="font-display text-foreground mb-2 text-4xl lg:text-5xl">
              Billetterie
            </h1>
            <h2 className="text-foreground mb-6 text-xl font-semibold">
              Choisir des billets
            </h2>

            <p className="text-muted-foreground mb-8">
              Choisissez la séance qui vous convient :
            </p>

            {/* Date Selector */}
            <div className="mb-8">
              <DateSelectorDesktop
                dates={dates}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
              />
            </div>

            {/* Venue Cards */}
            <div className="space-y-4">
              {mockVenues.map((venue) => {
                const showtimes = generateMockShowtimes(venue.id)

                return (
                  <VenueShowtimeCard
                    key={venue.id}
                    venueName={venue.name}
                    venueAddress={`${venue.address}, ${venue.city}`}
                    showtimes={showtimes.map((s) => ({
                      ...s,
                      isSelected: selectedShowtimeId === s.id,
                    }))}
                    selectedShowtimeId={selectedShowtimeId}
                    onShowtimeSelect={handleShowtimeSelect}
                  />
                )
              })}
            </div>
          </div>

          {/* Right Column - Movie Card Sidebar */}
          <aside className="mt-8 lg:mt-0">
            <div className="bg-secondary sticky top-8 rounded-xl p-5">
              {/* Movie Info */}
              <div className="flex gap-4">
                {/* Poster Placeholder */}
                <div className="bg-background/30 relative h-36 w-24 shrink-0 overflow-hidden rounded-lg">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-muted-foreground text-center text-xs">
                      [Poster]
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1">
                  <h3 className="text-foreground mb-1 text-lg font-bold">
                    {mockMovie.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    de {mockMovie.director}
                  </p>

                  {/* Selected Session Info */}
                  {selectedShowtimeDetails && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="text-muted-foreground h-4 w-4" />
                        <span className="text-foreground">
                          {selectedDateFormatted} à{" "}
                          {selectedShowtimeDetails.startTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="text-muted-foreground h-4 w-4" />
                        <span className="text-foreground">
                          {selectedShowtimeDetails.venue.name}
                        </span>
                      </div>
                      {selectedShowtimeDetails.formats.length > 0 && (
                        <div className="flex gap-1">
                          {selectedShowtimeDetails.formats.map((format) => (
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
                Choisir cette séance
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
            <ArrowLeft className="me-1 h-4 w-4" />
            Retour
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
            Choisir cette séance
          </Button>
        </div>
      </div>
    </div>
  )
}
