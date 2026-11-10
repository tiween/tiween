"use client"

/**
 * The `/shorts` directory body (SPAGE-01, SPAGE-05; D-01, D-03, D-04, D-07).
 *
 * One 2:3 poster grid of the Strapi catalogue under a one-line intro and a
 * polite result line. There is no hero, latest rail, search, chip, filter or
 * sort surface (D-01, D-04): `ShortsFilters` returns in Phases 3 and 4.
 *
 * The first page is rendered by the server page and arrives as props, so
 * mounting makes no request and the cards are real links before JavaScript
 * loads. A failed first page never reaches this component: the page throws and
 * `error.tsx` renders the retryable block (D-07), so an outage can never read
 * as "no short films". Only an HTTP 200 with zero rows shows the
 * empty-catalogue block.
 *
 * Later pages come from `/api/shorts` with exactly `locale` and `page` (D-03,
 * T-02-19): a single-flight ref prevents duplicate requests, a failure keeps
 * the films already shown and offers an inline retry, and the scroll observer
 * is an additive path that stays off while in error. The button is the
 * keyboard path.
 */
import * as React from "react"
import { ShortsWatchlistProvider } from "@/features/watchlist"
import { AlertCircle, Film, Loader2, RotateCw } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import type { ShortFilm } from "../../types"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { toShortFilmCard } from "../../types"
import { formatCount } from "../../utils"
import { ShortFilmCard } from "../ShortFilmCard"
import { ShortsStateBlock } from "../ShortsBoundary"
import { SHORTS_GRID_CLASS, SHORTS_PAGE_CLASS } from "../shortsLayout"
import { ShortsPageIntro } from "../ShortsPageIntro"
import { SuggestionForm } from "../SuggestionForm"

export interface ShortsDirectoryProps {
  /** First page of the catalogue, rendered by the server page. */
  initialShorts: ShortFilm[]
  /**
   * Total number of published short films, across every page, as the API
   * counts them. Shown as-is: a film the API lists without a slug is omitted
   * from the cards but still counted, so the figure may exceed the cards shown
   * by that (small) number. Paging never depends on it.
   */
  totalShorts: number
  /**
   * Whether the API has a page after the first (`page < pageCount`). Paging
   * follows the server, not `shorts.length < total`, because omitted films
   * make those two disagree. When absent it falls back to the length check.
   */
  initialHasMore?: boolean
  /** Additional class names */
  className?: string
}

/**
 * Secondary pill (DESIGN.md): 44px, 160px minimum, transparent fill, 1.5px
 * Gold Leaf border, Gold Tint label. The gold fill is reserved for primary
 * actions, which this component has none of.
 */
const SECONDARY_PILL_CLASS =
  "h-11 min-w-40 rounded-full border-[1.5px] border-primary bg-transparent px-6 text-base font-bold text-gold-tint shadow-none transition-colors hover:bg-primary/12 hover:text-gold-tint active:scale-[0.98] motion-reduce:active:scale-100 aria-disabled:pointer-events-none"

interface ShortsPage {
  shorts: ShortFilm[]
  total: number
  /** The server's own `page < pageCount`. */
  hasMore: boolean
}

/**
 * Asks `/api/shorts` for one page. The query carries exactly `locale` and
 * `page`: the route fixes the page size, so a caller cannot vary the cache key
 * (T-02-19). Throws on any non-2xx or any body without a `shorts` array, so a
 * 502 or a malformed body is a failure and never "no more films".
 */
