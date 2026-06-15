"use client"

import * as React from "react"
import Link from "next/link"
import { Check, Search, Ticket, User } from "lucide-react"
import { useLocale } from "next-intl"

import { Button } from "@/components/ui/button"

/**
 * Ticketing Success - Payment Confirmation Page
 *
 * Based on the TIWEEN_Ticketing_06_Success_Desktop mockup:
 * - Header with tiween.com logo and navigation
 * - Centered success message "Paiement validé !"
 * - Green checkmark icon
 * - "Merci de votre confiance !" subtitle
 * - Instructions about downloading tickets
 * - Link to "Mes événements"
 * - "Retour à la page d'accueil" button
 */

export default function TicketingSuccessPrototype() {
  const locale = useLocale()

  return (
    <div className="bg-background flex min-h-screen flex-col">
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

      {/* Main Content - Centered */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="max-w-lg text-center">
          {/* Success Title */}
          <h1 className="font-display text-foreground mb-6 text-4xl lg:text-5xl">
            Paiement validé !
          </h1>

          {/* Success Icon */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 ring-4 ring-emerald-500/30">
              <Check className="h-8 w-8 text-emerald-400" />
            </div>
          </div>

          {/* Thank You Message */}
          <h2 className="text-foreground mb-6 text-xl font-semibold">
            Merci de votre confiance !
          </h2>

          {/* Instructions */}
          <p className="text-muted-foreground mb-2">
            Votre paiement a bien été validé.
          </p>
          <p className="text-muted-foreground mb-1">
            Vous pouvez télécharger vos billets ou les retrouver à tout moment
            dans la rubrique
          </p>
          <p className="mb-6">
            "
            <Link
              href={`/${locale}/desktop-prototypes/my-events`}
              className="text-primary hover:underline"
            >
              Mes événements
            </Link>
            ".
          </p>

          {/* App Download Note */}
          <p className="text-muted-foreground mb-8 text-sm">
            Retrouver notre application en cliquant sur le lien ci-dessous :
          </p>

          {/* CTA Button */}
          <Button size="lg" className="min-w-[280px] text-base">
            Retour à la page d'accueil
          </Button>
        </div>
      </main>
    </div>
  )
}
