"use client"

import * as React from "react"
import Link from "next/link"
import {
  Calendar,
  Download,
  MapPin,
  Receipt,
  Search,
  Ticket,
  User,
} from "lucide-react"
import { useLocale } from "next-intl"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * My Events Desktop Prototype
 *
 * Based on the Tiween "Mes événements" mockups showing:
 * - Header with tiween.com logo and navigation
 * - Page title "Mes événements"
 * - Two tabs: "À venir" (upcoming) and "Passés" (past)
 * - Event cards with poster, title, director, date, venue, ticket count, price
 * - Action buttons: "Télécharger mes billets" for upcoming, "Télécharger un reçu" for past
 */

// Mock data for upcoming events
const upcomingEvents = [
  {
    id: 1,
    title: "Bullet Train",
    director: "David Leitch",
    date: "Jeu. 15 sep. 2022 à 15h00",
    venue: "Ciné Alhambra Zéphyr",
    ticketCount: 2,
    totalPrice: 24.4,
    posterPlaceholder: "BT",
  },
  {
    id: 2,
    title: "Madame M.",
    director: "Essia Jaïdi",
    date: "Jeu. 20 oct. 2022 à 20h00",
    venue: "Nom du théâtre",
    ticketCount: 2,
    totalPrice: 24.4,
    posterPlaceholder: "MM",
  },
]

// Mock data for past events
const pastEvents = [
  {
    id: 3,
    title: "Moofall",
    director: "Rolland Emmerich",
    date: "Mer. 06 avr. 2022 à 15h00",
    venue: "Ciné Alhambra Zéphyr",
    ticketCount: 2,
    totalPrice: 24.4,
    posterPlaceholder: "MF",
  },
  {
    id: 4,
    title: "Morbius",
    director: "Daniel Espinosa",
    date: "Jeu. 20 oct. 2022 à 20h00",
    venue: "Ciné Alhambra Zéphyr",
    ticketCount: 2,
    totalPrice: 24.4,
    posterPlaceholder: "MB",
  },
]

type TabType = "upcoming" | "past"

export default function MyEventsPrototype() {
  const locale = useLocale()
  const [activeTab, setActiveTab] = React.useState<TabType>("upcoming")

  const events = activeTab === "upcoming" ? upcomingEvents : pastEvents

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
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

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-12 lg:px-8">
        {/* Page Title */}
        <h1 className="font-display text-foreground mb-10 text-center text-4xl lg:text-5xl">
          Mes événements
        </h1>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-border/50 flex border-b">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={cn(
                "relative flex-1 py-4 text-center text-sm font-medium transition-colors",
                activeTab === "upcoming"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              À venir
              {activeTab === "upcoming" && (
                <span className="bg-primary absolute right-0 bottom-0 left-0 h-0.5" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("past")}
              className={cn(
                "relative flex-1 py-4 text-center text-sm font-medium transition-colors",
                activeTab === "past"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Passés
              {activeTab === "past" && (
                <span className="bg-primary absolute right-0 bottom-0 left-0 h-0.5" />
              )}
            </button>
          </div>
        </div>

        {/* Event Cards */}
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-secondary/60 hover:bg-secondary/80 flex items-center gap-6 rounded-2xl p-5 transition-all"
            >
              {/* Poster Thumbnail */}
              <div className="bg-background/30 flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                <div
                  className="flex h-full w-full items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, hsl(${event.id * 40 + 160}, 30%, 20%) 0%, hsl(${event.id * 30 + 170}, 40%, 12%) 100%)`,
                  }}
                >
                  <span className="text-muted-foreground/50 text-xs font-medium">
                    {event.posterPlaceholder}
                  </span>
                </div>
              </div>

              {/* Event Details */}
              <div className="flex flex-1 flex-col gap-1">
                <h2 className="text-foreground text-lg font-bold">
                  {event.title}
                </h2>
                <p className="text-primary text-sm">de {event.director}</p>

                <div className="text-muted-foreground mt-2 flex flex-col gap-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{event.venue}</span>
                  </div>
                </div>
              </div>

              {/* Ticket Info & Action */}
              <div className="flex flex-col items-end gap-3">
                <div className="text-right">
                  <p className="text-muted-foreground text-sm">
                    Billets{" "}
                    <span className="text-foreground font-medium">
                      x {event.ticketCount}
                    </span>
                  </p>
                  <p className="text-foreground font-semibold">
                    {event.totalPrice.toFixed(2).replace(".", ",")} DT
                  </p>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-secondary hover:bg-accent gap-2 rounded-full px-5 whitespace-nowrap"
                >
                  {activeTab === "upcoming" ? (
                    <>
                      <Download className="h-4 w-4" />
                      Télécharger mes billets
                    </>
                  ) : (
                    <>
                      <Receipt className="h-4 w-4" />
                      Télécharger un reçu
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State (if needed) */}
        {events.length === 0 && (
          <div className="py-16 text-center">
            <div className="text-muted-foreground/30 mb-4 text-6xl">🎭</div>
            <h3 className="text-foreground mb-2 text-lg font-medium">
              {activeTab === "upcoming"
                ? "Aucun événement à venir"
                : "Aucun événement passé"}
            </h3>
            <p className="text-muted-foreground text-sm">
              {activeTab === "upcoming"
                ? "Découvrez notre programmation et réservez vos places !"
                : "Vos événements passés apparaîtront ici."}
            </p>
            {activeTab === "upcoming" && (
              <Button className="mt-6">Découvrir les événements</Button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
