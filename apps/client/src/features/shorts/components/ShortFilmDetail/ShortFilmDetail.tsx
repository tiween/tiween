"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowUpRight,
  CaretLeft,
  CaretRight,
  FilmSlate,
  Heart,
  Play,
  ShareNetwork,
  Star,
  Trophy,
} from "@phosphor-icons/react"
import { useLocale, useTranslations } from "next-intl"

import type { PlatformType, ShortFilm } from "../../types"

import { cn } from "@/lib/utils"

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
 * Synopsis comes from Strapi (a trusted source) but may carry rich-text
 * markup; strip it so the detail page renders plain text.
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "")
}

/**
 * Normalize a CMS-supplied link to something safe to navigate to: a non-blank,
 * absolute `http(s)` URL. Anything else — an empty string, a relative fragment,
 * or a `javascript:` / `data:` scheme — yields `null` and is never opened or
 * used as an `href`.
 */
function toSafeExternalUrl(url: string | undefined | null): string | null {
  const trimmed = url?.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? trimmed
      : null
  } catch {
    return null
  }
}

/**
 * Open a (already validated) external URL in a new tab. A popup blocker makes
 * `window.open` return `null`, which would otherwise be a silent dead end — so
 * navigate the current tab instead.
 */
function openExternal(url: string): void {
  const safe = toSafeExternalUrl(url)
  if (!safe) return
  const opened = window.open(safe, "_blank", "noopener,noreferrer")
  if (!opened) window.location.href = safe
}

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

  const heroMediaUrl =
    film.backdrop?.formats?.large?.url ||
    film.backdrop?.url ||
    film.poster?.formats?.large?.url ||
    film.poster?.url ||
    null

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

    try {
      await navigator.clipboard?.writeText(shareUrl)
    } catch {
      // Clipboard permission denied / unavailable — nothing to surface, and
      // never an unhandled rejection.
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
    else router.push(`/${locale}/shorts`)
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
        {film.duration} {t("minutes")}
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
    ? t("availableDuration", { duration: String(film.duration) })
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
          <div className={styles.actions}>
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
                  const photoUrl =
                    member.person.photo?.formats?.thumbnail?.url ||
                    member.person.photo?.url ||
                    null
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
                  const posterUrl =
                    short.poster?.formats?.medium?.url ||
                    short.poster?.url ||
                    null
                  return (
                    <Link
                      key={short.documentId}
                      href={`/${locale}/shorts/${short.slug}`}
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
                          />
                        )}
                        {short.genres?.[0] && (
                          <span className={styles.relatedBadge}>
                            <span
                              className={styles.chipDot}
                              aria-hidden="true"
                            />
                            <bdi>{short.genres[0].name}</bdi>
                          </span>
                        )}
                        <div className={styles.relatedMetaBlock}>
                          {/* A CMS null would otherwise render a lone star
                              with no number beside it. */}
                          {typeof short.rating === "number" && (
                            <div className={styles.relatedRating}>
                              <Star weight="fill" size={11} />
                              <bdi>{short.rating.toFixed(1)}</bdi>
                            </div>
                          )}
                          {/* The title ellipsizes; `title` keeps the full text
                              recoverable. */}
                          <div
                            className={styles.relatedTitle}
                            title={short.title}
                          >
                            <bdi>{short.title}</bdi>
                          </div>
                          {(short.releaseYear || short.duration) && (
                            <div className={styles.relatedSub}>
                              {short.releaseYear && (
                                <bdi>{short.releaseYear}</bdi>
                              )}
                              {short.releaseYear && short.duration && " · "}
                              {short.duration && (
                                <bdi>
                                  {short.duration} {t("minutes")}
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
        <div className={styles.stickyBar}>
          <div className={styles.stickyInner}>
            <div className={styles.stickyInfo}>
              <div className={styles.stickyTitle} title={film.title}>
                <bdi>{film.title}</bdi>
              </div>
              <div className={styles.stickySub}>
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
