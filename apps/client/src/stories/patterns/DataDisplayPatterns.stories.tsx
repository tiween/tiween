"use client"

import * as React from "react"
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Star,
  Ticket,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react"

import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Data display patterns for presenting information in cards, lists, and statistics.
 */
const meta: Meta = {
  title: "Patterns/Data Display",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Common data display patterns including stat cards, event lists, order summaries, and status indicators. These patterns combine Card, Badge, Progress, and other components for effective information presentation.",
      },
    },
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj

// ============================================================================
// STATS DASHBOARD
// ============================================================================

export const StatsDashboard: Story = {
  render: function StatsDashboardExample() {
    const stats = [
      {
        title: "Ventes totales",
        value: "12,450 TND",
        change: "+12.5%",
        trend: "up",
        icon: TrendingUp,
      },
      {
        title: "Billets vendus",
        value: "847",
        change: "+8.2%",
        trend: "up",
        icon: Ticket,
      },
      {
        title: "Événements actifs",
        value: "24",
        change: "-2",
        trend: "down",
        icon: Calendar,
      },
      {
        title: "Visiteurs uniques",
        value: "3,291",
        change: "+24.3%",
        trend: "up",
        icon: Users,
      },
    ]

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center text-xs">
                {stat.trend === "up" ? (
                  <ArrowUpRight className="mr-1 h-3 w-3 text-green-500" />
                ) : (
                  <ArrowDownRight className="mr-1 h-3 w-3 text-red-500" />
                )}
                <span
                  className={
                    stat.trend === "up" ? "text-green-500" : "text-red-500"
                  }
                >
                  {stat.change}
                </span>
                <span className="text-muted-foreground ml-1">
                  vs mois dernier
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Dashboard stat cards with title, value, trend indicator, and icon.",
      },
    },
  },
}

// ============================================================================
// EVENT LIST
// ============================================================================

export const EventList: Story = {
  render: function EventListExample() {
    const events = [
      {
        id: 1,
        title: "Concert Jazz Night",
        venue: "Jazz Club Tunis",
        date: "15 Fév 2025",
        time: "20h00",
        soldTickets: 145,
        totalTickets: 200,
        status: "on-sale",
      },
      {
        id: 2,
        title: "Festival du Film",
        venue: "Cité de la Culture",
        date: "20-25 Fév 2025",
        time: "19h00",
        soldTickets: 892,
        totalTickets: 1000,
        status: "selling-fast",
      },
      {
        id: 3,
        title: "Pièce: Les Misérables",
        venue: "Théâtre Municipal",
        date: "18 Fév 2025",
        time: "20h30",
        soldTickets: 120,
        totalTickets: 120,
        status: "sold-out",
      },
      {
        id: 4,
        title: "Exposition d'Art",
        venue: "Musée du Bardo",
        date: "10-28 Fév 2025",
        time: "10h00",
        soldTickets: 234,
        totalTickets: 500,
        status: "on-sale",
      },
    ]

    const getStatusBadge = (status: string) => {
      switch (status) {
        case "sold-out":
          return <Badge variant="destructive">Complet</Badge>
        case "selling-fast":
          return <Badge className="bg-orange-500">Vite !</Badge>
        default:
          return <Badge variant="secondary">En vente</Badge>
      }
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Événements à venir</CardTitle>
          <CardDescription>
            Aperçu des prochains événements et leurs ventes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {events.map((event, index) => (
            <React.Fragment key={event.id}>
              <div className="flex items-center gap-4">
                <div className="bg-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
                  <Calendar className="text-muted-foreground h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate font-medium">{event.title}</h4>
                    {getStatusBadge(event.status)}
                  </div>
                  <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-3 text-sm">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.venue}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {event.date}, {event.time}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {event.soldTickets} / {event.totalTickets} vendus
                      </span>
                      <span className="font-medium">
                        {Math.round(
                          (event.soldTickets / event.totalTickets) * 100
                        )}
                        %
                      </span>
                    </div>
                    <Progress
                      value={(event.soldTickets / event.totalTickets) * 100}
                      className="h-1.5"
                    />
                  </div>
                </div>
              </div>
              {index < events.length - 1 && <Separator />}
            </React.Fragment>
          ))}
        </CardContent>
      </Card>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Event list with venue, date, ticket sales progress, and status badges.",
      },
    },
  },
}

// ============================================================================
// ORDER SUMMARY
// ============================================================================

