"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useLocale } from "next-intl"

import type { TabType } from "@/components/layout/BottomNav"
import type { EventCardEvent } from "../../types/event.types"
import type { StrapiEvent } from "../../types/strapi.types"
import type { CategoryType } from "../CategoryTabs"
import type { FilmHeroEvent } from "../FilmHero"

import { BottomNav } from "@/components/layout/BottomNav"
import { Header } from "@/components/layout/Header"

import { mapTypeToCategory } from "../../utils"
import { CategoryTabs } from "../CategoryTabs"
import { DateSelector } from "../DateSelector"
import { EventSection } from "../EventSection"
import { FilmHero } from "../FilmHero"

export interface HomePageLabels {
  featuredTitle: string
  upcomingTitle: string
  todayTitle: string
  bottomNav: {
    home: string
    search: string
    tickets: string
    account: string
    navigation: string
    unscannedTickets: (count: number) => string
  }
  categoryTabs: {
    all: string
    cinema: string
    theater: string
    shorts: string
    music: string
    exhibitions: string
  }
  dateSelector: {
    today: string
    tomorrow: string
    custom: string
    selectDate: string
  }
  eventSection: {
    seeAll: string
    noEvents: string
  }
}

const defaultLabels: HomePageLabels = {
  featuredTitle: "À l'affiche",
  upcomingTitle: "À venir",
  todayTitle: "Aujourd'hui",
  bottomNav: {
    home: "Accueil",
    search: "Recherche",
    tickets: "Billets",
    account: "Compte",
    navigation: "Navigation principale",
    unscannedTickets: (count) => `${count} billets non scannés`,
  },
  categoryTabs: {
    all: "Tout",
    cinema: "Cinéma",
    theater: "Théâtre",
    shorts: "Courts-métrages",
    music: "Musique",
    exhibitions: "Expositions",
  },
  dateSelector: {
    today: "Aujourd'hui",
    tomorrow: "Demain",
    custom: "Choisir",
    selectDate: "Sélectionner une date",
  },
  eventSection: {
    seeAll: "Voir tout",
    noEvents: "Aucun événement disponible",
  },
}

export interface HomePageProps {
  /** Featured events for hero section */
  featuredEvents: StrapiEvent[]
  /** Upcoming events for listing */
  upcomingEvents: StrapiEvent[]
  /** Events happening today */
  todayEvents: StrapiEvent[]
  /** Total number of upcoming events */
  totalUpcoming: number
  /** Active category from URL */
  activeCategory?: CategoryType
  /** Active date filter from URL */
  activeDate?: string
  /** Localized labels */
  labels?: HomePageLabels
}

/**
 * Convert Strapi event to EventCard event format
 */
function toEventCardEvent(event: StrapiEvent): EventCardEvent {
  const minPrice = event.showtimes?.reduce((min, st) => {
    return st.price < min ? st.price : min
  }, event.showtimes[0]?.price || 0)

  return {
    id: event.documentId,
    title: event.creativeWork?.title || event.title,
    posterUrl:
      event.creativeWork?.poster?.formats?.medium?.url ||
      event.creativeWork?.poster?.url,
    category: mapTypeToCategory(event.creativeWork?.type),
    venueName: event.venue?.name || "",
    date: event.startDate,
    price: minPrice,
    currency: "TND",
  }
}

/**
 * Convert Strapi event to FilmHero event format
 */
function toFilmHeroEvent(event: StrapiEvent): FilmHeroEvent {
  return {
    id: event.documentId,
    title: event.creativeWork?.title || event.title,
    backdropUrl:
      event.creativeWork?.backdrop?.url ||
      event.creativeWork?.poster?.formats?.large?.url ||
      event.creativeWork?.poster?.url,
    category: mapTypeToCategory(event.creativeWork?.type),
    genres: event.creativeWork?.genres?.map((g) => g.name),
    rating: event.creativeWork?.rating,
    duration: event.creativeWork?.duration,
    year: event.creativeWork?.releaseYear,
    venueCount: 1, // Would need aggregation for accurate count
  }
}

/**
 * Convert Date to ISO date string (YYYY-MM-DD)
 */
function toDateString(date: Date): string {
  return date.toISOString().split("T")[0]
}

/**
 * Parse ISO date string to Date object
 */
function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  date.setHours(0, 0, 0, 0)
  return date
}

/**
 * Check if date string represents today
 */
