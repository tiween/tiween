"use client"

import * as React from "react"
import Image from "next/image"
import {
  ArrowUpRight,
  CaretLeft,
  CaretRight,
  CheckCircle,
  FilmSlate,
  Heart,
  Play,
  ShareNetwork,
  Trophy,
} from "@phosphor-icons/react"
import { useLocale, useTranslations } from "next-intl"

import type { PlatformType, ShortFilm } from "../../types"

import { Link, useRouter } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

import {
  formatCount,
  openExternal,
  positiveNumber,
  stripHtmlTags,
  toSafeExternalUrl,
} from "../../utils"
import styles from "./ShortFilmDetail.module.css"

/**
 * Proper-noun platform names. Not translatable copy — a brand is a brand in
 * every locale — so they live here rather than in the `shorts` catalog.
 *
 * Deliberately `Partial`: `PlatformType` is a compile-time claim about
 * CMS-sourced data, so an unmapped (or newly added) platform must resolve to
 * the translated generic label rather than to `undefined`.
 */
const PLATFORM_NAMES: Partial<Record<PlatformType, string>> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  dailymotion: "Dailymotion",
  mubi: "MUBI",
  netflix: "Netflix",
}

/**
 * Matches `.animate-watchlist-pulse` in `globals.css` (0.3s) and the existing
 * `FilmHero` precedent. A longer window would leave the class on past the
 * animation and block re-triggering the pulse.
 */
const PULSE_DURATION_MS = 300

/**
 * Height of the sticky page header (44px control + 11px block padding ×2).
 * The action row counts as "scrolled away" once it slides under the header,
 * not only once it leaves the viewport edge.
 */
const HEADER_HEIGHT_PX = 66

export interface ShortFilmDetailProps {
  /** The short film to display. */
  film: ShortFilm
  /** "Dans la même veine" shelf — omitted entirely when empty. */
  relatedShorts?: ShortFilm[]
  /** Additional class names for the page root. */
  className?: string
}

/**
 * ShortFilmDetail — the player-first short-film detail page from the 2026
 * design handoff (`Court Métrage Détail.dc.html`).
 *
 * Every user-visible string resolves through `useTranslations("shorts")`; the
 * layout uses CSS logical properties only, so the AR-RTL rendering mirrors with
 * no per-direction overrides. Sections whose data is absent do not render —
 * there are no empty shells and no placeholder rows.
 *
 * The watchlist heart is deliberately LOCAL optimistic state, not the
 * server-backed `useAddToWatchlist`/`useRemoveFromWatchlist` pair: shorts are
 * mock-backed with synthetic `documentId`s, so a real POST would write garbage.
 *
 * Deferred (they need schema fields that do not exist yet): the "Équipe
 * artistique" crew grid (`ShortFilm.crew`) and the streaming access sub-label
 * (`StreamingLink.accessType`).
 */
