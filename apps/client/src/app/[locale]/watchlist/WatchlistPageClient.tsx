"use client"

import * as React from "react"
import {
  EventCard,
  EventCardSkeleton,
} from "@/features/events/components/EventCard"
import {
  useWatchlist,
  useWatchlistMutations,
} from "@/features/events/hooks/useWatchlist"
import { AlertCircle, Film, Heart, Loader2, RefreshCw } from "lucide-react"

import type { WatchlistItem } from "@/features/events/hooks/useWatchlist"

import { Link, useRouter } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * Labels for watchlist page
 */
export interface WatchlistPageLabels {
  title: string
  subtitle: string
  emptyTitle: string
  emptyDescription: string
  emptyAction: string
  removeFromWatchlist: string
  addToWatchlist: string
  priceFrom: (price: string) => string
  browseEvents: string
  loading: string
  error: string
  retry: string
}

const defaultLabels: WatchlistPageLabels = {
  title: "Ma liste de suivi",
  subtitle: "Les événements que vous avez mis de côté",
  emptyTitle: "Votre liste est vide",
  emptyDescription:
    "Ajoutez des événements à votre liste de suivi pour les retrouver facilement.",
  emptyAction: "Découvrir les événements",
  removeFromWatchlist: "Retirer de la liste",
  addToWatchlist: "Ajouter à la liste",
  priceFrom: (price: string) => `À partir de ${price}`,
  browseEvents: "Parcourir les événements",
  loading: "Chargement...",
  error: "Une erreur est survenue",
  retry: "Réessayer",
}

export interface WatchlistPageClientProps {
  labels?: WatchlistPageLabels
  locale: string
}

/**
 * Client component for the watchlist page
 *
 * Features:
 * - Displays user's saved events in a grid
 * - Remove from watchlist functionality
 * - Empty state with CTA
 * - Loading and error states
 */
export function WatchlistPageClient({
  labels = defaultLabels,
  locale,
}: WatchlistPageClientProps) {
  const router = useRouter()
  const { data: watchlist, isLoading, isError, refetch } = useWatchlist()
  const { removeMutation } = useWatchlistMutations()

  // Handle remove from watchlist
  const handleRemove = (creativeWorkId: string) => {
    removeMutation.mutate(creativeWorkId)
  }

  // Navigate to event detail page
  const handleEventClick = (item: WatchlistItem) => {
    // Navigate using the creative work's documentId
    router.push(`/events/${item.creativeWork.documentId}`)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <PageHeader title={labels.title} subtitle={labels.subtitle} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <EventCardSkeleton key={i} variant="default" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <PageHeader title={labels.title} subtitle={labels.subtitle} />
        <Card className="mx-auto max-w-md">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <AlertCircle className="text-destructive mb-4 h-12 w-12" />
            <h3 className="text-lg font-semibold">{labels.error}</h3>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => refetch()}
            >
              <RefreshCw className="me-2 h-4 w-4" />
              {labels.retry}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Empty state
  if (!watchlist || watchlist.length === 0) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <PageHeader title={labels.title} subtitle={labels.subtitle} />
        <Card className="mx-auto max-w-md">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="bg-muted mb-4 rounded-full p-4">
              <Heart className="text-muted-foreground h-12 w-12" />
            </div>
            <h3 className="text-lg font-semibold">{labels.emptyTitle}</h3>
            <p className="text-muted-foreground mt-2 max-w-xs">
              {labels.emptyDescription}
            </p>
            <Button asChild className="mt-6">
              <Link href="/">
                <Film className="me-2 h-4 w-4" />
                {labels.emptyAction}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Watchlist grid
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title={labels.title}
        subtitle={labels.subtitle}
        count={watchlist.length}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {watchlist.map((item) => (
          <EventCard
            key={item.documentId}
            event={{
              id: item.creativeWork.documentId,
              title: item.creativeWork.title,
              posterUrl:
                item.creativeWork.poster?.formats?.small?.url ||
                item.creativeWork.poster?.url ||
                "/images/placeholder-poster.jpg",
              category: item.creativeWork.type || "Événement",
              venueName: "", // Not available from watchlist API
              date: item.addedAt, // Using addedAt as placeholder
            }}
            variant="default"
            isWatchlisted={true}
            onWatchlist={() => handleRemove(item.creativeWork.documentId)}
            onClick={() => handleEventClick(item)}
            labels={{
              addToWatchlist: labels.addToWatchlist,
              removeFromWatchlist: labels.removeFromWatchlist,
              priceFrom: labels.priceFrom,
            }}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Page header component
 */
function PageHeader({
  title,
  subtitle,
  count,
}: {
  title: string
  subtitle: string
  count?: number
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3">
        <Heart className="text-primary h-8 w-8" />
        <h1 className="text-3xl font-bold">
          {title}
          {count !== undefined && count > 0 && (
            <span className="text-muted-foreground ms-2 text-lg font-normal">
              ({count})
            </span>
          )}
        </h1>
      </div>
      <p className="text-muted-foreground mt-2">{subtitle}</p>
    </div>
  )
}

WatchlistPageClient.displayName = "WatchlistPageClient"
