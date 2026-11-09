"use client"

import * as React from "react"
import { AlertCircle, ChevronRight, Film, RotateCw } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import type { ShortFilm, ShortsFilters as ShortsFiltersType } from "../../types"
import type { GenreOption } from "../ShortsFilters"

import { useRouter } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { toShortFilmCard } from "../../types"
import { openExternal } from "../../utils"
import { ShortFilmCard, ShortFilmCardSkeleton } from "../ShortFilmCard"
import { ShortsFilters } from "../ShortsFilters"
import { ShortsHero } from "../ShortsHero"
import { SuggestionForm } from "../SuggestionForm"

export interface ShortsDirectoryLabels {
  pageDescription: string
  latestShorts: string
  seeAll: string
  allShorts: string
  loadMore: string
  loading: string
}

export interface ShortsDirectoryProps {
  /** Featured short films for hero carousel */
  featuredShorts: ShortFilm[]
  /** Latest added short films */
  latestShorts: ShortFilm[]
  /** Initial shorts list for directory */
  initialShorts: ShortFilm[]
  /** Total count of shorts */
  totalShorts: number
  /** Available genres for filtering */
  genres: GenreOption[]
  /** Initial filter values from URL */
  initialFilters?: ShortsFiltersType
  /** Additional class names */
  className?: string
  /** Overrides for the translated labels (rarely needed) */
  labels?: Partial<ShortsDirectoryLabels>
}

const GRID =
  "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"

/**
 * One serializer for both the API request and the shareable page URL, so the
 * address bar always reproduces exactly the result set on screen.
 */
function filtersToParams(filters: ShortsFiltersType): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.query) params.set("q", filters.query)
  if (filters.genres?.length) params.set("genres", filters.genres.join(","))
  if (filters.durationMin !== undefined)
    params.set("durationMin", String(filters.durationMin))
  if (filters.durationMax !== undefined)
    params.set("durationMax", String(filters.durationMax))
  if (filters.yearMin !== undefined)
    params.set("yearMin", String(filters.yearMin))
  if (filters.yearMax !== undefined)
    params.set("yearMax", String(filters.yearMax))
  if (filters.hasAwards) params.set("hasAwards", "true")
  if (filters.availableOnline) params.set("availableOnline", "true")
  // Ratings are out of v1: never serialize a rating filter or rating sort.
  if (
    filters.sortBy &&
    filters.sortBy !== "latest" &&
    filters.sortBy !== "rating"
  )
    params.set("sortBy", filters.sortBy)
  return params
}

interface ShortsPage {
  shorts: ShortFilm[]
  total: number
}

/** Throws on any non-2xx or malformed body, so an outage is never "0 results". */
async function fetchShortsPage(
  filters: ShortsFiltersType,
  page: number,
  locale: string,
  signal: AbortSignal
): Promise<ShortsPage> {
  const params = filtersToParams(filters)
  params.set("page", String(page))
  params.set("locale", locale)

  const response = await fetch(`/api/shorts?${params.toString()}`, { signal })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data: unknown = await response.json()
  const body = data as Partial<ShortsPage> | null
  if (!body || !Array.isArray(body.shorts)) {
    throw new Error("Malformed /api/shorts response")
  }
  return {
    shorts: body.shorts,
    total: typeof body.total === "number" ? body.total : body.shorts.length,
  }
}

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

/** Maps a failed suggestion response onto a code the form can explain. */
async function submitSuggestion(suggestion: unknown) {
  let response: Response
  try {
    response = await fetch("/api/shorts/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(suggestion),
    })
  } catch {
    throw new Error("NETWORK")
  }
  if (response.ok) return

  let code = "UNKNOWN"
  try {
    const body = (await response.json()) as { error?: unknown }
    if (typeof body.error === "string") code = body.error
  } catch {
    // Non-JSON error page (proxy, gateway): fall through to UNKNOWN.
  }
  throw new Error(code)
}

