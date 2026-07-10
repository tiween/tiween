"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useLocale } from "next-intl"

import type { TabType } from "@/components/layout/BottomNav"
import type { StrapiEvent } from "../../types/strapi.types"
import type { CategoryType } from "../CategoryTabs"
import type { RegionOption } from "../RegionCitySelector/RegionCitySelector"
import type { VenueOption } from "../VenueSelector/VenueSelector"

import { BottomNav } from "@/components/layout/BottomNav"
import { useUnreadNotificationCount } from "@/features/notifications/hooks/useNotifications"
import { DesktopNav } from "@/components/layout/DesktopNav"
import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import { MaxWidthContainer } from "@/components/layout/MaxWidthContainer"

import { toEventCardEvent, toFilmHeroEvent } from "../../utils"
import { CategoryTabs } from "../CategoryTabs"
import { DateSelector } from "../DateSelector"
import { EventSection } from "../EventSection"
import { FilmHero } from "../FilmHero"
import { RegionCitySelector } from "../RegionCitySelector/RegionCitySelector"
import { VenueSelector } from "../VenueSelector/VenueSelector"

export interface HomePageWithVenueLabels {
  featuredTitle: string
  upcomingTitle: string
  todayTitle: string
  /** "Ce soir" — events happening today. */
  tonightTitle: string
  /** "Cette semaine" — events in the next 7 days. */
  thisWeekTitle: string
  /** "Tendances" — trending events. */
  trendingTitle: string
  bottomNav: {
    home: string
    search: string
    tickets: string
    account: string
    navigation: string
    unscannedTickets: (count: number) => string
    notifications: (count: number) => string
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
  regionCitySelector: {
    allLocations: string
    selectLocation: string
    allCities: string
  }
  venueSelector: {
    allVenues: string
    selectVenue: string
    cinema: string
    theater: string
    culturalCenter: string
    museum: string
    other: string
  }
}

const defaultLabels: HomePageWithVenueLabels = {
  featuredTitle: "À l'affiche",
  upcomingTitle: "À venir",
  todayTitle: "Aujourd'hui",
  tonightTitle: "Ce soir",
  thisWeekTitle: "Cette semaine",
  trendingTitle: "Tendances",
  bottomNav: {
    home: "Accueil",
    search: "Recherche",
    tickets: "Billets",
    account: "Compte",
    navigation: "Navigation principale",
    unscannedTickets: (count) => `${count} billets non scannés`,
    notifications: (count) => `${count} notifications non lues`,
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
  regionCitySelector: {
    allLocations: "Toute la Tunisie",
    selectLocation: "Lieu",
    allCities: "Toutes les villes",
  },
  venueSelector: {
    allVenues: "Tous les lieux",
    selectVenue: "Lieu",
    cinema: "Cinémas",
    theater: "Théâtres",
    culturalCenter: "Centres culturels",
    museum: "Musées",
    other: "Autres",
  },
}

export interface HomePageWithVenueProps {
  /** Featured events for hero section */
  featuredEvents: StrapiEvent[]
  /** Events happening today ("Ce soir") */
  todayEvents: StrapiEvent[]
  /** Events in the next 7 days ("Cette semaine") */
  thisWeekEvents?: StrapiEvent[]
  /** Trending events ("Tendances") */
  trendingEvents?: StrapiEvent[]
  /** Upcoming events for listing (legacy homepage variants) */
  upcomingEvents?: StrapiEvent[]
  /** Total number of upcoming events (legacy homepage variants) */
  totalUpcoming?: number
  /** Available regions with their cities */
  regions: RegionOption[]
  /** Available venues */
  venues: VenueOption[]
  /** Active category from URL */
  activeCategory?: CategoryType
  /** Active date filter from URL */
  activeDate?: string
  /** Active city filter from URL */
  activeCityId?: string
  /** Active venue filter from URL */
  activeVenueId?: string
  /** Localized labels */
  labels?: HomePageWithVenueLabels
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function parseDateString(dateStr: string): Date {
  const parts = dateStr.split("-")
  const date = new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2])
  )
  date.setHours(0, 0, 0, 0)
  return date
}

function isToday(dateStr: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return dateStr === toDateString(today)
}

/**
 * HomePageWithVenue - Main discovery page with city AND venue filtering
 *
 * This is the most complete version of HomePage that includes:
 * - Category filtering
 * - Date filtering
 * - Region/City filtering
 * - Venue filtering
 */
