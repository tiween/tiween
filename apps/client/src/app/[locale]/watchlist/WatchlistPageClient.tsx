"use client"

import * as React from "react"
import { CategoryTabs } from "@/features/events/components/CategoryTabs"
import {
  EventCard,
  EventCardSkeleton,
} from "@/features/events/components/EventCard"
import { useOfflineWatchlist } from "@/features/events/hooks/useOfflineWatchlist"
import { useRemoveFromWatchlist } from "@/features/events/hooks/useRemoveFromWatchlist"
import { watchlistKeys } from "@/features/events/hooks/useWatchlist"
import { mapTypeToCategory } from "@/features/events/utils/categoryMapper"
import {
  filterByCategory,
  partitionWatchlist,
} from "@/features/events/utils/watchlistView"
import { useQueryClient } from "@tanstack/react-query"
import { AlertCircle, Heart, RefreshCw, WifiOff } from "lucide-react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"

import type { CategoryType } from "@/features/events/components/CategoryTabs"
import type { EventCardLabels } from "@/features/events/components/EventCard"
import type { WatchlistItem } from "@/features/events/hooks/useWatchlist"

import { formatRelativeTime } from "@/lib/dates"
import { useRouter } from "@/lib/navigation"
import { EmptyState } from "@/components/common/EmptyState"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export interface WatchlistPageClientProps {
  locale: string
}

type CategoryLabels = Record<CategoryType, string>

/** Creative-work `type` -> UI category, for resolving a localized card badge. */
const TYPE_TO_CATEGORY: Record<string, CategoryType> = {
  film: "cinema",
  "short-film": "shorts",
  play: "theater",
  concert: "music",
  exhibition: "exhibitions",
}

/**
 * Client component for the watchlist page (Stories 5.3 + 5.4).
 *
 * Reads the offline-durable watchlist (`useOfflineWatchlist`), filters by
 * category and splits into Upcoming / Past sections (`watchlistView`), and
 * renders each saved item as a `WatchlistCard` that removes via the shared
 * `useRemoveFromWatchlist` (toast + Undo) while online.
 *
 * When offline (Story 5.4): a previously-cached list still renders as a success
 * view with an offline banner ("Offline" + "Last synced X ago"); an offline user
 * with no snapshot sees the `EmptyState offline` variant; and each card's heart is
 * disabled with a tooltip (read-only — no enqueue, no toast). All Story 5.3 online
 * behavior is preserved. Copy resolves from the `watchlist` i18n namespace.
 */