export const OrderSummary: Story = {
  render: function OrderSummaryExample() {
    const order = {
      id: "TIW-2025-001234",
      event: "Concert Jazz Night",
      venue: "Jazz Club Tunis",
      date: "15 Février 2025",
      time: "20h00",
      items: [
        { name: "Catégorie A", quantity: 2, price: 45, total: 90 },
        { name: "Catégorie B", quantity: 1, price: 35, total: 35 },
      ],
      subtotal: 125,
      fees: 5,
      total: 130,
      status: "confirmed",
      customer: {
        name: "Ahmed Ben Ali",
        email: "ahmed@exemple.com",
        phone: "+216 98 123 456",
      },
    }

    return (
      <Card className="mx-auto max-w-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Confirmation de commande</CardTitle>
            <Badge className="bg-green-500">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Confirmé
            </Badge>
          </div>
          <CardDescription>Commande #{order.id}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Event Info */}
          <div className="bg-muted rounded-lg p-3">
            <h4 className="font-semibold">{order.event}</h4>
            <div className="text-muted-foreground mt-1 space-y-1 text-sm">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {order.venue}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {order.date}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {order.time}
              </div>
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <span>
                  {item.quantity}x {item.name}
                </span>
                <span>{item.total} TND</span>
              </div>
            ))}
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sous-total</span>
              <span>{order.subtotal} TND</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frais de service</span>
              <span>{order.fees} TND</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span className="text-primary">{order.total} TND</span>
            </div>
          </div>

          <Separator />

          {/* Customer Info */}
          <div>
            <h4 className="mb-2 text-sm font-medium">Informations client</h4>
            <div className="text-muted-foreground space-y-1 text-sm">
              <p>{order.customer.name}</p>
              <p>{order.customer.email}</p>
              <p>{order.customer.phone}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Order summary card with event details, line items, pricing breakdown, and customer info.",
      },
    },
  },
}

// ============================================================================
// STATUS TIMELINE
// ============================================================================

export const StatusTimeline: Story = {
  render: function StatusTimelineExample() {
    const steps = [
      { label: "Commande passée", time: "14:32", status: "completed" },
      { label: "Paiement confirmé", time: "14:33", status: "completed" },
      { label: "Billets générés", time: "14:35", status: "completed" },
      { label: "Email envoyé", time: "14:36", status: "current" },
      { label: "Billet scanné", time: "", status: "pending" },
    ]

    return (
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">Suivi de commande</CardTitle>
          <CardDescription>TIW-2025-001234</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.label} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full ${
                      step.status === "completed"
                        ? "bg-green-500 text-white"
                        : step.status === "current"
                          ? "border-primary border-2 bg-transparent"
                          : "bg-muted"
                    }`}
                  >
                    {step.status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : step.status === "current" ? (
                      <div className="bg-primary h-2 w-2 rounded-full" />
                    ) : null}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-0.5 flex-1 ${
                        step.status === "completed"
                          ? "bg-green-500"
                          : "bg-muted"
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <p
                    className={`font-medium ${
                      step.status === "pending" ? "text-muted-foreground" : ""
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.time && (
                    <p className="text-muted-foreground text-sm">{step.time}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Order status timeline with completed, current, and pending states.",
      },
    },
  },
}

// ============================================================================
// TICKET CARD
// ============================================================================

export const TicketCard: Story = {
  render: function TicketCardExample() {
    return (
      <Card className="mx-auto max-w-sm overflow-hidden">
        {/* Header with dashed border effect */}
        <div className="bg-primary px-4 py-6 text-center">
          <p className="text-primary-foreground/80 text-sm">
            15 Février 2025 • 20h00
          </p>
          <h3 className="text-primary-foreground mt-1 text-xl font-bold">
            Concert Jazz Night
          </h3>
          <p className="text-primary-foreground/80 mt-1 text-sm">
            Jazz Club Tunis
          </p>
        </div>

        {/* Notch decoration */}
        <div className="relative">
          <div className="bg-background absolute -top-3 -left-3 h-6 w-6 rounded-full" />
          <div className="bg-background absolute -top-3 -right-3 h-6 w-6 rounded-full" />
          <div className="border-border border-b border-dashed" />
        </div>

        {/* Ticket details */}
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-muted-foreground text-xs uppercase">
                Catégorie
              </p>
              <p className="font-semibold">A</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Place</p>
              <p className="font-semibold">R12-S05</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">
                Quantité
              </p>
              <p className="font-semibold">2 billets</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Prix</p>
              <p className="font-semibold">90 TND</p>
            </div>
          </div>

          <Separator className="my-4" />

          {/* QR Code placeholder */}
          <div className="flex flex-col items-center">
            <div className="bg-muted flex h-32 w-32 items-center justify-center rounded-lg">
              <span className="text-muted-foreground text-xs">QR Code</span>
            </div>
            <p className="text-muted-foreground mt-2 font-mono text-xs">
              TIW-2025-001234
            </p>
          </div>
        </CardContent>
      </Card>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Ticket card with event details, seat info, and QR code placeholder.",
      },
    },
  },
}