export function ShortsDirectory({
  featuredShorts,
  latestShorts,
  initialShorts,
  totalShorts,
  genres,
  initialFilters = {},
  className,
  labels: labelOverrides,
}: ShortsDirectoryProps) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("shorts.directory")
  const isRTL = locale === "ar"

  const labels: ShortsDirectoryLabels = {
    pageDescription: t("description"),
    latestShorts: t("latest"),
    seeAll: t("seeAll"),
    allShorts: t("all"),
    loadMore: t("loadMore"),
    loading: t("loading"),
    ...labelOverrides,
  }

  const [filters, setFilters] =
    React.useState<ShortsFiltersType>(initialFilters)
  const [shorts, setShorts] = React.useState<ShortFilm[]>(initialShorts)
  const [total, setTotal] = React.useState(totalShorts)
  const [page, setPage] = React.useState(1)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isLoadingMore, setIsLoadingMore] = React.useState(false)
  // A failed first page replaces the grid; a failed "more" keeps what loaded.
  const [listError, setListError] = React.useState(false)
  const [moreError, setMoreError] = React.useState(false)

  // Only the latest request may write state: typing "dra" then "drame"
  // must never end on the slower "dra" response.
  const listRequest = React.useRef<AbortController | null>(null)
  const moreRequest = React.useRef<AbortController | null>(null)

  React.useEffect(
    () => () => {
      listRequest.current?.abort()
      moreRequest.current?.abort()
    },
    []
  )

  const hasMore = shorts.length < total

  const loadFirstPage = React.useCallback(
    async (nextFilters: ShortsFiltersType) => {
      listRequest.current?.abort()
      moreRequest.current?.abort()
      const controller = new AbortController()
      listRequest.current = controller

      setIsLoading(true)
      setIsLoadingMore(false)
      setListError(false)
      setMoreError(false)
      try {
        const result = await fetchShortsPage(
          nextFilters,
          1,
          locale,
          controller.signal
        )
        setShorts(result.shorts)
        setTotal(result.total)
        setPage(1)
      } catch (error) {
        if (isAbort(error)) return
        setListError(true)
      } finally {
        if (listRequest.current === controller) setIsLoading(false)
      }
    },
    [locale]
  )

  const handleLoadMore = React.useCallback(async () => {
    // A ref, not state: two IntersectionObserver ticks can land before React
    // re-renders with `isLoadingMore`, which would request the same page twice.
    if (moreRequest.current || isLoading || !hasMore) return
    const controller = new AbortController()
    moreRequest.current = controller

    setIsLoadingMore(true)
    setMoreError(false)
    try {
      const result = await fetchShortsPage(
        filters,
        page + 1,
        locale,
        controller.signal
      )
      setShorts((previous) => {
        // De-duplicate: a film published between pages shifts the offsets.
        const seen = new Set(previous.map((s) => s.documentId))
        return [
          ...previous,
          ...result.shorts.filter((s) => !seen.has(s.documentId)),
        ]
      })
      setTotal(result.total)
      setPage(page + 1)
    } catch (error) {
      if (!isAbort(error)) setMoreError(true)
    } finally {
      if (moreRequest.current === controller) {
        moreRequest.current = null
        setIsLoadingMore(false)
      }
    }
  }, [filters, hasMore, isLoading, locale, page])

  const handleFiltersChange = React.useCallback(
    (nextFilters: ShortsFiltersType) => {
      setFilters(nextFilters)
      void loadFirstPage(nextFilters)

      const query = filtersToParams(nextFilters).toString()
      window.history.replaceState(
        null,
        "",
        query ? `?${query}` : window.location.pathname
      )
    },
    [loadFirstPage]
  )

  const handleSearch = React.useCallback(
    (query: string) => {
      handleFiltersChange({ ...filters, query: query || undefined })
    },
    [filters, handleFiltersChange]
  )

  const handleFilmClick = (film: ShortFilm) => {
    router.push(`/shorts/${film.slug}`)
  }

  const handlePlayTrailer = (film: ShortFilm) => openExternal(film.trailer)

  // Infinite scroll; the button below is the keyboard / no-observer path.
  const loadMoreRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const target = loadMoreRef.current
    if (!target || !hasMore || moreError) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void handleLoadMore()
      },
      { rootMargin: "400px 0px" }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, moreError, handleLoadMore])

  const resetFilters = () => handleFiltersChange({})

  // Contribution comes after discovery: a quiet prompt at the end of the
  // grid (and in the empty state), never a gold CTA beside the heading.
  const suggestPrompt = (
    <div className="text-muted-foreground mt-8 flex flex-wrap items-center justify-center gap-x-2 text-center text-sm">
      <p>{t("suggestPrompt")}</p>
      <SuggestionForm
        onSubmit={submitSuggestion}
        triggerVariant="link"
        className="inline-flex min-h-11 items-center font-semibold underline-offset-4"
      />
    </div>
  )

  return (
    <div className={cn("bg-background min-h-dvh", className)}>
      {featuredShorts.length > 0 && (
        <ShortsHero
          films={featuredShorts}
          onPlayTrailer={handlePlayTrailer}
          onViewDetails={handleFilmClick}
        />
      )}

      {latestShorts.length > 0 && (
        <section className="py-8" aria-labelledby="shorts-latest-heading">
          <div className="px-4 md:px-8">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2
                id="shorts-latest-heading"
                className="text-foreground min-w-0 text-xl font-bold"
              >
                {labels.latestShorts}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-gold-tint shrink-0 gap-1"
                onClick={() => handleFiltersChange({ sortBy: "latest" })}
              >
                {labels.seeAll}
                <ChevronRight
                  className={cn("h-4 w-4", isRTL && "rotate-180")}
                  aria-hidden="true"
                />
              </Button>
            </div>

            <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
              {latestShorts.map((film) => (
                <div
                  key={film.documentId}
                  className="w-[160px] shrink-0 snap-start md:w-[180px]"
                >
                  <ShortFilmCard
                    film={toShortFilmCard(film)}
                    onPlayTrailer={
                      film.trailer ? () => handlePlayTrailer(film) : undefined
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section
        className="px-4 py-8 md:px-8"
        aria-labelledby="shorts-all-heading"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 min-w-0">
            <h2
              id="shorts-all-heading"
              className="text-foreground text-xl font-bold"
            >
              {labels.allShorts}
            </h2>
            <p className="text-muted-foreground text-sm">
              {labels.pageDescription}
            </p>
          </div>

          <ShortsFilters
            filters={filters}
            genres={genres}
            totalResults={listError || isLoading ? 0 : total}
            onFiltersChange={handleFiltersChange}
            onSearch={handleSearch}
            className="mb-6"
          />

          {isLoading ? (
            <div className={GRID} aria-busy="true">
              <span className="sr-only" role="status">
                {labels.loading}
              </span>
              {Array.from({ length: 12 }).map((_, i) => (
                <ShortFilmCardSkeleton key={i} />
              ))}
            </div>
          ) : listError ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
              role="alert"
            >
              <AlertCircle
                className="text-destructive mb-4 h-12 w-12"
                aria-hidden="true"
              />
              <h3 className="text-foreground text-lg font-medium">
                {t("errorTitle")}
              </h3>
              <p className="text-muted-foreground mt-1 max-w-md text-sm">
                {t("errorBody")}
              </p>
              <Button
                className="mt-4 gap-2"
                onClick={() => void loadFirstPage(filters)}
              >
                <RotateCw className="h-4 w-4" aria-hidden="true" />
                {t("retry")}
              </Button>
            </div>
          ) : shorts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Film
                className="text-muted-foreground mb-4 h-16 w-16"
                aria-hidden="true"
              />
              <h3 className="text-foreground text-lg font-medium">
                {t("emptyTitle")}
              </h3>
              <p className="text-muted-foreground mt-1 max-w-md text-sm">
                {t("emptyBody")}
              </p>
              <Button variant="outline" className="mt-4" onClick={resetFilters}>
                {t("resetFilters")}
              </Button>
              {suggestPrompt}
            </div>
          ) : (
            <>
              <div className={GRID}>
                {shorts.map((film) => (
                  <ShortFilmCard
                    key={film.documentId}
                    film={toShortFilmCard(film)}
                    onPlayTrailer={
                      film.trailer ? () => handlePlayTrailer(film) : undefined
                    }
                  />
                ))}
              </div>

              {hasMore && (
                <div
                  ref={loadMoreRef}
                  className="flex flex-col items-center gap-3 py-8"
                >
                  {isLoadingMore ? (
                    <div className="flex items-center gap-2" role="status">
                      <div
                        className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
                        aria-hidden="true"
                      />
                      <span className="text-muted-foreground text-sm">
                        {labels.loading}
                      </span>
                    </div>
                  ) : moreError ? (
                    <>
                      <p
                        className="text-muted-foreground flex items-center gap-2 text-sm"
                        role="alert"
                      >
                        <AlertCircle
                          className="text-destructive h-4 w-4 shrink-0"
                          aria-hidden="true"
                        />
                        {t("loadMoreError")}
                      </p>
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => void handleLoadMore()}
                      >
                        <RotateCw className="h-4 w-4" aria-hidden="true" />
                        {t("retry")}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => void handleLoadMore()}
                    >
                      {labels.loadMore}
                    </Button>
                  )}
                </div>
              )}

              {suggestPrompt}
            </>
          )}
        </div>
      </section>
    </div>
  )
}

ShortsDirectory.displayName = "ShortsDirectory"