export function WatchlistPageClient({ locale }: WatchlistPageClientProps) {
  const t = useTranslations("watchlist")
  const te = useTranslations("events")
  const router = useRouter()
  const {
    items: rawItems,
    syncedAt,
    isOffline,
    isFromCache,
    isLoading,
    isError,
    refetch,
  } = useOfflineWatchlist()

  const [activeCategory, setActiveCategory] =
    React.useState<CategoryType>("all")

  const categoryLabels: CategoryLabels = React.useMemo(
    () => ({
      all: t("categories.all"),
      cinema: t("categories.cinema"),
      theater: t("categories.theater"),
      shorts: t("categories.shorts"),
      music: t("categories.music"),
      exhibitions: t("categories.exhibitions"),
    }),
    [t]
  )

  const cardLabels: EventCardLabels = React.useMemo(
    () => ({
      addToWatchlist: te("addToWatchlist"),
      removeFromWatchlist: te("removeFromWatchlist"),
      priceFrom: (price: string) => te("priceFrom", { price }),
      watchlistDisabledHint: t("offlineActionDisabled"),
    }),
    [te, t]
  )

  // Loading state — skeleton grid.
  if (isLoading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <EventCardSkeleton key={i} variant="default" />
          ))}
        </div>
      </div>
    )
  }

  // Error state — retry. Only reached when ONLINE with no cache (offline is a
  // fallback, not an error — `useOfflineWatchlist` gates `isError` accordingly).
  if (isError) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <Card className="mx-auto max-w-md">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <AlertCircle className="text-destructive mb-4 h-12 w-12" />
            <h3 className="text-lg font-semibold">{t("error")}</h3>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => refetch()}
            >
              <RefreshCw className="me-2 h-4 w-4" />
              {t("retry")}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Skip dangling rows whose creative-work was deleted (backend returns
  // `creativeWork: null`) — they are not renderable and would crash the card.
  const items = rawItems.filter((item) => item.creativeWork != null)

  // Empty state. Offline + no cached snapshot → the offline indicator itself. A
  // synced-but-empty list (isFromCache) is genuinely empty, not "unavailable",
  // so it falls through to the encouraging empty state below.
  if (items.length === 0) {
    if (isOffline && !isFromCache) {
      return (
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <PageHeader title={t("title")} subtitle={t("subtitle")} />
          <EmptyState
            variant="offline"
            title={t("offlineEmptyTitle")}
            description={t("offlineEmptyDescription")}
          />
        </div>
      )
    }

    // Online + nothing saved — encouraging EmptyState + discovery CTA.
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <EmptyState
          variant="emptyWatchlist"
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          primaryAction={{
            label: t("emptyAction"),
            onClick: () => router.push("/"),
          }}
        />
      </div>
    )
  }

  const filtered = filterByCategory(items, activeCategory)
  const { upcoming, past } = partitionWatchlist(filtered)

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        count={items.length}
      />

      {isOffline && (
        <OfflineBanner
          indicator={t("offlineIndicator")}
          lastSynced={
            syncedAt
              ? t("lastSynced", {
                  time: formatRelativeTime(syncedAt, locale),
                })
              : null
          }
        />
      )}

      <CategoryTabs
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        labels={categoryLabels}
        className="mb-6"
      />

      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          {t("noneInCategory")}
        </p>
      ) : (
        <>
          {upcoming.length > 0 && (
            <WatchlistSection title={t("upcomingTitle")}>
              {upcoming.map((item) => (
                <WatchlistCard
                  key={item.documentId}
                  item={item}
                  labels={cardLabels}
                  categoryLabels={categoryLabels}
                  isOffline={isOffline}
                />
              ))}
            </WatchlistSection>
          )}

          {past.length > 0 && (
            <WatchlistSection title={t("pastTitle")}>
              {past.map((item) => (
                <WatchlistCard
                  key={item.documentId}
                  item={item}
                  labels={cardLabels}
                  categoryLabels={categoryLabels}
                  isOffline={isOffline}
                />
              ))}
            </WatchlistSection>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Inline offline banner (Story 5.4): a Wi-Fi-off indicator + a localized
 * "Last synced X ago" line (Western numerals in Arabic via `formatRelativeTime`).
 */
function OfflineBanner({
  indicator,
  lastSynced,
}: {
  indicator: string
  lastSynced: string | null
}) {
  return (
    <div
      role="status"
      className="border-border bg-muted/50 text-muted-foreground mb-6 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="font-medium">{indicator}</span>
      {lastSynced && (
        <>
          <span aria-hidden="true">•</span>
          <span>{lastSynced}</span>
        </>
      )}
    </div>
  )
}

/**
 * A single watchlist row.
 *
 * Seeds `watchlistKeys.check(userId, id)` to `{ isInWatchlist: true }` on mount
 * (under the signed-in user's scope only, Story 5.8) — every
 * listed item is, by definition, watchlisted — so the shared
 * `useRemoveFromWatchlist` guard does not read `undefined` and silently no-op
 * the first tap (and the heart renders filled). Because hooks can't run inside
 * `.map`, this is a real component (one hook instance per row is fine).
 *
 * When offline (Story 5.4), the row is read-only: the heart is disabled (with a
 * tooltip) and `onWatchlist` is omitted so a tap does nothing — no enqueue, no
 * toast. `useRemoveFromWatchlist` itself is untouched.
 */
function WatchlistCard({
  item,
  labels,
  categoryLabels,
  isOffline,
}: {
  item: WatchlistItem
  labels: EventCardLabels
  categoryLabels: CategoryLabels
  isOffline: boolean
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const userId = session?.user?.userId
  const creativeWorkId = item.creativeWork.documentId
  const { remove } = useRemoveFromWatchlist(creativeWorkId)

  // Localized category badge: creative-work type -> UI category -> localized
  // label; fall back to the (French) display map for an unmapped type.
  const uiCategory = TYPE_TO_CATEGORY[item.creativeWork.type ?? ""]
  const category = uiCategory
    ? categoryLabels[uiCategory]
    : mapTypeToCategory(item.creativeWork.type)

  React.useEffect(() => {
    // Seed under the CURRENT user's scope only (Story 5.8) — never write a
    // check answer that another account could read back.
    if (!userId) return
    queryClient.setQueryData(watchlistKeys.check(userId, creativeWorkId), {
      isInWatchlist: true,
    })
  }, [queryClient, creativeWorkId, userId])

  return (
    <EventCard
      event={{
        id: creativeWorkId,
        title: item.creativeWork.title,
        posterUrl:
          item.creativeWork.poster?.formats?.small?.url ||
          item.creativeWork.poster?.url ||
          "/images/placeholder-poster.jpg",
        category,
        venueName: item.venueName ?? "",
        date: item.nextScreeningDate ?? item.lastScreeningDate ?? "",
      }}
      variant="default"
      isWatchlisted
      onWatchlist={isOffline ? undefined : remove}
      watchlistDisabled={isOffline}
      onClick={() => router.push(`/events/${creativeWorkId}`)}
      labels={labels}
    />
  )
}

/**
 * A titled grid section (Upcoming / Past).
 */
function WatchlistSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {children}
      </div>
    </section>
  )
}

/**
 * Page header component.
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