// ============================================================================
// RATING DISPLAY
// ============================================================================

export const RatingDisplay: Story = {
  render: function RatingDisplayExample() {
    const rating = {
      average: 4.8,
      total: 124,
      breakdown: [
        { stars: 5, count: 89, percentage: 72 },
        { stars: 4, count: 24, percentage: 19 },
        { stars: 3, count: 8, percentage: 6 },
        { stars: 2, count: 2, percentage: 2 },
        { stars: 1, count: 1, percentage: 1 },
      ],
    }

    return (
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">Avis clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold">{rating.average}</div>
              <div className="mt-1 flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= Math.round(rating.average)
                        ? "fill-primary text-primary"
                        : "text-muted"
                    }`}
                  />
                ))}
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                {rating.total} avis
              </p>
            </div>

            <Separator orientation="vertical" className="h-24" />

            <div className="flex-1 space-y-2">
              {rating.breakdown.map((row) => (
                <div
                  key={row.stars}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="w-3">{row.stars}</span>
                  <Star className="text-primary h-3 w-3 fill-current" />
                  <Progress value={row.percentage} className="h-1.5 flex-1" />
                  <span className="text-muted-foreground w-8 text-right">
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Rating display with average score, star visualization, and breakdown by rating.",
      },
    },
  },
}

// ============================================================================
// NOTIFICATION LIST
// ============================================================================

export const NotificationList: Story = {
  render: function NotificationListExample() {
    const notifications = [
      {
        id: 1,
        type: "success",
        title: "Paiement confirmé",
        message: "Votre commande TIW-001234 a été confirmée",
        time: "Il y a 5 min",
        read: false,
      },
      {
        id: 2,
        type: "info",
        title: "Rappel d'événement",
        message: "Concert Jazz Night commence demain à 20h00",
        time: "Il y a 2 heures",
        read: false,
      },
      {
        id: 3,
        type: "warning",
        title: "Places limitées",
        message: "Il ne reste que 5 places pour Festival du Film",
        time: "Il y a 1 jour",
        read: true,
      },
      {
        id: 4,
        type: "error",
        title: "Paiement échoué",
        message: "La transaction n'a pas pu être complétée",
        time: "Il y a 3 jours",
        read: true,
      },
    ]

    const getIcon = (type: string) => {
      switch (type) {
        case "success":
          return <CheckCircle2 className="h-5 w-5 text-green-500" />
        case "warning":
          return <AlertCircle className="h-5 w-5 text-orange-500" />
        case "error":
          return <XCircle className="h-5 w-5 text-red-500" />
        default:
          return <AlertCircle className="h-5 w-5 text-blue-500" />
      }
    }

    return (
      <Card className="mx-auto max-w-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Notifications</CardTitle>
            <Badge variant="secondary">2 nouvelles</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-1 p-0">
          {notifications.map((notif, index) => (
            <React.Fragment key={notif.id}>
              <div
                className={`flex gap-3 px-4 py-3 ${
                  !notif.read ? "bg-primary/5" : ""
                }`}
              >
                <div className="shrink-0">{getIcon(notif.type)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{notif.title}</p>
                    {!notif.read && (
                      <span className="bg-primary h-2 w-2 shrink-0 rounded-full" />
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    {notif.message}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {notif.time}
                  </p>
                </div>
              </div>
              {index < notifications.length - 1 && <Separator />}
            </React.Fragment>
          ))}
        </CardContent>
      </Card>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Notification list with different types (success, info, warning, error) and read/unread states.",
      },
    },
  },
}

// ============================================================================
// LOADING STATES
// ============================================================================

export const LoadingStates: Story = {
  render: function LoadingStatesExample() {
    return (
      <div className="space-y-8">
        {/* Stat Card Loading */}
        <div>
          <h3 className="text-muted-foreground mb-4 text-sm font-medium">
            Stat Card Loading
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="mb-1 h-8 w-32" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Event List Loading */}
        <div>
          <h3 className="text-muted-foreground mb-4 text-sm font-medium">
            Event List Loading
          </h3>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-1.5 w-full" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Notification Loading */}
        <div>
          <h3 className="text-muted-foreground mb-4 text-sm font-medium">
            Notification Loading
          </h3>
          <Card className="max-w-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-5 w-20" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: "Loading skeleton patterns for various data display components.",
      },
    },
  },
}
