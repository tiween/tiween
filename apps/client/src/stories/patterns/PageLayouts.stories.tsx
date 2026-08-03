"use client"

import * as React from "react"
import {
  Calendar,
  ChevronRight,
  Clock,
  Filter,
  Heart,
  MapPin,
  Search,
  Share2,
  Star,
  Ticket,
} from "lucide-react"

import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Page layout compositions demonstrating complete page structures
 * with navigation, content areas, sidebars, and footers.
 */
const meta: Meta = {
  title: "Patterns/Page Layouts",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Complete page layout patterns showing how to compose Header, Sidebar, Content, and Footer components into production-ready pages. Includes search results, event details, and profile pages.",
      },
    },
    viewport: {
      defaultViewport: "desktop",
    },
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj

// ============================================================================
// REUSABLE LAYOUT COMPONENTS
// ============================================================================

const Header = ({ children }: { children?: React.ReactNode }) => (
  <header className="border-border bg-background/95 sticky top-0 z-50 border-b backdrop-blur">
    <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between px-4 lg:px-8">
      <div className="flex items-center gap-8">
        <a href="#" className="text-primary text-xl font-bold">
          Tiween
        </a>
        <nav className="hidden items-center gap-6 lg:flex">
          <a href="#" className="text-foreground text-sm font-medium">
            Accueil
          </a>
          <a
            href="#"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            Événements
          </a>
          <a
            href="#"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            Courts métrages
          </a>
          <a
            href="#"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            Lieux
          </a>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        {children}
        <Button variant="outline" size="sm" className="hidden lg:flex">
          Se connecter
        </Button>
      </div>
    </div>
  </header>
)

const Footer = () => (
  <footer className="border-border bg-secondary/50 mt-auto hidden border-t lg:block">
    <div className="mx-auto max-w-screen-xl px-4 py-8 lg:px-8">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="mb-4 font-semibold">Tiween</h3>
          <p className="text-muted-foreground text-sm">
            La plateforme de billetterie culturelle en Tunisie.
          </p>
        </div>
        <div>
          <h3 className="mb-4 font-semibold">Entreprise</h3>
          <ul className="text-muted-foreground space-y-2 text-sm">
            <li>
              <a href="#" className="hover:text-foreground">
                À propos
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground">
                Carrières
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground">
                Contact
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 font-semibold">Légal</h3>
          <ul className="text-muted-foreground space-y-2 text-sm">
            <li>
              <a href="#" className="hover:text-foreground">
                Conditions d&apos;utilisation
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground">
                Confidentialité
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground">
                Cookies
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 font-semibold">Suivez-nous</h3>
          <div className="flex gap-4">
            <a href="#" className="text-muted-foreground hover:text-foreground">
              Facebook
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground">
              Instagram
            </a>
          </div>
        </div>
      </div>
      <Separator className="my-8" />
      <p className="text-muted-foreground text-center text-sm">
        © 2024 Tiween. Tous droits réservés.
      </p>
    </div>
  </footer>
)

// ============================================================================
// SEARCH RESULTS PAGE
// ============================================================================