export function HomePageWithVenue({
  featuredEvents,
  todayEvents,
  thisWeekEvents = [],
  trendingEvents = [],
  regions,
  venues,
  activeCategory = "all",
  activeDate,
  activeCityId,
  activeVenueId,
  labels = defaultLabels,
}: HomePageWithVenueProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const locale = useLocale()
  const [activeTab, setActiveTab] = React.useState<TabType>("home")
  const { data: unreadNotifications } = useUnreadNotificationCount()
  const [heroIndex, setHeroIndex] = React.useState(0)
  const [watchlistedIds, setWatchlistedIds] = React.useState<
    Set<string | number>
  >(new Set())

  const currentHeroEvent = featuredEvents[heroIndex]

  const selectedDate = React.useMemo(() => {
    if (!activeDate) return new Date()
    if (activeDate === "today") return new Date()
    if (activeDate === "tomorrow") {
      const d = new Date()
      d.setDate(d.getDate() + 1)
      return d
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(activeDate)) {
      return parseDateString(activeDate)
    }
    return new Date()
  }, [activeDate])

  // Update URL with new params while preserving others
  const updateUrl = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })

      const queryString = params.toString()
      const url = queryString ? `/${locale}?${queryString}` : `/${locale}`
      router.push(url, { scroll: false })
    },
    [router, locale, searchParams]
  )

  const handleCategoryChange = React.useCallback(
    (category: CategoryType) => {
      updateUrl({ category: category === "all" ? null : category })
    },
    [updateUrl]
  )

  const handleDateChange = React.useCallback(
    (date: Date) => {
      const dateStr = toDateString(date)
      if (isToday(dateStr)) {
        updateUrl({ date: null })
      } else {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        if (dateStr === toDateString(tomorrow)) {
          updateUrl({ date: "tomorrow" })
        } else {
          updateUrl({ date: dateStr })
        }
      }
    },
    [updateUrl]
  )

  const handleCityChange = React.useCallback(
    (cityDocumentId: string | null) => {
      // When city changes, clear venue filter (venues are city-specific)
      updateUrl({ city: cityDocumentId, venue: null })
    },
    [updateUrl]
  )

  const handleVenueChange = React.useCallback(
    (venueDocumentId: string | null) => {
      updateUrl({ venue: venueDocumentId })
    },
    [updateUrl]
  )

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

  const handleEventClick = (eventId: string | number) => {
    router.push(`/${locale}/events/${eventId}`)
  }

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

  React.useEffect(() => {
    if (featuredEvents.length <= 1) return
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % featuredEvents.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [featuredEvents.length])

  React.useEffect(() => {
    setHeroIndex(0)
  }, [featuredEvents])

  // Localized accessible label for the hero pagination dots (a11y — AA).
  const heroSlideLabel = (n: number) =>
    locale === "ar"
      ? `الانتقال إلى الشريحة ${n}`
      : locale === "en"
        ? `Go to slide ${n}`
        : `Aller au slide ${n}`

  const tonightCards = todayEvents.map((e) => toEventCardEvent(e, locale))
  const thisWeekCards = thisWeekEvents.map((e) => toEventCardEvent(e, locale))
  const trendingCards = trendingEvents.map((e) => toEventCardEvent(e, locale))

  const buildSeeAllUrl = (basePath: string) => {
    const params = new URLSearchParams()
    if (activeCategory !== "all") params.set("category", activeCategory)
    if (activeDate) params.set("date", activeDate)
    if (activeCityId) params.set("city", activeCityId)
    if (activeVenueId) params.set("venue", activeVenueId)

    const [base, existingQuery] = basePath.split("?")
    if (existingQuery) {
      const existingParams = new URLSearchParams(existingQuery)
      existingParams.forEach((value, key) => params.set(key, value))
    }

    const queryString = params.toString()
    return queryString ? `${base}?${queryString}` : base
  }

  // Filter venues by selected city if a city is selected
  const filteredVenues = React.useMemo(() => {
    if (!activeCityId) return venues
    // This assumes venues have city info - if not all venues would show
    return venues
  }, [venues, activeCityId])

  /**
   * Render a curated section with the shared EventSection primitive:
   * horizontal scroll on mobile, responsive grid on desktop. The section keeps
   * its own inline empty state, so a slice with zero events degrades gracefully
   * (never a cold empty page).
   */
  const renderCuratedSection = (
    key: string,
    title: string,
    events: ReturnType<typeof toEventCardEvent>[],
    seeAllHref?: string,
    variant: "default" | "featured" = "default"
  ) => (
    <React.Fragment key={key}>
      {/* Mobile: horizontal scroll */}
      <div className="lg:hidden">
        <EventSection
          title={title}
          events={events}
          variant={variant}
          layout="scroll"
          seeAllHref={seeAllHref}
          onEventClick={handleEventClick}
          onWatchlist={handleWatchlist}
          watchlistedIds={watchlistedIds}
          labels={labels.eventSection}
        />
      </div>
      {/* Desktop: responsive grid */}
      <MaxWidthContainer className="hidden lg:block">
        <EventSection
          title={title}
          events={events}
          variant={variant}
          layout="grid"
          gridColumns={4}
          seeAllHref={seeAllHref}
          onEventClick={handleEventClick}
          onWatchlist={handleWatchlist}
          watchlistedIds={watchlistedIds}
          labels={labels.eventSection}
        />
      </MaxWidthContainer>
    </React.Fragment>
  )

  return (
    <div className="bg-background min-h-screen pb-20 lg:pb-0">
      {/* Mobile Header */}
      <Header showLogo showLanguageSwitcher className="lg:hidden" />

      {/* Desktop Navigation */}
      <DesktopNav />

      {currentHeroEvent && (
        <div className="relative">
          <FilmHero
            event={toFilmHeroEvent(currentHeroEvent, locale)}
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
            aspectMode="auto"
          />

          {featuredEvents.length > 1 && (
            <div className="absolute bottom-20 left-1/2 flex -translate-x-1/2 gap-2 lg:bottom-8">
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
                  aria-label={heroSlideLabel(index + 1)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter Section - Category, Location, Venue, and Date */}
      <div className="bg-secondary sticky top-12 z-30 space-y-2 border-b pb-2 lg:top-16">
        {/* Category Tabs */}
        <MaxWidthContainer noPadding className="lg:px-0">
          <CategoryTabs
            activeCategory={activeCategory}
            onCategoryChange={handleCategoryChange}
            labels={labels.categoryTabs}
            className="pt-2"
          />
        </MaxWidthContainer>

        {/* Location + Venue + Date Filters Row */}
        <MaxWidthContainer noPadding>
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-4 lg:px-0">
            {/* Region/City Selector */}
            {regions.length > 0 && (
              <RegionCitySelector
                regions={regions}
                selectedCityId={activeCityId || null}
                onCityChange={handleCityChange}
                labels={labels.regionCitySelector}
                className="shrink-0"
              />
            )}

            {/* Venue Selector */}
            {filteredVenues.length > 0 && (
              <VenueSelector
                venues={filteredVenues}
                selectedVenueId={activeVenueId || null}
                onVenueChange={handleVenueChange}
                labels={labels.venueSelector}
                className="shrink-0"
              />
            )}

            {/* Date Selector */}
            <DateSelector
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              locale={locale === "ar" ? "fr-TN" : `${locale}-TN`}
              labels={labels.dateSelector}
              className="flex-1"
            />
          </div>
        </MaxWidthContainer>
      </div>

      {/* Main Content — curated slices (always rendered; each degrades to its
          own inline empty state so the page is never a cold empty page). */}
      <main>
        {renderCuratedSection(
          "tonight",
          labels.tonightTitle,
          tonightCards,
          buildSeeAllUrl(`/${locale}/events?date=today`)
        )}

        {renderCuratedSection(
          "this-week",
          labels.thisWeekTitle,
          thisWeekCards,
          // The listing `date` grammar has no "this-week" preset, and computing
          // a range at render is timezone-unsafe + hydration-unstable, so the
          // "See all" link opens the upcoming listing (sorted ascending, so
          // this-week events lead) rather than a mis-scoped/mismatched window.
          buildSeeAllUrl(`/${locale}/events`)
        )}

        {renderCuratedSection(
          "trending",
          labels.trendingTitle,
          trendingCards,
          buildSeeAllUrl(`/${locale}/events`),
          "featured"
        )}
      </main>

      {/* Desktop Footer */}
      <Footer />

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        accountBadgeCount={unreadNotifications ?? 0}
        onNavigate={handleNavigate}
        labels={labels.bottomNav}
      />
    </div>
  )
}

HomePageWithVenue.displayName = "HomePageWithVenue"
