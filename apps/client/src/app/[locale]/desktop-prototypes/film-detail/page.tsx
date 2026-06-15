"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Heart,
  MapPin,
  Search,
  Share2,
  Star,
  Ticket,
  User,
} from "lucide-react"
import { useLocale } from "next-intl"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

/**
 * Film Detail Desktop Prototype
 *
 * Based on the Tiween Film Desktop mockup showing:
 * - Header with tiween.com logo and navigation (Recherche, Billets, Compte)
 * - Two-column layout (content left, poster sidebar right)
 * - Movie title with director, badges (Cinéma, VF, VOST), rating
 * - Large hero image with Joker film still and navigation dots
 * - Synopsis section with expand/collapse
 * - Équipe artistique with director photos
 * - Distribution section with circular cast avatars
 * - Date selector for showtimes with venue cards
 * - Related films carousel ("Ça pourrait vous plaire...")
 */

// Mock data matching the Bullet Train mockup
const mockFilm = {
  title: "Bullet Train",
  director: "David Leitch",
  year: 2022,
  category: "Cinéma",
  formats: ["VF", "VOST"],
  rating: 4.2,
  duration: 126,
  genres: ["Action", "Comédie"],
  synopsis: `Coccinelle est un assassin malchanceux, déterminé à accomplir sa mission tranquillement après un échec cuisant. Le destin en a toutefois décidé autrement et il est amené à découvrir que ses dernières missions ont un point commun avec ce qu'il doit accomplir dans ce train.

Dans ce train à grande vitesse, il va croiser des adversaires redoutables, qui ont aussi quelque chose à régler dans ce bolide filant à travers le Japon. Une nuit mouvementée s'annonce pour notre héros malchanceux...`,
  directors: [
    { name: "David Leitch", role: "Réalisateur" },
    { name: "Zak Olkewicz", role: "Scénariste" },
  ],
  cast: [
    { name: "Brad Pitt", role: "Coccinelle" },
    { name: "Joey King", role: "Le Prince" },
    { name: "Aaron Taylor", role: "Tangerine" },
    { name: "Brian Tyree", role: "Lemon" },
  ],
  showtimes: [
    {
      date: "2024-09-14",
      venues: [
        {
          id: "cine-alhambra",
          name: "Ciné Alhambra Zéphyr",
          address: "Rue de l'Amérique, Marsa",
          times: [
            { time: "15h00", format: "VOST", price: 15 },
            { time: "17h30", format: "VF", price: 15 },
            { time: "20h00", format: "VOST", price: 15 },
          ],
        },
      ],
    },
    {
      date: "2024-09-15",
      venues: [
        {
          id: "cine-alhambra",
          name: "Ciné Alhambra Zéphyr",
          address: "Rue de l'Amérique, Marsa",
          times: [
            { time: "14h00", format: "VF", price: 15 },
            { time: "16h30", format: "VOST", price: 15 },
            { time: "19h00", format: "VF", price: 15 },
            { time: "21h30", format: "VOST", price: 15 },
          ],
        },
      ],
    },
    { date: "2024-09-16", venues: [] },
    { date: "2024-09-17", venues: [] },
    { date: "2024-09-18", venues: [] },
    { date: "2024-09-19", venues: [] },
    { date: "2024-09-20", venues: [] },
  ],
  relatedFilms: [
    { title: "John Wick 4", genre: "Action" },
    { title: "Fast X", genre: "Action" },
    { title: "Oppenheimer", genre: "Drame" },
    { title: "Barbie", genre: "Comédie" },
    { title: "Mission Impossible", genre: "Action" },
  ],
}

