"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Minus,
  Plus,
  Search,
  Ticket,
  User,
} from "lucide-react"
import { useLocale } from "next-intl"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * Ticketing Step 2 - Ticket Quantity Selection
 *
 * Based on the TIWEEN_Ticketing_03_Desktop and _04_Desktop mockups:
 * - Header with tiween.com logo and navigation
 * - "Billetterie" title with "Choisir des billets" subtitle
 * - Ticket type selector with +/- counters (Plein tarif, Tarif réduit)
 * - Terms notice about non-refundable tickets
 * - Sidebar with movie info, selected session, price summary
 * - Payment methods display (Visa, PayPal, Mastercard)
 * - "Valider ma réservation" CTA button
 */

// Mock data
const mockMovie = {
  title: "Bullet Train",
  director: "David Leitch",
  selectedDate: "Jeu. 15 sep. 2022 à 15h00",
  venue: "Ciné Alhambra Zéphyr",
}

const ticketTypes = [
  {
    id: "full",
    name: "Plein tarif",
    price: 11.9,
  },
  {
    id: "reduced",
    name: "Tarif réduit",
    price: 8.9,
  },
]

export default function TicketingQuantityPrototype() {
  const router = useRouter()
  const locale = useLocale()
  const [quantities, setQuantities] = React.useState<Record<string, number>>({
    full: 0,
    reduced: 0,
  })

  const handleQuantityChange = (typeId: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [typeId]: Math.max(0, Math.min(10, (prev[typeId] || 0) + delta)),
    }))
  }

  // Calculate totals
  const totalTickets = Object.values(quantities).reduce((a, b) => a + b, 0)
  const totalPrice = ticketTypes.reduce((total, type) => {
    return total + type.price * (quantities[type.id] || 0)
  }, 0)

  const hasTickets = totalTickets > 0

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
          {/* Left Column - Ticket Selection */}
          <div>
            {/* Page Title */}
            <h1 className="font-display text-foreground mb-2 text-4xl lg:text-5xl">
              Billetterie
            </h1>
            <h2 className="text-foreground mb-8 text-xl font-semibold">
              Choisir des billets
            </h2>

            <p className="text-muted-foreground mb-8">
              Achetez vos e-tickets pour cet événement en sélectionnant le
              nombre de places par tarif que vous souhaitez :
            </p>

            {/* Ticket Type Cards */}
            <div className="space-y-4">
              {ticketTypes.map((type) => (
                <div
                  key={type.id}
                  className={cn(
                    "flex items-center justify-between rounded-2xl p-6 transition-all",
                    quantities[type.id] > 0
                      ? "bg-secondary ring-primary/30 ring-2"
                      : "bg-secondary/60"
                  )}
                >
                  <div>
                    <h3 className="text-foreground text-lg font-semibold">
                      {type.name}
                    </h3>
                    <p className="text-muted-foreground">
                      {type.price.toFixed(2).replace(".", ",")} DT
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleQuantityChange(type.id, -1)}
                      disabled={quantities[type.id] === 0}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full transition-all",
                        quantities[type.id] === 0
                          ? "bg-background/30 text-muted-foreground/50 cursor-not-allowed"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                    >
                      <Minus className="h-5 w-5" />
                    </button>

                    <span className="text-foreground w-8 text-center text-2xl font-bold">
                      {quantities[type.id]}
                    </span>

                    <button
                      onClick={() => handleQuantityChange(type.id, 1)}
                      disabled={quantities[type.id] >= 10}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full transition-all",
                        quantities[type.id] >= 10
                          ? "bg-background/30 text-muted-foreground/50 cursor-not-allowed"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Terms Notice */}
            <p className="text-muted-foreground mt-8 text-sm">
              Les billets ne sont ni échangeables ni remboursables conformément
              à nos{" "}
              <Link href="#" className="text-primary hover:underline">
                conditions générales de vente
              </Link>
              . En validant la réservation, vous acceptez les{" "}
              <Link href="#" className="text-primary hover:underline">
                conditions générales de vente
              </Link>
              .
            </p>

            {/* Bottom Navigation */}
            <div className="mt-12 flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </button>

              <Button
                size="lg"
                disabled={!hasTickets}
                className={cn(
                  "min-w-[280px] text-base transition-all",
                  !hasTickets && "cursor-not-allowed opacity-50"
                )}
              >
                Valider ma réservation
              </Button>
            </div>
          </div>

          {/* Right Column - Order Summary Sidebar */}
          <aside className="mt-12 lg:mt-0">
            {/* Movie Info Card */}
            <div className="bg-secondary rounded-2xl p-5">
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
                    {mockMovie.title}
                  </h3>
                  <p className="text-primary text-sm">
                    de {mockMovie.director}
                  </p>

                  <div className="text-muted-foreground mt-3 space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{mockMovie.selectedDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{mockMovie.venue}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price Summary - Only shown when tickets selected */}
              {hasTickets && (
                <div className="border-border/50 mt-5 border-t pt-5">
                  {ticketTypes.map(
                    (type) =>
                      quantities[type.id] > 0 && (
                        <div
                          key={type.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-muted-foreground">
                            {type.name}{" "}
                            <span className="text-foreground">
                              x {quantities[type.id]}
                            </span>
                          </span>
                          <span className="text-foreground">
                            {(type.price * quantities[type.id])
                              .toFixed(2)
                              .replace(".", ",")}{" "}
                            DT
                          </span>
                        </div>
                      )
                  )}

                  <div className="border-border/50 mt-3 flex items-center justify-between border-t pt-3">
                    <span className="text-foreground font-semibold">
                      Prix total TTC :
                    </span>
                    <span className="text-foreground text-lg font-bold">
                      {totalPrice.toFixed(2).replace(".", ",")} DT
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Methods Card */}
            <div className="bg-secondary/60 mt-4 rounded-2xl p-5">
              <h3 className="text-foreground mb-3 text-center font-semibold">
                Modes de paiement
              </h3>
              <p className="text-muted-foreground mb-4 text-center text-sm">
                Nous acceptons les moyens de paiement suivants et en
                garantissons la sécurité
              </p>

              {/* Payment Icons */}
              <div className="flex items-center justify-center gap-6">
                {/* Visa */}
                <div className="text-muted-foreground flex h-8 items-center">
                  <span className="text-lg font-bold tracking-tight">VISA</span>
                </div>

                {/* PayPal */}
                <div className="text-muted-foreground flex h-8 items-center">
                  <span className="text-sm font-semibold">PayPal</span>
                </div>

                {/* Mastercard */}
                <div className="flex h-8 items-center">
                  <div className="flex">
                    <div className="h-5 w-5 rounded-full bg-red-500/70"></div>
                    <div className="-ml-2 h-5 w-5 rounded-full bg-yellow-500/70"></div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