export function ShortFilmDetail({
  film,
  relatedShorts = [],
  className,
}: ShortFilmDetailProps) {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations("shorts")
  // Arabic needs the count to pick the noun form (دقيقتان / 5 دقائق / 21 دقيقة).
  const formatMinutes = (n: number) =>
    t("durationMinutes", { count: n, display: formatCount(n, locale) })
  const isRTL = locale === "ar"

  const [saved, setSaved] = React.useState(false)
  const [justSaved, setJustSaved] = React.useState(false)
  const pulseTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(
    () => () => {
      if (pulseTimer.current) clearTimeout(pulseTimer.current)
    },
    []
  )

  // Images that failed to load fall back to the frame's reserved-artwork
  // stripe instead of a broken image whose alt text collides with the badge.
  const [failedImages, setFailedImages] = React.useState<ReadonlySet<string>>(
    () => new Set()
  )
  const markImageFailed = React.useCallback((url: string) => {
    setFailedImages((previous) =>
      previous.has(url) ? previous : new Set(previous).add(url)
    )
  }, [])
  const usableImage = (url: string | null | undefined): string | null =>
    url && !failedImages.has(url) ? url : null

  const toggleSaved = () => {
    setSaved((previous) => {
      const next = !previous
      if (next) {
        if (pulseTimer.current) clearTimeout(pulseTimer.current)
        setJustSaved(true)
        pulseTimer.current = setTimeout(
          () => setJustSaved(false),
          PULSE_DURATION_MS
        )
      } else {
        setJustSaved(false)
      }
      return next
    })
  }

  // ---------------------------------------------------------------- data --

  const heroMediaUrl = usableImage(
    film.backdrop?.formats?.large?.url ||
      film.backdrop?.url ||
      film.poster?.formats?.large?.url ||
      film.poster?.url
  )

  const streamingLinks = film.streamingLinks ?? []
  const awards = film.awards ?? []
  const cast = film.cast ?? []
  const genres = film.genres ?? []
  const directors = film.directors ?? []

  // A festival SELECTION (`won: false`) is not a win — only an actual win
  // earns the "Primé" chip.
  const hasWin = awards.some((award) => award.won)

  const trailerUrl = toSafeExternalUrl(film.trailer)
  // The primary watch target: the first streaming link with a usable URL (a
  // blank or non-http entry must not swallow the trailer fallback), else the
  // trailer. When neither exists there is no play affordance and no sticky bar.
  const streamingWatchUrl =
    streamingLinks.map((link) => toSafeExternalUrl(link.url)).find(Boolean) ??
    null
  const watchUrl = streamingWatchUrl ?? trailerUrl
  // The standalone trailer button would duplicate the primary CTA when the CTA
  // has already fallen back to the trailer.
  const showTrailerButton = Boolean(trailerUrl) && Boolean(streamingWatchUrl)

  const synopsisText = film.synopsis ? stripHtmlTags(film.synopsis) : null

  // ---------------------------------------------------------- sticky bar --

  /**
   * The sticky bar repeats the watch CTA, so it only earns its place once the
   * action row has scrolled away — otherwise a phone shows the hero disc, the
   * action-row pill and the bar CTA (three gold controls) at once. While the
   * row is on screen (or still below the fold) the bar is hidden, `inert` and
   * `aria-hidden`.
   *
   * The initial state is VISIBLE: SSR markup and a browser without
   * IntersectionObserver keep the bar, so the fallback never loses the CTA.
   */
  const actionsRef = React.useRef<HTMLDivElement>(null)
  const stickyRef = React.useRef<HTMLDivElement>(null)
  const [stickyVisible, setStickyVisible] = React.useState(true)

  React.useEffect(() => {
    const row = actionsRef.current
    if (!watchUrl || !row || typeof IntersectionObserver === "undefined") {
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        const rootTop = entry.rootBounds?.top ?? 0
        // Visible only once the row has gone ABOVE the viewport (under the
        // header) — not while it is on screen or still below the fold.
        setStickyVisible(
          !entry.isIntersecting && entry.boundingClientRect.bottom <= rootTop
        )
      },
      { rootMargin: `-${HEADER_HEIGHT_PX}px 0px 0px 0px` }
    )
    observer.observe(row)
    return () => observer.disconnect()
  }, [watchUrl])

  // `inert` is set imperatively: React 18 and 19 disagree on its prop type.
  React.useEffect(() => {
    stickyRef.current?.toggleAttribute("inert", !stickyVisible)
  }, [stickyVisible])

  // A trailing slash on the env var would otherwise produce `//fr/shorts/…`.
  const shareBaseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://tiween.tn"
  ).replace(/\/+$/, "")
  const shareUrl = `${shareBaseUrl}/${locale}/shorts/${film.slug}`

  // ------------------------------------------------------------- handlers --

  const handleShare = async () => {
    const canNativeShare =
      typeof navigator !== "undefined" && typeof navigator.share === "function"

    if (canNativeShare) {
      try {
        await navigator.share({
          title: film.title,
          text: synopsisText ? synopsisText.slice(0, 200) : film.title,
          url: shareUrl,
        })
        return
      } catch (error) {
        // ONLY an AbortError is a user dismissal — surface nothing. Everything
        // else (including a `NotAllowedError` permission denial) means native
        // share did not happen, so fall through to the clipboard rather than
        // leaving the user with no result at all.
        const dismissed = error instanceof Error && error.name === "AbortError"
        if (dismissed) return
      }
    }

    // A copy with no confirmation reads as a dead button, and a failed copy
    // must still hand the visitor the link — so both outcomes are announced
    // (the toast region is a polite live region).
    try {
      if (!navigator.clipboard) throw new Error("clipboard unavailable")
      await navigator.clipboard.writeText(shareUrl)
      toast({ description: t("shareCopied") })
    } catch {
      toast({ description: t("shareFailed", { url: shareUrl }) })
    }
  }

  const handleWatch = () => {
    if (watchUrl) openExternal(watchUrl)
  }

  const handleTrailer = () => {
    if (trailerUrl) openExternal(trailerUrl)
  }

  /**
   * This page is built to be shared, so a visitor arriving from a shared link
   * has no in-app history — `router.back()` would bounce them off-site. Only
   * go back when the previous document was one of ours.
   */
  const handleBack = () => {
    let cameFromApp = false
    try {
      cameFromApp =
        typeof document !== "undefined" &&
        Boolean(document.referrer) &&
        new URL(document.referrer).origin === window.location.origin
    } catch {
      cameFromApp = false
    }
    if (cameFromApp) router.back()
    // Locale-aware: French is served unprefixed (`localePrefix: "as-needed"`),
    // so a hand-built `/fr/shorts` would cost a 307 redirect.
    else router.push("/shorts")
  }

  // --------------------------------------------------------------- meta ----

  const metaParts: React.ReactNode[] = []
  if (directors.length > 0) {
    metaParts.push(
      <bdi key="directors">{directors.map((d) => d.name).join(", ")}</bdi>
    )
  }
  if (film.releaseYear) {
    metaParts.push(<bdi key="year">{film.releaseYear}</bdi>)
  }
  if (film.duration) {
    metaParts.push(
      <bdi key="duration">
        {formatMinutes(film.duration)}
      </bdi>
    )
  }
  if (genres.length > 0) {
    metaParts.push(
      <bdi key="genres">{genres.map((g) => g.name).join(" · ")}</bdi>
    )
  }

  const BackIcon = isRTL ? CaretRight : CaretLeft

  const availability = film.duration
    ? t("availableDuration", { duration: formatMinutes(film.duration) })
    : t("available")

  return (
    <div
      data-tiween-shorts-detail=""
      dir={isRTL ? "rtl" : "ltr"}
      className={cn(styles.root, className)}
    >
      {/* ------------------------------------------------------- header -- */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <button
            type="button"
            onClick={handleBack}
            aria-label={t("back")}
            className={cn(styles.iconButton, styles.backButton)}
          >
            <span className={styles.iconButtonDisc}>
              <BackIcon size={20} />
            </span>
          </button>

          <Image
            src="/images/tiween-wordmark-gold.png"
            alt="tiween"
            width={36}
            height={34}
            className={styles.wordmark}
            priority
          />

          <button
            type="button"
            onClick={handleShare}
            aria-label={t("share")}
            className={styles.iconButton}
          >
            <span className={styles.iconButtonDisc}>
              <ShareNetwork size={18} />
            </span>
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {/* ------------------------------------------------------- hero -- */}
        <section className={styles.hero}>
          {heroMediaUrl ? (
            <Image
              src={heroMediaUrl}
              alt={film.title}
              fill
              priority
              sizes="(max-width: 920px) 100vw, 920px"
              className={styles.heroImage}
              onError={() => markImageFailed(heroMediaUrl)}
            />
          ) : (
            /* Reserved-artwork fill — only ever when the record has no media. */
            <div className={styles.heroPlaceholder} aria-hidden="true">
              <span className={styles.heroGlyph}>ت</span>
            </div>
          )}

          <div className={styles.heroScrim} aria-hidden="true" />

          {watchUrl && (
            <button
              type="button"
              onClick={handleWatch}
              // Distinct from the action-row CTA and the sticky-bar CTA, which
              // trigger the same navigation — three identically named controls
              // are unusable with a screen reader's element list.
              aria-label={t("play")}
              className={styles.heroPlay}
            >
              <Play weight="fill" size={30} className={styles.heroPlayGlyph} />
            </button>
          )}

          <div className={styles.heroBottom}>
            <div className={styles.chipRow}>
              <span className={cn(styles.chip, styles.chipCategory)}>
                <span className={styles.chipDot} aria-hidden="true" />
                {t("category")}
              </span>

              {hasWin && (
                <span className={cn(styles.chip, styles.chipAwarded)}>
                  <Trophy weight="fill" size={12} />
                  {t("awarded")}
                </span>
              )}

              {film.ageRating && (
                <span className={cn(styles.chip, styles.chipAge)}>
                  <bdi>{film.ageRating}</bdi>
                </span>
              )}
            </div>

            <h1 className={styles.title}>
              <bdi>{film.title}</bdi>
            </h1>

            {metaParts.length > 0 && (
              <p className={styles.metaLine}>
                {metaParts.map((part, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && " · "}
                    {part}
                  </React.Fragment>
                ))}
              </p>
            )}
          </div>
        </section>

        <div className={styles.content}>
          {/* ---------------------------------------------------- actions */}
          {/* Primary first in DOM and visual order (they match at every
              width): watch, trailer, then the heart. Below the container
              breakpoint the watch pill takes its own full-width row. */}
          <div ref={actionsRef} className={styles.actions}>
            {watchUrl && (
              <button
                type="button"
                onClick={handleWatch}
                className={styles.watchButton}
              >
                <Play weight="fill" size={18} />
                {t("watch")}
              </button>
            )}

            {showTrailerButton && (
              <button
                type="button"
                onClick={handleTrailer}
                className={styles.trailerButton}
              >
                <FilmSlate size={17} />
                {t("trailer")}
              </button>
            )}
            <button
              type="button"
              onClick={toggleSaved}
              aria-pressed={saved}
              aria-label={saved ? t("removeFromWatchlist") : t("watchlist")}
              className={cn(
                styles.heartButton,
                saved && styles.heartButtonActive
              )}
            >
              <span className={styles.heartStack}>
                <Heart
                  size={22}
                  className={cn(
                    styles.heartOutline,
                    saved && styles.heartOutlineHidden
                  )}
                />
                <Heart
                  weight="fill"
                  size={22}
                  className={cn(
                    styles.heartFill,
                    saved && styles.heartFillVisible,
                    justSaved && "animate-watchlist-pulse"
                  )}
                />
              </span>
            </button>
          </div>

          {/* --------------------------------------------------- synopsis */}
          {synopsisText && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t("synopsis")}</h2>
              <p className={styles.synopsis}>{synopsisText}</p>
            </section>
          )}

          {/* ----------------------------------------------- distinctions */}
          {awards.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t("distinctions")}</h2>
              <div className={styles.rowList}>
                {awards.map((award, index) => (
                  <div
                    key={`${award.name}-${index}`}
                    className={styles.awardRow}
                  >
                    {/* A win is a gold FILLED trophy; a selection/nomination
                        is a muted outline one — otherwise the two read as the
                        same accolade. */}
                    <Trophy
                      weight={award.won ? "fill" : "regular"}
                      size={19}
                      className={cn(
                        styles.awardIcon,
                        !award.won && styles.awardIconMuted
                      )}
                    />
                    <span
                      className={cn(
                        styles.awardText,
                        !award.won && styles.awardTextMuted
                      )}
                    >
                      <bdi>
                        {[award.name, award.category]
                          .filter(Boolean)
                          .join(" — ")}
                        {award.year ? ` (${award.year})` : ""}
                      </bdi>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* --------------------------------------------- where to watch */}
          {streamingLinks.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t("whereToWatch")}</h2>
              <div className={styles.rowList}>
                {streamingLinks.map((link, index) => {
                  // `PlatformType` is a compile-time claim about CMS data, so
                  // ANY unmapped value — not just the literal "other" — falls
                  // back to the translated generic label rather than a blank.
                  const name =
                    PLATFORM_NAMES[link.platform] ?? t("otherPlatform")
                  const href = toSafeExternalUrl(link.url)
                  return (
                    <div
                      key={`${link.platform}-${index}`}
                      className={styles.streamingRow}
                    >
                      <div
                        className={styles.streamingLogo}
                        aria-hidden="true"
                      />
                      <div className={styles.streamingInfo}>
                        <div className={styles.streamingName}>
                          <bdi>{name}</bdi>
                        </div>
                      </div>
                      {/* No CTA for an unusable URL — a dead or `javascript:`
                          link must never become a live control. */}
                      {href && (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.streamingCta}
                        >
                          {t("watchOn")}
                          <ArrowUpRight size={13} />
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ------------------------------------------------------- cast */}
          {cast.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t("cast")}</h2>
              <div
                className={cn(
                  styles.scroller,
                  styles.castScroller,
                  "no-scrollbar"
                )}
                tabIndex={0}
                role="group"
                aria-label={t("cast")}
              >
                {cast.map((member, index) => {
                  const photoUrl = usableImage(
                    member.person.photo?.formats?.thumbnail?.url ||
                      member.person.photo?.url
                  )
                  return (
                    <div
                      key={`${member.person.slug}-${index}`}
                      className={styles.castItem}
                    >
                      <div className={styles.castAvatar}>
                        {photoUrl && (
                          <Image
                            src={photoUrl}
                            alt={member.person.name}
                            fill
                            sizes="88px"
                            className={styles.castPhoto}
                            onError={() => markImageFailed(photoUrl)}
                          />
                        )}
                      </div>
                      <div className={styles.castName}>
                        <bdi>{member.person.name}</bdi>
                      </div>
                      {member.role && (
                        <div className={styles.castRole}>
                          <bdi>{member.role}</bdi>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ---------------------------------------------------- related */}
          {relatedShorts.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t("related")}</h2>
              <div
                className={cn(
                  styles.scroller,
                  styles.relatedScroller,
                  "no-scrollbar"
                )}
                tabIndex={0}
                role="group"
                aria-label={t("related")}
              >
                {relatedShorts.map((short) => {
                  const posterUrl = usableImage(
                    short.poster?.formats?.medium?.url || short.poster?.url
                  )
                  // A CMS `0` / `null` must not render a literal "0" or a
                  // lone separator. Ratings are out of v1 — never rendered.
                  const year = positiveNumber(short.releaseYear)
                  const minutes = positiveNumber(short.duration)
                  return (
                    <Link
                      key={short.documentId}
                      href={`/shorts/${short.slug}`}
                      className={styles.relatedItem}
                    >
                      <div className={styles.relatedFrame}>
                        {posterUrl && (
                          <Image
                            src={posterUrl}
                            alt={short.title}
                            fill
                            sizes="160px"
                            className={styles.relatedPoster}
                            onError={() => markImageFailed(posterUrl)}
                          />
                        )}
                        {/* A genre, not the category: no category-hue dot. */}
                        {short.genres?.[0] && (
                          <span className={styles.relatedBadge}>
                            <bdi>{short.genres[0].name}</bdi>
                          </span>
                        )}
                        <div className={styles.relatedMetaBlock}>
                          {/* The title ellipsizes; `title` keeps the full text
                              recoverable. */}
                          <div
                            className={styles.relatedTitle}
                            title={short.title}
                          >
                            <bdi>{short.title}</bdi>
                          </div>
                          {(year !== null || minutes !== null) && (
                            <div className={styles.relatedSub}>
                              {year !== null && <bdi>{year}</bdi>}
                              {year !== null && minutes !== null && " · "}
                              {minutes !== null && (
                                <bdi>
                                  {formatMinutes(minutes)}
                                </bdi>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* -------------------------------------------------- sticky bar -- */}
      {watchUrl && (
        <div
          ref={stickyRef}
          aria-hidden={stickyVisible ? undefined : true}
          data-state={stickyVisible ? "visible" : "hidden"}
          className={cn(
            styles.stickyBar,
            !stickyVisible && styles.stickyBarHidden
          )}
        >
          <div className={styles.stickyInner}>
            <div className={styles.stickyInfo}>
              <div className={styles.stickyTitle} title={film.title}>
                <bdi>{film.title}</bdi>
              </div>
              {/* Availability is status: neutral text + icon, never the
                  category hue (Category Cameo Rule). */}
              <div className={styles.stickySub}>
                <CheckCircle size={14} aria-hidden="true" />
                <bdi>{availability}</bdi>
              </div>
            </div>
            <button
              type="button"
              onClick={handleWatch}
              // Same visible label as the action-row CTA; the accessible name
              // disambiguates the two.
              aria-label={t("watchFromBar")}
              className={styles.stickyCta}
            >
              <Play weight="fill" size={17} />
              {t("watch")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

ShortFilmDetail.displayName = "ShortFilmDetail"