export const SearchResultsPage: Story = {
  render: function SearchResultsPageExample() {
    const [selectedCategories, setSelectedCategories] = React.useState<
      string[]
    >(["musique"])

    const categories = [
      { id: "musique", label: "Musique", count: 24 },
      { id: "cinema", label: "Cinéma", count: 18 },
      { id: "theatre", label: "Théâtre", count: 12 },
      { id: "festival", label: "Festival", count: 8 },
      { id: "expo", label: "Exposition", count: 15 },
    ]

    const events = [
      {
        id: 1,
        title: "Concert Jazz Night",
        venue: "Jazz Club Tunis",
        date: "15 Fév 2025",
        price: "25 TND",
        image:
          "https://image.tmdb.org/t/p/w500/8ZOKVcSYQ8UrHlWG9n0eNqJ7pqF.jpg",
        category: "Musique",
      },
      {
        id: 2,
        title: "Festival du Film",
        venue: "Cité de la Culture",
        date: "20-25 Fév 2025",
        price: "15 TND",
        image:
          "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg",
        category: "Cinéma",
      },
      {
        id: 3,
        title: "Pièce: Les Misérables",
        venue: "Théâtre Municipal",
        date: "18 Fév 2025",
        price: "30 TND",
        image:
          "https://image.tmdb.org/t/p/w500/1WZqKk6kyUTOexlVChniPmKODmP.jpg",
        category: "Théâtre",
      },
      {
        id: 4,
        title: "Concert Emel Mathlouthi",
        venue: "Palais des Congrès",
        date: "22 Fév 2025",
        price: "45 TND",
        image:
          "https://image.tmdb.org/t/p/w500/sv1xJUazXeYqALzczSZ3O6nkH75.jpg",
        category: "Musique",
      },
      {
        id: 5,
        title: "Exposition d'Art Moderne",
        venue: "Musée du Bardo",
        date: "10-28 Fév 2025",
        price: "10 TND",
        image:
          "https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg",
        category: "Exposition",
      },
      {
        id: 6,
        title: "Soirée Stand-up Comedy",
        venue: "Le Carpe Diem",
        date: "16 Fév 2025",
        price: "20 TND",
        image:
          "https://image.tmdb.org/t/p/w500/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg",
        category: "Spectacle",
      },
    ]

    return (
      <div className="bg-background flex min-h-screen flex-col">
        <Header>
          <div className="relative hidden w-64 lg:block">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input placeholder="Rechercher..." className="pl-10" />
          </div>
        </Header>

        <main className="mx-auto w-full max-w-screen-xl flex-1 px-4 py-6 lg:px-8">
          {/* Mobile Search */}
          <div className="mb-6 lg:hidden">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Rechercher un événement..."
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-8">
            {/* Sidebar - Desktop only */}
            <aside className="hidden w-64 shrink-0 lg:block">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Filter className="h-4 w-4" />
                    Filtres
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Categories */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Catégories</h4>
                    <div className="space-y-2">
                      {categories.map((cat) => (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={cat.id}
                              checked={selectedCategories.includes(cat.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedCategories([
                                    ...selectedCategories,
                                    cat.id,
                                  ])
                                } else {
                                  setSelectedCategories(
                                    selectedCategories.filter(
                                      (c) => c !== cat.id
                                    )
                                  )
                                }
                              }}
                            />
                            <Label
                              htmlFor={cat.id}
                              className="text-sm font-normal"
                            >
                              {cat.label}
                            </Label>
                          </div>
                          <span className="text-muted-foreground text-xs">
                            {cat.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Price Range */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Prix</h4>
                    <div className="space-y-2">
                      {["Gratuit", "< 20 TND", "20-50 TND", "> 50 TND"].map(
                        (price) => (
                          <div key={price} className="flex items-center gap-2">
                            <Checkbox id={`price-${price}`} />
                            <Label
                              htmlFor={`price-${price}`}
                              className="text-sm font-normal"
                            >
                              {price}
                            </Label>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Date */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Date</h4>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les dates</SelectItem>
                        <SelectItem value="today">Aujourd&apos;hui</SelectItem>
                        <SelectItem value="week">Cette semaine</SelectItem>
                        <SelectItem value="month">Ce mois</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button className="w-full">Appliquer les filtres</Button>
                </CardContent>
              </Card>
            </aside>

            {/* Results */}
            <div className="flex-1">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Résultats de recherche</h1>
                  <p className="text-muted-foreground mt-1 text-sm">
                    77 événements trouvés
                  </p>
                </div>
                <Select defaultValue="date">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Par date</SelectItem>
                    <SelectItem value="price-asc">Prix croissant</SelectItem>
                    <SelectItem value="price-desc">Prix décroissant</SelectItem>
                    <SelectItem value="popular">Popularité</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Active filters */}
              {selectedCategories.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {selectedCategories.map((catId) => {
                    const cat = categories.find((c) => c.id === catId)
                    return (
                      <Badge
                        key={catId}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() =>
                          setSelectedCategories(
                            selectedCategories.filter((c) => c !== catId)
                          )
                        }
                      >
                        {cat?.label} ×
                      </Badge>
                    )
                  })}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setSelectedCategories([])}
                  >
                    Tout effacer
                  </Button>
                </div>
              )}

              {/* Event Grid */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {events.map((event) => (
                  <Card
                    key={event.id}
                    className="group cursor-pointer overflow-hidden"
                  >
                    <div className="bg-muted relative aspect-[3/4]">
                      <img
                        src={event.image}
                        alt={event.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute right-0 bottom-0 left-0 p-4">
                        <Badge className="mb-2">{event.category}</Badge>
                        <h3 className="text-lg font-semibold text-white">
                          {event.title}
                        </h3>
                        <div className="text-muted mt-1 flex items-center gap-1 text-sm text-white/80">
                          <MapPin className="h-3 w-3" />
                          {event.venue}
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-1 text-sm text-white/80">
                            <Calendar className="h-3 w-3" />
                            {event.date}
                          </div>
                          <span className="text-primary font-semibold">
                            {event.price}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Load More */}
              <div className="mt-8 text-center">
                <Button variant="outline">Voir plus d&apos;événements</Button>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Complete search results page with header, filter sidebar (desktop), event grid, sorting, active filter chips, and footer.",
      },
    },
  },
}

// ============================================================================
// EVENT DETAIL PAGE
// ============================================================================

export const EventDetailPage: Story = {
  render: function EventDetailPageExample() {
    const [selectedTicket, setSelectedTicket] = React.useState<string | null>(
      "cat-a"
    )

    const tickets = [
      { id: "cat-a", name: "Catégorie A", price: 45, available: 23 },
      { id: "cat-b", name: "Catégorie B", price: 35, available: 58 },
      { id: "cat-c", name: "Catégorie C", price: 25, available: 120 },
    ]

    return (
      <div className="bg-background flex min-h-screen flex-col">
        <Header />

        <main className="flex-1">
          {/* Hero Image */}
          <div className="relative h-64 lg:h-96">
            <img
              src="https://image.tmdb.org/t/p/original/8ZOKVcSYQ8UrHlWG9n0eNqJ7pqF.jpg"
              alt="Concert Jazz Night"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute right-0 bottom-0 left-0">
              <div className="mx-auto max-w-screen-xl px-4 pb-6 lg:px-8">
                <Badge className="mb-3">Musique</Badge>
                <h1 className="text-3xl font-bold text-white lg:text-4xl">
                  Concert Jazz Night
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-white/80">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Jazz Club Tunis
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    15 Février 2025, 20h00
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="text-primary h-4 w-4 fill-current" />
                    4.8 (124 avis)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="mx-auto max-w-screen-xl px-4 py-8 lg:px-8">
            <div className="flex flex-col gap-8 lg:flex-row">
              {/* Main Content */}
              <div className="flex-1 space-y-8">
                {/* Description */}
                <section>
                  <h2 className="mb-4 text-xl font-semibold">À propos</h2>
                  <p className="text-muted-foreground">
                    Une soirée exceptionnelle de jazz avec les meilleurs
                    musiciens de la scène tunisienne. Préparez-vous pour une
                    expérience musicale inoubliable dans l&apos;ambiance
                    chaleureuse du Jazz Club Tunis. Le concert réunira des
                    artistes de renommée internationale pour une nuit de musique
                    improvisée et de performances uniques.
                  </p>
                </section>

                {/* Line-up */}
                <section>
                  <h2 className="mb-4 text-xl font-semibold">Line-up</h2>
                  <div className="space-y-3">
                    {[
                      { name: "Mohamed Jaziri", role: "Piano" },
                      { name: "Sami Trabelsi", role: "Contrebasse" },
                      { name: "Karim Ben Amor", role: "Batterie" },
                    ].map((artist) => (
                      <div
                        key={artist.name}
                        className="bg-secondary/50 flex items-center gap-3 rounded-lg p-3"
                      >
                        <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                          <span className="text-sm font-medium">
                            {artist.name[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{artist.name}</p>
                          <p className="text-muted-foreground text-sm">
                            {artist.role}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Venue Info */}
                <section>
                  <h2 className="mb-4 text-xl font-semibold">Lieu</h2>
                  <Card>
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className="bg-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
                        <MapPin className="text-muted-foreground h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-medium">Jazz Club Tunis</h3>
                        <p className="text-muted-foreground text-sm">
                          12 Rue de la Kasbah, Tunis 1000
                        </p>
                        <Button variant="link" className="h-auto p-0 text-sm">
                          Voir sur la carte →
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </section>
              </div>

              {/* Booking Sidebar */}
              <aside className="w-full lg:w-80">
                <Card className="lg:sticky lg:top-24">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Réserver</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Heart className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Date Selection */}
                    <div className="space-y-2">
                      <Label className="text-sm">Séance</Label>
                      <Select defaultValue="20h00">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="20h00">15 Fév - 20h00</SelectItem>
                          <SelectItem value="22h00">15 Fév - 22h00</SelectItem>
                          <SelectItem value="16-20h00">
                            16 Fév - 20h00
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Ticket Selection */}
                    <div className="space-y-2">
                      <Label className="text-sm">Catégorie</Label>
                      <div className="space-y-2">
                        {tickets.map((ticket) => (
                          <button
                            key={ticket.id}
                            type="button"
                            onClick={() => setSelectedTicket(ticket.id)}
                            className={`w-full rounded-lg border p-3 text-left transition-colors ${
                              selectedTicket === ticket.id
                                ? "border-primary bg-primary/10"
                                : "border-border hover:bg-muted"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{ticket.name}</span>
                              <span className="text-primary font-semibold">
                                {ticket.price} TND
                              </span>
                            </div>
                            <p className="text-muted-foreground mt-1 text-xs">
                              {ticket.available} places disponibles
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="space-y-2">
                      <Label className="text-sm">Quantité</Label>
                      <Select defaultValue="2">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6].map((n) => (
                            <SelectItem key={n} value={n.toString()}>
                              {n} {n === 1 ? "billet" : "billets"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    {/* Total */}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total</span>
                      <span className="text-2xl font-bold">90 TND</span>
                    </div>

                    <Button className="w-full" size="lg">
                      <Ticket className="mr-2 h-4 w-4" />
                      Réserver maintenant
                    </Button>

                    <p className="text-muted-foreground text-center text-xs">
                      Paiement sécurisé • Remboursement sous conditions
                    </p>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Complete event detail page with hero image, event info, artist lineup, venue details, and sticky booking sidebar with ticket selection.",
      },
    },
  },
}

// ============================================================================
// PROFILE PAGE
// ============================================================================

export const ProfilePage: Story = {
  render: function ProfilePageExample() {
    const [activeTab, setActiveTab] = React.useState("tickets")

    const tabs = [
      { id: "tickets", label: "Mes billets", count: 3 },
      { id: "favorites", label: "Favoris", count: 12 },
      { id: "history", label: "Historique", count: 24 },
    ]

    const upcomingTickets = [
      {
        id: 1,
        event: "Concert Jazz Night",
        venue: "Jazz Club Tunis",
        date: "15 Fév 2025",
        time: "20h00",
        quantity: 2,
        status: "confirmed",
      },
      {
        id: 2,
        event: "Festival du Film",
        venue: "Cité de la Culture",
        date: "20 Fév 2025",
        time: "19h00",
        quantity: 1,
        status: "confirmed",
      },
      {
        id: 3,
        event: "Pièce: Les Misérables",
        venue: "Théâtre Municipal",
        date: "25 Fév 2025",
        time: "20h30",
        quantity: 4,
        status: "pending",
      },
    ]

    return (
      <div className="bg-background flex min-h-screen flex-col">
        <Header />

        <main className="mx-auto w-full max-w-screen-xl flex-1 px-4 py-8 lg:px-8">
          {/* Profile Header */}
          <div className="mb-8 flex items-start gap-6">
            <div className="bg-muted flex h-20 w-20 items-center justify-center rounded-full">
              <span className="text-2xl font-bold">AB</span>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Ahmed Ben Ali</h1>
              <p className="text-muted-foreground">ahmed@exemple.com</p>
              <div className="mt-2 flex gap-4">
                <div>
                  <span className="font-semibold">3</span>{" "}
                  <span className="text-muted-foreground text-sm">
                    billets actifs
                  </span>
                </div>
                <div>
                  <span className="font-semibold">24</span>{" "}
                  <span className="text-muted-foreground text-sm">
                    événements passés
                  </span>
                </div>
              </div>
            </div>
            <Button variant="outline">Modifier le profil</Button>
          </div>

          {/* Tabs */}
          <div className="border-border mb-6 border-b">
            <div className="flex gap-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative pb-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {tab.count}
                    </Badge>
                  )}
                  {activeTab === tab.id && (
                    <span className="bg-primary absolute right-0 bottom-0 left-0 h-0.5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tickets Content */}
          {activeTab === "tickets" && (
            <div className="space-y-4">
              {upcomingTickets.map((ticket) => (
                <Card key={ticket.id}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="bg-muted hidden h-24 w-24 shrink-0 items-center justify-center rounded-lg sm:flex">
                      <Ticket className="text-muted-foreground h-8 w-8" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{ticket.event}</h3>
                          <p className="text-muted-foreground text-sm">
                            {ticket.venue}
                          </p>
                        </div>
                        <Badge
                          variant={
                            ticket.status === "confirmed"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {ticket.status === "confirmed"
                            ? "Confirmé"
                            : "En attente"}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                        <div className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {ticket.date}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {ticket.time}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1">
                          <Ticket className="h-4 w-4" />
                          {ticket.quantity}{" "}
                          {ticket.quantity === 1 ? "billet" : "billets"}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="hidden sm:flex"
                    >
                      Voir le billet
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {activeTab === "favorites" && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-[3/2] w-full" />
                  <CardContent className="p-4">
                    <Skeleton className="mb-2 h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {activeTab === "history" && (
            <div className="text-muted-foreground py-12 text-center">
              <Clock className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>Votre historique d&apos;événements apparaîtra ici</p>
            </div>
          )}
        </main>

        <Footer />
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "User profile page with avatar, stats, tabbed navigation (tickets, favorites, history), and ticket cards with status badges.",
      },
    },
  },
}

// ============================================================================
// EMPTY STATE PAGE
// ============================================================================

export const EmptyStatePage: Story = {
  render: function EmptyStatePageExample() {
    return (
      <div className="bg-background flex min-h-screen flex-col">
        <Header />

        <main className="mx-auto flex w-full max-w-screen-xl flex-1 flex-col items-center justify-center px-4 py-16 lg:px-8">
          <div className="text-center">
            <div className="bg-muted mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full">
              <Search className="text-muted-foreground h-12 w-12" />
            </div>
            <h1 className="text-2xl font-bold">Aucun résultat trouvé</h1>
            <p className="text-muted-foreground mx-auto mt-2 max-w-md">
              Nous n&apos;avons pas trouvé d&apos;événements correspondant à
              votre recherche. Essayez de modifier vos filtres ou d&apos;élargir
              vos critères.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button>Voir tous les événements</Button>
              <Button variant="outline">Modifier les filtres</Button>
            </div>
          </div>

          {/* Suggestions */}
          <div className="mt-16 w-full max-w-2xl">
            <h2 className="mb-4 text-center text-lg font-semibold">
              Suggestions populaires
            </h2>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                "Concert",
                "Théâtre",
                "Festival",
                "Cinéma",
                "Exposition",
                "Stand-up",
              ].map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="hover:bg-primary hover:text-primary-foreground cursor-pointer"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Empty state page for search results with helpful messaging, CTAs, and category suggestions.",
      },
    },
  },
}

// ============================================================================
// LOADING STATE PAGE
// ============================================================================

export const LoadingStatePage: Story = {
  render: function LoadingStatePageExample() {
    return (
      <div className="bg-background flex min-h-screen flex-col">
        <Header />

        <main className="mx-auto w-full max-w-screen-xl flex-1 px-4 py-6 lg:px-8">
          <div className="flex gap-8">
            {/* Sidebar skeleton */}
            <aside className="hidden w-64 shrink-0 lg:block">
              <Card>
                <CardHeader className="pb-3">
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                  <Separator />
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </aside>

            {/* Content skeleton */}
            <div className="flex-1">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="mt-2 h-4 w-32" />
                </div>
                <Skeleton className="h-10 w-40" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="aspect-[3/4] w-full" />
                    <CardContent className="p-4">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="mt-2 h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Loading state page showing skeleton placeholders for sidebar filters and event grid.",
      },
    },
  },
}