async function fetchShortsPage(
  page: number,
  locale: string,
  signal: AbortSignal
): Promise<ShortsPage> {
  const params = new URLSearchParams({ locale, page: String(page) })

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
    // The route always sends it; a body without it is treated as the last page
    // so a malformed response can never loop the pager.
    hasMore: body.hasMore === true,
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
  initialShorts,
  totalShorts,
  initialHasMore,
  className,
}: ShortsDirectoryProps) {
  const locale = useLocale()
  const t = useTranslations("shorts.directory")
  const tResults = useTranslations("shorts.filters")

  const [shorts, setShorts] = React.useState<ShortFilm[]>(initialShorts)
  const [total, setTotal] = React.useState(totalShorts)
  const [page, setPage] = React.useState(1)
  const [isLoadingMore, setIsLoadingMore] = React.useState(false)
  const [moreError, setMoreError] = React.useState(false)
  // Server-driven (`page < pageCount`). Only a failed request keeps the pager
  // from advancing; an empty page (all films omitted) does not end the list.
  const [hasMore, setHasMore] = React.useState(
    initialHasMore ?? initialShorts.length < totalShorts
  )

  // A ref, not state: two observer ticks can land before React re-renders with
  // `isLoadingMore`, which would request the same page twice.
  const moreRequest = React.useRef<AbortController | null>(null)
  const gridRef = React.useRef<HTMLDivElement>(null)
  const sentinelRef = React.useRef<HTMLDivElement>(null)
  // Set when the button (not the observer) fetched the page, so that if the
  // button unmounts with the list complete, focus lands on the first new card.
  const focusAfterAppend = React.useRef<number | null>(null)

  React.useEffect(
    () => () => {
      moreRequest.current?.abort()
    },
    []
  )

  const isEmpty = shorts.length === 0

  const handleLoadMore = React.useCallback(
    async (source: "button" | "observer") => {
      if (moreRequest.current || !hasMore) return
      const controller = new AbortController()
      moreRequest.current = controller

      setIsLoadingMore(true)
      setMoreError(false)
      try {
        const result = await fetchShortsPage(
          page + 1,
          locale,
          controller.signal
        )
        const previousLength = shorts.length

        if (source === "button" && !result.hasMore) {
          focusAfterAppend.current = previousLength
        }
        setShorts((previous) => {
          const known = new Set(previous.map((s) => s.documentId))
          return [
            ...previous,
            ...result.shorts.filter((s) => !known.has(s.documentId)),
          ]
        })
        setTotal(result.total)
        setPage(page + 1)
        setHasMore(result.hasMore)
      } catch (error) {
        if (!isAbort(error)) setMoreError(true)
      } finally {
        if (moreRequest.current === controller) {
          moreRequest.current = null
          setIsLoadingMore(false)
        }
      }
    },
    [hasMore, locale, page, shorts]
  )

  // Appended cards never take focus, except when the button that fetched them
  // is gone: then the first new card's link takes it, so focus is not dropped.
  React.useEffect(() => {
    const index = focusAfterAppend.current
    if (index === null || hasMore) return
    focusAfterAppend.current = null
    const cards = gridRef.current?.children
    if (!cards?.length) return
    const card = cards[Math.min(index, cards.length - 1)]
    card?.querySelector<HTMLElement>("a")?.focus()
  }, [shorts, hasMore])

  // Infinite scroll, additive. Off while in error: a failing request must not
  // be hammered by an observer that keeps seeing the sentinel.
  React.useEffect(() => {
    const target = sentinelRef.current
    if (!target || !hasMore || moreError) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void handleLoadMore("observer")
      },
      { rootMargin: "400px 0px" }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, moreError, handleLoadMore])

  // Contribution comes after discovery: a quiet prompt at the end of the grid,
  // never a gold CTA beside the heading.
  const suggestPrompt = (
    <div className="text-muted-foreground mt-8 flex flex-wrap items-center justify-center gap-x-2 text-center text-sm xl:mt-12">
      <p>{t("suggestPrompt")}</p>
      <SuggestionForm
        onSubmit={submitSuggestion}
        triggerVariant="link"
        className="inline-flex min-h-11 items-center font-semibold underline-offset-4"
      />
    </div>
  )

  return (
    // One watchlist list request for the whole grid, including appended pages,
    // seeds every card heart (FR19, D-13): no per-card check request.
    <ShortsWatchlistProvider documentIds={shorts.map((s) => s.documentId)}>
      <main className={cn(SHORTS_PAGE_CLASS, className)}>
        <ShortsPageIntro title={t("title")} description={t("description")} />

        {isEmpty ? (
          <ShortsStateBlock
            icon={
              <Film
                className="text-muted-foreground size-12"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            }
            title={t("catalogEmptyTitle")}
            headingLevel={2}
            body={t("catalogEmptyBody")}
          >
            <SuggestionForm
              onSubmit={submitSuggestion}
              className={SECONDARY_PILL_CLASS}
            />
          </ShortsStateBlock>
        ) : (
          <>
            <p
              role="status"
              className="text-muted-foreground mt-4 text-sm leading-5 xl:mt-6"
            >
              {tResults("results", {
                count: total,
                display: formatCount(total, locale),
              })}
            </p>

            <section
              aria-labelledby="shorts-all-heading"
              className="mt-2 xl:mt-4"
            >
              <h2 id="shorts-all-heading" className="sr-only">
                {t("all")}
              </h2>

              <div ref={gridRef} className={SHORTS_GRID_CLASS}>
                {shorts.map((film) => (
                  <ShortFilmCard
                    key={film.documentId}
                    film={toShortFilmCard(film)}
                  />
                ))}
              </div>
            </section>

            {hasMore ? (
              <div className="mt-8 flex flex-col items-center gap-3 xl:mt-12">
                {moreError && (
                  <p
                    role="alert"
                    className="text-muted-foreground flex items-center gap-2 text-sm leading-5"
                  >
                    <AlertCircle
                      className="text-destructive size-4 shrink-0"
                      aria-hidden="true"
                    />
                    {t("loadMoreError")}
                  </p>
                )}

                <Button
                  type="button"
                  variant="outline"
                  aria-disabled={isLoadingMore || undefined}
                  className={cn(SECONDARY_PILL_CLASS, "gap-2")}
                  onClick={() => {
                    if (isLoadingMore) return
                    void handleLoadMore("button")
                  }}
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2
                        className="text-gold-tint size-5 animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                      <span className="text-sm leading-5 font-normal">
                        {t("loading")}
                      </span>
                    </>
                  ) : moreError ? (
                    <>
                      <RotateCw className="size-4" aria-hidden="true" />
                      {t("retry")}
                    </>
                  ) : (
                    t("loadMore")
                  )}
                </Button>

                {/* Announces the loading state; the button label is not a live region. */}
                <span role="status" className="sr-only">
                  {isLoadingMore ? t("loading") : ""}
                </span>

                <div
                  ref={sentinelRef}
                  aria-hidden="true"
                  className="h-px w-full"
                />
              </div>
            ) : (
              suggestPrompt
            )}
          </>
        )}
      </main>
    </ShortsWatchlistProvider>
  )
}

ShortsDirectory.displayName = "ShortsDirectory"