function isToday(dateStr: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return dateStr === toDateString(today)
}

/**
 * HomePage - Main discovery page with featured events and listings
 *
 * Features:
 * - Full-bleed hero carousel for featured events
 * - Category filter tabs with URL state
 * - Date filter chips with URL state
 * - "Today" section for same-day events (when no date filter active)
 * - "Upcoming" section for future events
 * - Bottom navigation bar
 *
 * @example
 * ```tsx
 * <HomePage
 *   featuredEvents={featured}
 *   upcomingEvents={upcoming}
 *   todayEvents={today}
 *   totalUpcoming={42}
 *   activeCategory="cinema"
 *   activeDate="today"
 * />
 * ```
 */
export function HomePage({
  featuredEvents,
  upcomingEvents,
  todayEvents,
  totalUpcoming,
  activeCategory = "all",
  activeDate,
  labels = defaultLabels,
}: HomePageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const locale = useLocale()
  const [activeTab, setActiveTab] = React.useState<TabType>("home")
  const [heroIndex, setHeroIndex] = React.useState(0)
  const [watchlistedIds, setWatchlistedIds] = React.useState<
    Set<string | number>
  >(new Set())

  // Current hero event
  const currentHeroEvent = featuredEvents[heroIndex]

  // Convert activeDate to Date object for DateSelector
  // Default to today if no date filter is active
  const selectedDate = React.useMemo(() => {
    if (!activeDate) return new Date()
    if (activeDate === "today") return new Date()
    if (activeDate === "tomorrow") {
      const d = new Date()
      d.setDate(d.getDate() + 1)
      return d
    }
    // For "this-week", "weekend", or custom dates, parse the date string
    if (/^\d{4}-\d{2}-\d{2}$/.test(activeDate)) {
      return parseDateString(activeDate)
    }
    return new Date()
  }, [activeDate])

  // Handle category change - update URL
  const handleCategoryChange = React.useCallback(
    (category: CategoryType) => {
      const params = new URLSearchParams(searchParams.toString())

      if (category === "all") {
        params.delete("category")
      } else {
        params.set("category", category)
      }

      const queryString = params.toString()
      const url = queryString ? `/${locale}?${queryString}` : `/${locale}`

      router.push(url, { scroll: false })
    },
    [router, locale, searchParams]
  )

  // Handle date change - update URL
  const handleDateChange = React.useCallback(
    (date: Date) => {
      const params = new URLSearchParams(searchParams.toString())
      const dateStr = toDateString(date)

      // If today, use "today" preset; otherwise use ISO date
      if (isToday(dateStr)) {
        // Remove date param to show default view
        params.delete("date")
      } else {
        // Check if it's tomorrow
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        if (dateStr === toDateString(tomorrow)) {
          params.set("date", "tomorrow")
        } else {
          params.set("date", dateStr)
        }
      }

      const queryString = params.toString()
      const url = queryString ? `/${locale}?${queryString}` : `/${locale}`

      router.push(url, { scroll: false })
    },
    [router, locale, searchParams]
  )

  // Handle navigation
  const handleNavigate = (tab: TabType) => {
    setActiveTab(tab)
    if (tab === "search") {
      router.push(`/${locale}/search`)
    } else if (tab === "tickets") {
      router.push(`/${locale}/tickets`)
    } else if (tab === "account") {
      router.push(`/${locale}/account`)
    }
  }

  // Handle event click
  const handleEventClick = (eventId: string | number) => {
    router.push(`/${locale}/events/${eventId}`)
  }

  // Handle watchlist toggle
  const handleWatchlist = (eventId: string | number) => {
    setWatchlistedIds((prev) => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }

  // Auto-advance hero carousel
  React.useEffect(() => {
    if (featuredEvents.length <= 1) return

    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % featuredEvents.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [featuredEvents.length])

  // Reset hero index when featured events change (e.g., category change)
  React.useEffect(() => {
    setHeroIndex(0)
  }, [featuredEvents])

  // Convert events for display
  const upcomingCards = upcomingEvents.map(toEventCardEvent)
  const todayCards = todayEvents.map(toEventCardEvent)

  // Build "see all" URLs with current filters
  const buildSeeAllUrl = (basePath: string) => {
    const params = new URLSearchParams()

    if (activeCategory !== "all") {
      params.set("category", activeCategory)
    }
    if (activeDate) {
      params.set("date", activeDate)
    }

    // Add any params from basePath
    const [base, existingQuery] = basePath.split("?")
    if (existingQuery) {
      const existingParams = new URLSearchParams(existingQuery)
      existingParams.forEach((value, key) => {
        params.set(key, value)
      })
    }

    const queryString = params.toString()
    return queryString ? `${base}?${queryString}` : base
  }

  // Determine section title based on active date filter
  const getUpcomingTitle = () => {
    if (!activeDate) return labels.upcomingTitle
    if (activeDate === "today") return labels.todayTitle
    if (activeDate === "tomorrow") return "Demain"
    if (activeDate === "this-week") return "Cette semaine"
    if (activeDate === "weekend") return "Ce week-end"
    // For specific dates, format it nicely
    if (/^\d{4}-\d{2}-\d{2}$/.test(activeDate)) {
      const date = parseDateString(activeDate)
      return date.toLocaleDateString(
        locale === "ar" ? "fr-TN" : `${locale}-TN`,
        {
          weekday: "long",
          day: "numeric",
          month: "long",
        }
      )
    }
    return labels.upcomingTitle
  }

  return (
    <div className="bg-background min-h-screen pb-20">
      {/* Header */}
      <Header showLogo showLanguageSwitcher />

      {/* Hero Section */}
      {currentHeroEvent && (
        <div className="relative">
          <FilmHero
            event={toFilmHeroEvent(currentHeroEvent)}
            isWatchlisted={watchlistedIds.has(currentHeroEvent.documentId)}
            onWatchlist={() => handleWatchlist(currentHeroEvent.documentId)}
            onShare={() => {
              if (navigator.share) {
                navigator.share({
                  title:
                    currentHeroEvent.creativeWork?.title ||
                    currentHeroEvent.title,
                  url: `${window.location.origin}/${locale}/events/${currentHeroEvent.documentId}`,
                })
              }
            }}
            className="w-full lg:w-full"
          />

          {/* Hero pagination dots */}
          {featuredEvents.length > 1 && (
            <div className="absolute bottom-20 left-1/2 flex -translate-x-1/2 gap-2">
              {featuredEvents.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setHeroIndex(index)}
                  className={`h-2 w-2 rounded-full transition-all ${
                    index === heroIndex
                      ? "bg-primary w-4"
                      : "bg-white/50 hover:bg-white/75"
                  }`}
                  aria-label={`Aller au slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter Section - Category Tabs and Date Selector */}
      <div className="bg-secondary sticky top-12 z-30 space-y-2 border-b pb-2">
        {/* Category Tabs */}
        <CategoryTabs
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          labels={labels.categoryTabs}
          className="pt-2"
        />

        {/* Date Selector */}
        <DateSelector
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          locale={locale === "ar" ? "fr-TN" : `${locale}-TN`}
          labels={labels.dateSelector}
          className="px-4"
        />
      </div>

      {/* Today Section - Only show when no date filter is active */}
      {!activeDate && todayCards.length > 0 && (
        <EventSection
          title={labels.todayTitle}
          events={todayCards}
          variant="default"
          seeAllHref={buildSeeAllUrl(`/${locale}/events?date=today`)}
          onEventClick={handleEventClick}
          onWatchlist={handleWatchlist}
          watchlistedIds={watchlistedIds}
          labels={labels.eventSection}
        />
      )}

      {/* Featured Section - Only show when no date filter is active */}
      {!activeDate && featuredEvents.length > 0 && (
        <EventSection
          title={labels.featuredTitle}
          events={featuredEvents.map(toEventCardEvent)}
          variant="featured"
          seeAllHref={buildSeeAllUrl(`/${locale}/events?featured=true`)}
          onEventClick={handleEventClick}
          onWatchlist={handleWatchlist}
          watchlistedIds={watchlistedIds}
          labels={labels.eventSection}
        />
      )}

      {/* Upcoming/Filtered Events Section */}
      <EventSection
        title={getUpcomingTitle()}
        events={upcomingCards}
        variant="default"
        seeAllHref={buildSeeAllUrl(`/${locale}/events`)}
        onEventClick={handleEventClick}
        onWatchlist={handleWatchlist}
        watchlistedIds={watchlistedIds}
        labels={labels.eventSection}
        isLoading={false}
      />

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onNavigate={handleNavigate}
        labels={labels.bottomNav}
      />
    </div>
  )
}

HomePage.displayName = "HomePage"
