"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  Check,
  MapPin,
  Search,
  Ticket,
  Trash2,
  User,
} from "lucide-react"
import { useLocale } from "next-intl"

import { Button } from "@/components/ui/button"

/**
 * Ticketing Step 3 - Cart Summary / Reservation Recap
 *
 * Based on the TIWEEN_Ticketing_05_Desktop mockup:
 * - Header with tiween.com logo and navigation
 * - "Billetterie" title with "Récapitulatif de votre réservation" subtitle
 * - Success message about reservation added to cart
 * - Option to continue shopping or proceed to payment
 * - Sidebar with movie info, ticket summary, price total
 * - "Modifier mes places" and "Passer au paiement" buttons
 */

// Mock data
const mockReservation = {
  movie: {
    title: "Bullet Train",
    director: "David Leitch",
    selectedDate: "Jeu. 15 sep. 2022 à 15h00",
    venue: "Ciné Alhambra Zéphyr",
  },
  tickets: [
    {
      type: "Billets Plein Tarif",
      quantity: 2,
      unitPrice: 11.9,
      totalPrice: 11.9,
    },
  ],
  totalPrice: 23.8,
}

export default function TicketingSummaryPrototype() {
  const router = useRouter()
  const locale = useLocale()

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
      <main className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="lg:grid lg:grid-cols-[1fr_400px] lg:gap-12">
          {/* Left Column - Recap Content */}
          <div>
            {/* Page Title */}
            <h1 className="font-display text-foreground mb-2 text-4xl lg:text-5xl">
              Billetterie
            </h1>
            <h2 className="text-foreground mb-8 text-xl font-semibold">
              Récapitulatif de votre réservation
            </h2>

            {/* Success Message Card */}
            <div className="bg-secondary/60 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                {/* Success Icon */}
                <div className="bg-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                  <Check className="text-primary h-5 w-5" />
                </div>

                {/* Message */}
                <div>
                  <p className="text-foreground mb-2">
                    Votre réservation de 2 billets vient d&apos;être ajoutée à
                    votre panier.
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Vous pouvez poursuivre votre commande en choisissant un
                    autre événement.
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Pour finaliser et payer, cliquez sur &quot;
                    <Link href="#" className="text-primary hover:underline">
                      Passer au paiement
                    </Link>
                    &quot;.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Navigation */}
            <div className="mt-12 flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </button>

              <Button size="lg" className="min-w-[280px] text-base">
                Passer au paiement
              </Button>
            </div>
          </div>

          {/* Right Column - Order Summary Sidebar */}
          <aside className="mt-12 lg:mt-0">
            {/* Movie Info Card */}
            <div className="bg-secondary rounded-2xl p-5">
              {/* Header with Delete Button */}
              <div className="mb-4 flex items-start justify-between">
                <div className="flex gap-4">
                  {/* Poster Thumbnail */}
                  <div className="bg-background/30 flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                    <div
                      className="flex h-full w-full items-center justify-center"
                      style={{
                        background:
                          "linear-gradient(135deg, hsl(180, 30%, 18%) 0%, hsl(175, 40%, 10%) 100%)",
                      }}
                    >
                      <span className="text-muted-foreground/50 text-xs">
                        [Poster]
                      </span>
                    </div>
                  </div>

                  {/* Movie Details */}
                  <div className="flex-1">
                    <h3 className="text-foreground text-lg font-bold">
                      {mockReservation.movie.title}
                    </h3>
                    <p className="text-primary text-sm">
                      de {mockReservation.movie.director}
                    </p>

                    <div className="text-muted-foreground mt-3 space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{mockReservation.movie.selectedDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{mockReservation.movie.venue}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delete Button */}
                <button className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg p-2 transition-colors">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              {/* Price Summary */}
              <div className="border-border/50 border-t pt-4">
                {mockReservation.tickets.map((ticket, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {ticket.type}{" "}
                      <span className="text-foreground">
                        x {ticket.quantity}
                      </span>
                    </span>
                    <span className="text-foreground">
                      {ticket.totalPrice.toFixed(2).replace(".", ",")} DT
                    </span>
                  </div>
                ))}

                <div className="border-border/50 mt-4 flex items-center justify-between border-t pt-4">
                  <span className="text-foreground font-semibold">
                    Prix total TTC :
                  </span>
                  <span className="text-foreground text-lg font-bold">
                    {mockReservation.totalPrice.toFixed(2).replace(".", ",")} DT
                  </span>
                </div>
              </div>

              {/* Modify Button */}
              <Button
                variant="secondary"
                className="bg-secondary/80 hover:bg-accent mt-4 w-full"
              >
                Modifier mes places
              </Button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
