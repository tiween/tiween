"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Heart,
  MapPin,
  Share2,
  Ticket,
} from "lucide-react"
import { useLocale } from "next-intl"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

/**
 * Theater Detail Desktop Prototype
 *
 * This is a static prototype demonstrating the desktop theater/event detail page.
 * Based on the Tiween design mockups with:
 * - Two-column layout (content left, poster sidebar right)
 * - Hero image with navigation dots
 * - Presentation text section
 * - Artistic team with avatars
 * - Horizontal date selector for representations
 * - Photos gallery
 * - Related events carousel
 */

// Mock data for the prototype
const mockEvent = {
  title: "Madame M.",
  director: "Eata Julia",
  originalTitle: "Madame M. - Une pièce de théâtre",
  category: "Théâtre",
  genres: ["Drame", "Contemporain"],
  rating: 4.5,
  duration: 90,
  venue: {
    name: "Théâtre Municipal de Tunis",
    address: "Avenue Habib Bourguiba",
    city: "Tunis",
  },
  startDate: "2024-09-14",
  endDate: "2024-09-28",
  synopsis: `Après dix mois d'absence, le narrateur, Eunice, trouve entre tête-à-tête avec les traces laissées par cette autre femme qui a quitté son entourage, l'amoureuse Nadia, aussi absente maintenant. Il y a une partie entre elles qui se cache et un secret qui les unit dans cette attente.

Après leur vie quotidienne épineuse par cette femme à l'origine de tout, les personnages naviguent dans un monde absurde ou tragique. Cette grande pièce contemporaine montre un récit poignant et révélateur sur les relations humaines et les non-dits qui les façonnent.`,
  directors: [
    { name: "Eata Julia", photo: null },
    { name: "Mohamed Ben Ali", photo: null },
  ],
  cast: [
    { name: "Fatma Ben", photo: null, role: "Madame M." },
    { name: "Phouma Nour", photo: null, role: "Eunice" },
    { name: "Phouma Nour", photo: null, role: "Nadia" },
    { name: "Phouma Nour", photo: null, role: "Le narrateur" },
  ],
  showtimes: [
    { date: "2024-09-14", times: ["19:00", "21:00"] },
    { date: "2024-09-15", times: ["15:00", "19:00", "21:00"] },
    { date: "2024-09-16", times: ["19:00"] },
    { date: "2024-09-17", times: ["19:00", "21:00"] },
    { date: "2024-09-18", times: ["19:00"] },
    { date: "2024-09-19", times: ["15:00", "19:00"] },
    { date: "2024-09-20", times: ["19:00", "21:00"] },
  ],
  images: ["/placeholder-theater-1.jpg", "/placeholder-theater-2.jpg"],
  relatedEvents: [
    { title: "Les Misérables", venue: "Théâtre de l'Opéra" },
    { title: "Hamlet", venue: "Théâtre Municipal" },
    { title: "Le Malade Imaginaire", venue: "Théâtre de Carthage" },
    { title: "Roméo et Juliette", venue: "Palais des Congrès" },
  ],
}