export default function FilmDetailPrototype() {
  const router = useRouter()
  const locale = useLocale()
  const [watchlisted, setWatchlisted] = React.useState(false)
  const [synopsisExpanded, setSynopsisExpanded] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState(
    mockFilm.showtimes[0]?.date
  )
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0)

  const handleBack = () => router.back()

  const selectedShowtimes = mockFilm.showtimes.find(
    (s) => s.date === selectedDate
  )

  return (
    <div className="bg-background min-h-screen">
      {/* Header matching Tiween design */}
      <header className="border-border/50 border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link href={`/${locale}`} className="flex items-center gap-2">
              <div className="bg-primary flex h-10 w-10 items-center justify-center rounded-full">
                <span className="text-primary-foreground text-lg font-bold">
                  ☺
                </span>
              </div>
              <span className="text-foreground font-display text-xl tracking-tight">
                tiween.com
              </span>
            </Link>
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

      {/* Main Content - Two Column Layout */}
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-10 xl:grid-cols-[1fr_320px] xl:gap-12">
          {/* Left Column - Main Content */}
          <div>
            {/* Title Section */}
            <h1 className="font-display text-foreground mb-1 text-4xl xl:text-5xl">
              {mockFilm.title}
            </h1>
            <p className="text-primary mb-4 text-lg font-medium">
              de {mockFilm.director}
            </p>

            {/* Badges & Metadata Row */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <Badge
                variant="default"
                className="bg-primary text-primary-foreground"
              >
                {mockFilm.category}
              </Badge>
              {mockFilm.formats.map((format) => (
                <Badge
                  key={format}
                  variant="outline"
                  className="border-primary/50 text-primary"
                >
                  {format}
                </Badge>
              ))}
              {mockFilm.genres.map((genre) => (
                <Badge key={genre} variant="secondary">
                  {genre}
                </Badge>
              ))}

              {/* Divider */}
              <span className="text-border">|</span>

              {/* Rating */}
              <div className="flex items-center gap-1">
                <Star className="fill-primary text-primary h-4 w-4" />
                <span className="text-foreground font-medium">
                  {mockFilm.rating}
                </span>
              </div>

              {/* Duration */}
              <div className="text-muted-foreground flex items-center gap-1 text-sm">
                <Clock className="h-4 w-4" />
                <span>{mockFilm.duration} min</span>
              </div>

              {/* Year */}
              <span className="text-muted-foreground text-sm">
                {mockFilm.year}
              </span>
            </div>

            {/* Hero Image - Film Still */}
            <div className="bg-secondary relative mb-8 aspect-video overflow-hidden rounded-2xl">
              {/* Placeholder for film still - would be actual image in production */}
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(to bottom, transparent 60%, rgba(3,37,35,0.8)),
                    linear-gradient(135deg, #1a4a47 0%, #0d2927 50%, #1a3a38 100%)`,
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mb-4 text-6xl opacity-30">🎬</div>
                    <span className="text-muted-foreground text-sm">
                      [Film Still - Joker Scene]
                    </span>
                  </div>
                </div>
              </div>

              {/* Image Navigation Dots */}
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                {[0, 1, 2].map((idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={cn(
                      "h-2 w-2 rounded-full transition-all",
                      currentImageIndex === idx
                        ? "w-6 bg-white"
                        : "bg-white/50 hover:bg-white/70"
                    )}
                    aria-label={`Image ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Image Counter */}
              <div className="absolute right-4 bottom-4">
                <span className="rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                  0{currentImageIndex + 1} / 03
                </span>
              </div>
            </div>

            {/* Synopsis Section */}
            <section className="mb-10">
              <h2 className="text-foreground mb-4 text-xl font-semibold">
                Synopsis
              </h2>
              <div className="text-muted-foreground leading-relaxed">
                {synopsisExpanded
                  ? mockFilm.synopsis
                  : mockFilm.synopsis.slice(0, 280) + "..."}
              </div>
              <button
                onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                className="text-primary mt-3 flex items-center gap-1 text-sm font-medium hover:underline"
              >
                {synopsisExpanded ? (
                  <>
                    Voir moins
                    <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Voir plus
                    <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </button>
            </section>

            {/* Équipe artistique */}
            <section className="mb-10">
              <h2 className="text-foreground mb-6 text-xl font-semibold">
                Équipe artistique
              </h2>

              {/* Directors Row */}
              <div className="mb-6">
                <h3 className="text-muted-foreground mb-4 text-xs font-medium tracking-wider uppercase">
                  Réalisation
                </h3>
                <div className="flex flex-wrap gap-6">
                  {mockFilm.directors.map((person, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="bg-secondary ring-border/50 flex h-14 w-14 items-center justify-center rounded-full ring-2">
                        <span className="text-muted-foreground text-lg font-medium">
                          {person.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <div>
                        <p className="text-foreground font-medium">
                          {person.name}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {person.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Distribution */}
            <section className="mb-10">
              <h2 className="text-foreground mb-6 text-xl font-semibold">
                Distribution
              </h2>
              <div className="flex flex-wrap gap-8">
                {mockFilm.cast.map((person, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="bg-secondary ring-border/30 hover:ring-primary/50 mb-3 flex h-20 w-20 items-center justify-center rounded-full ring-2 transition-all">
                      <span className="text-muted-foreground text-xl font-medium">
                        {person.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                    <p className="text-foreground text-sm font-medium">
                      {person.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {person.role}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Choisir une séance */}
            <section className="mb-10">
              <h2 className="text-foreground mb-6 text-xl font-semibold">
                Choisir une séance
              </h2>

              {/* Date Selector - Horizontal scroll */}
              <div className="bg-secondary/50 mb-6 rounded-xl p-3">
                <div className="no-scrollbar flex gap-2 overflow-x-auto">
                  {mockFilm.showtimes.map((day) => {
                    const date = new Date(day.date)
                    const dayName = date.toLocaleDateString("fr-FR", {
                      weekday: "short",
                    })
                    const dayNum = date.getDate()
                    const monthName = date.toLocaleDateString("fr-FR", {
                      month: "short",
                    })
                    const isSelected = selectedDate === day.date
                    const hasShowtimes = day.venues.length > 0

                    return (
                      <button
                        key={day.date}
                        onClick={() => setSelectedDate(day.date)}
                        disabled={!hasShowtimes}
                        className={cn(
                          "flex min-w-[70px] flex-col items-center rounded-xl px-4 py-3 transition-all",
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-lg"
                            : hasShowtimes
                              ? "bg-background/80 text-foreground hover:bg-background"
                              : "text-muted-foreground/50 cursor-not-allowed opacity-50"
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

              {/* Venue Cards with Showtimes */}
              {selectedShowtimes && selectedShowtimes.venues.length > 0 ? (
                <div className="space-y-4">
                  {selectedShowtimes.venues.map((venue) => (
                    <div
                      key={venue.id}
                      className="bg-secondary/60 rounded-xl p-5"
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <div>
                          <h3 className="text-foreground font-semibold">
                            {venue.name}
                          </h3>
                          <p className="text-muted-foreground flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            {venue.address}
                          </p>
                        </div>
                      </div>

                      {/* Showtimes Grid */}
                      <div className="flex flex-wrap gap-3">
                        {venue.times.map((showtime, idx) => (
                          <button
                            key={idx}
                            className="bg-background/50 hover:bg-accent group hover:ring-primary/50 flex flex-col items-center rounded-lg px-5 py-3 transition-all hover:ring-2"
                          >
                            <Badge
                              variant="outline"
                              className="border-primary/30 text-primary mb-1 text-xs"
                            >
                              {showtime.format}
                            </Badge>
                            <span className="text-foreground text-lg font-bold">
                              {showtime.time}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {showtime.price} DT
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-secondary/30 rounded-xl p-8 text-center">
                  <p className="text-muted-foreground">
                    Aucune séance disponible pour cette date
                  </p>
                </div>
              )}

              {/* CTA Button */}
              <Button size="lg" className="mt-6 w-full gap-2 text-base">
                <Ticket className="h-5 w-5" />
                Réserver des billets
              </Button>
            </section>
          </div>

          {/* Right Column - Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-8">
              {/* Movie Poster Card */}
              <div className="bg-secondary rounded-2xl p-4">
                {/* Poster */}
                <div className="bg-background/30 relative mb-4 aspect-[2/3] overflow-hidden rounded-xl">
                  <div
                    className="absolute inset-0 bg-gradient-to-br from-amber-900/30 via-stone-800/50 to-stone-900/70"
                    style={{
                      backgroundImage: `linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.4) 100%)`,
                    }}
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                      <div className="mb-3 text-5xl opacity-40">🎬</div>
                      <span className="text-muted-foreground text-center text-xs">
                        [Bullet Train Poster]
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                    onClick={() => setWatchlisted(!watchlisted)}
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4 transition-all",
                        watchlisted && "fill-primary text-primary"
                      )}
                    />
                    {watchlisted ? "Enregistré" : "Ajouter aux favoris"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                  >
                    <Share2 className="h-4 w-4" />
                    Partager
                  </Button>
                </div>
              </div>

              {/* Film Info Card */}
              <div className="bg-secondary/50 mt-4 rounded-2xl p-4">
                <h3 className="text-foreground mb-4 font-semibold">
                  Informations
                </h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Année</dt>
                    <dd className="text-foreground">{mockFilm.year}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Durée</dt>
                    <dd className="text-foreground">{mockFilm.duration} min</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Genre</dt>
                    <dd className="text-foreground">
                      {mockFilm.genres.join(", ")}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Formats</dt>
                    <dd className="text-foreground">
                      {mockFilm.formats.join(", ")}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Related Films Section */}
      <section className="border-border/50 border-t py-10">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-foreground text-xl font-semibold">
              Ça pourrait vous plaire...
            </h2>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Films Carousel */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {mockFilm.relatedFilms.map((film, idx) => (
              <div
                key={idx}
                className="group hover:ring-primary/50 cursor-pointer overflow-hidden rounded-xl transition-all hover:ring-2"
              >
                <div className="bg-secondary aspect-[2/3]">
                  <div
                    className="flex h-full items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, hsl(${160 + idx * 15}, 30%, 15%) 0%, hsl(${170 + idx * 10}, 40%, 10%) 100%)`,
                    }}
                  >
                    <span className="text-muted-foreground text-xs opacity-50">
                      [Poster]
                    </span>
                  </div>
                </div>
                <div className="bg-secondary/80 p-3">
                  <h3 className="text-foreground group-hover:text-primary truncate text-sm font-medium transition-colors">
                    {film.title}
                  </h3>
                  <p className="text-muted-foreground truncate text-xs">
                    {film.genre}
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