export default function TheaterDetailPrototype() {
  const router = useRouter()
  const locale = useLocale()
  const [watchlisted, setWatchlisted] = React.useState(false)
  const [synopsisExpanded, setSynopsisExpanded] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState(
    mockEvent.showtimes[0]?.date
  )

  const handleBack = () => router.back()

  return (
    <div className="bg-background min-h-screen">
      {/* Navigation Header */}
      <header className="bg-background/80 border-border/50 sticky top-0 z-50 border-b backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-muted-foreground hover:text-foreground gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Retour</span>
            </Button>
            <Link
              href={`/${locale}/desktop-prototypes`}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              ← Back to Prototypes
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              aria-label="Partager"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setWatchlisted(!watchlisted)}
              className="h-9 w-9"
              aria-label="Ajouter à la liste"
            >
              <Heart
                className={cn(
                  "h-4 w-4 transition-all",
                  watchlisted ? "fill-primary text-primary" : ""
                )}
              />
            </Button>
          </div>
        </div>
      </header>

      {/* Desktop Two-Column Layout */}
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-12 xl:grid-cols-[1fr_380px]">
          {/* Left Column - Main Content */}
          <div>
            {/* Badges */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge variant="default">{mockEvent.category}</Badge>
              {mockEvent.genres.map((genre) => (
                <Badge key={genre} variant="outline">
                  {genre}
                </Badge>
              ))}
            </div>

            {/* Title */}
            <h1 className="font-display text-foreground mb-2 text-4xl xl:text-5xl">
              {mockEvent.title}
            </h1>

            {/* Director */}
            <p className="text-primary mb-4 text-lg">de {mockEvent.director}</p>

            {/* Metadata Row */}
            <div className="text-muted-foreground mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Du 14 Sep. au 28 Sep. 2024</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{mockEvent.venue.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{mockEvent.duration} min</span>
              </div>
            </div>

            {/* Hero Image */}
            <div className="bg-secondary relative mb-8 aspect-video overflow-hidden rounded-xl">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-muted-foreground">
                  [Theater Performance Image]
                </span>
              </div>
              {/* Image navigation */}
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                <span className="h-2 w-2 rounded-full bg-white"></span>
                <span className="h-2 w-2 rounded-full bg-white/50"></span>
                <span className="h-2 w-2 rounded-full bg-white/50"></span>
              </div>
              <div className="absolute right-4 bottom-4 flex items-center gap-2">
                <span className="rounded bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm">
                  01 / 03
                </span>
              </div>
            </div>

            {/* Presentation */}
            <section className="mb-8">
              <h2 className="text-foreground mb-4 text-2xl font-semibold">
                Présentation
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {synopsisExpanded
                  ? mockEvent.synopsis
                  : mockEvent.synopsis.slice(0, 300) + "..."}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                className="text-primary mt-3 h-auto p-0"
              >
                {synopsisExpanded ? (
                  <>
                    Voir moins
                    <ChevronUp className="ms-1 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Voir plus
                    <ChevronDown className="ms-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </section>

            {/* Artistic Team */}
            <section className="mb-8">
              <h2 className="text-foreground mb-4 text-2xl font-semibold">
                Équipe artistique
              </h2>

              <div className="space-y-6">
                {/* Directors */}
                <div>
                  <h3 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
                    Mise en scène
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    {mockEvent.directors.map((person, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="bg-secondary flex h-12 w-12 items-center justify-center rounded-full">
                          <span className="text-muted-foreground font-medium">
                            {person.name.charAt(0)}
                          </span>
                        </div>
                        <span className="text-foreground font-medium">
                          {person.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cast */}
                <div>
                  <h3 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
                    Distribution
                  </h3>
                  <div className="flex flex-wrap gap-6">
                    {mockEvent.cast.map((person, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col items-center text-center"
                      >
                        <div className="bg-secondary mb-2 flex h-20 w-20 items-center justify-center rounded-full">
                          <span className="text-muted-foreground text-lg">
                            {person.name.charAt(0)}
                          </span>
                        </div>
                        <span className="text-foreground text-sm">
                          {person.name}
                        </span>
                        {person.role && (
                          <span className="text-muted-foreground text-xs">
                            {person.role}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Choose Representation */}
            <section className="mb-8">
              <h2 className="text-foreground mb-4 text-2xl font-semibold">
                Choisir une représentation
              </h2>

              {/* Date Selector */}
              <div className="bg-secondary mb-6 rounded-lg p-4">
                <div className="no-scrollbar flex gap-2 overflow-x-auto">
                  {mockEvent.showtimes.map((day) => {
                    const date = new Date(day.date)
                    const dayName = date.toLocaleDateString("fr-TN", {
                      weekday: "short",
                    })
                    const dayNum = date.getDate()
                    const monthName = date.toLocaleDateString("fr-TN", {
                      month: "short",
                    })
                    const isSelected = selectedDate === day.date

                    return (
                      <button
                        key={day.date}
                        onClick={() => setSelectedDate(day.date)}
                        className={cn(
                          "flex min-w-[72px] flex-col items-center rounded-xl px-4 py-3 transition-all",
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

              {/* Showtimes */}
              <div className="space-y-3">
                {mockEvent.showtimes
                  .find((s) => s.date === selectedDate)
                  ?.times.map((time, idx) => (
                    <button
                      key={idx}
                      className="bg-secondary hover:bg-accent flex w-full items-center justify-between rounded-lg p-4 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-foreground text-xl font-bold">
                          {time}
                        </span>
                        <Badge variant="secondary">Standard</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-foreground font-medium">
                          25 TND
                        </span>
                        <Ticket className="text-muted-foreground h-5 w-5" />
                      </div>
                    </button>
                  ))}
              </div>

              <Button size="lg" className="mt-6 w-full gap-2 text-lg">
                <Ticket className="h-5 w-5" />
                Réserver des billets
              </Button>
            </section>

            {/* Photos Gallery */}
            <section className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-foreground text-2xl font-semibold">
                  Photos
                </h2>
                <Button variant="ghost" size="sm" className="text-primary">
                  Voir tout
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-secondary relative aspect-video overflow-hidden rounded-lg"
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-muted-foreground text-xs">
                        Photo {i}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column - Sidebar */}
          <aside className="hidden lg:block">
            <div className="bg-secondary sticky top-24 rounded-xl p-5">
              {/* Poster Placeholder */}
              <div className="bg-background/30 relative mb-4 aspect-[2/3] overflow-hidden rounded-lg">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-muted-foreground text-center text-sm">
                    [Event Poster]
                  </span>
                </div>
              </div>

              {/* Quick Info */}
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Calendar className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                  <span className="text-foreground">
                    Du 14 Sep. au 28 Sep. 2024
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-foreground">{mockEvent.venue.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {mockEvent.venue.address}, {mockEvent.venue.city}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="text-muted-foreground h-4 w-4 shrink-0" />
                  <span className="text-foreground">
                    {mockEvent.duration} min
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-2">
                <Button variant="outline" className="w-full">
                  <Share2 className="me-2 h-4 w-4" />
                  Partager
                </Button>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full",
                    watchlisted && "border-primary text-primary"
                  )}
                  onClick={() => setWatchlisted(!watchlisted)}
                >
                  <Heart
                    className={cn(
                      "me-2 h-4 w-4",
                      watchlisted && "fill-primary"
                    )}
                  />
                  {watchlisted ? "Enregistré" : "Enregistrer"}
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Related Events */}
      <section className="border-border/50 border-t py-8">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-foreground text-2xl font-semibold">
              Vous pourriez aussi aimer...
            </h2>
            <Button variant="ghost" size="sm" className="text-primary">
              Voir tout
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
            {mockEvent.relatedEvents.map((event, idx) => (
              <div
                key={idx}
                className="bg-secondary group hover:ring-primary/50 overflow-hidden rounded-xl transition-all hover:ring-2"
              >
                <div className="bg-background/30 aspect-[2/3]">
                  <div className="flex h-full items-center justify-center">
                    <span className="text-muted-foreground text-xs">
                      [Poster]
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="text-foreground group-hover:text-primary truncate text-sm font-medium transition-colors">
                    {event.title}
                  </h3>
                  <p className="text-muted-foreground truncate text-xs">
                    {event.venue}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
