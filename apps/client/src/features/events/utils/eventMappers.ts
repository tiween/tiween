/**
 * Pure mappers from the real Strapi events-manager `StrapiEvent` (Story 3.1a
 * public browse API shape) to the presentation types consumed by the homepage
 * UI (`EventCardEvent`, `FilmHeroEvent`).
 *
 * These are deliberately dependency-free (no `server-only`, no React) so the
 * curated-slice mapping can be unit-tested in isolation. All fields are read
 * defensively: an event with no screenings / images / venue must map without
 * throwing (empty-slice + partial-data resilience — see spec I/O matrix).
 */
import type { FilmHeroEvent } from "../components/FilmHero"
import type { EventCardEvent } from "../types/event.types"
import type {
  StrapiEvent,
  StrapiEventCategory,
  StrapiMedia,
} from "../types/strapi.types"

import { mapTypeToCategory } from "./categoryMapper"

const DEFAULT_CURRENCY = "TND"

/** Localized display labels for the real event `category` enum (FR / EN / AR). */
const CATEGORY_LABELS: Record<string, Record<StrapiEventCategory, string>> = {
  fr: {
    movie_screening: "Cinéma",
    theater_performance: "Théâtre",
    concert: "Musique",
    exhibition: "Expositions",
    other: "Événement",
  },
  en: {
    movie_screening: "Cinema",
    theater_performance: "Theater",
    concert: "Music",
    exhibition: "Exhibitions",
    other: "Event",
  },
  ar: {
    movie_screening: "سينما",
    theater_performance: "مسرح",
    concert: "موسيقى",
    exhibition: "معارض",
    other: "فعالية",
  },
}

/**
 * Map the real event `category` enum to a localized display label.
 * `locale` is optional and defaults to French (the app's default locale) so
 * callers that don't yet thread a locale keep the previous behavior.
 */
export function mapEventCategoryLabel(
  event: StrapiEvent,
  locale: string = "fr"
): string {
  const byCategory = CATEGORY_LABELS[locale] ?? CATEGORY_LABELS.fr!

  if (event.category && byCategory[event.category]) {
    return byCategory[event.category]
  }

  // Legacy fallback: derive from the (deprecated) creativeWork type.
  return mapTypeToCategory(event.creativeWork?.type)
}

/** Event start instant — real `startDateTime`, falling back to legacy `startDate`. */
export function getEventStartDate(event: StrapiEvent): string {
  return event.startDateTime ?? event.startDate ?? ""
}

/** Lowest screening/showtime price for the event, or `undefined` when none. */
export function getMinEventPrice(event: StrapiEvent): number | undefined {
  const prices: number[] = []

  for (const screening of event.screenings ?? []) {
    if (typeof screening?.price === "number") prices.push(screening.price)
  }
  // Legacy showtimes fallback (consumers not yet migrated).
  for (const showtime of event.showtimes ?? []) {
    if (typeof showtime?.price === "number") prices.push(showtime.price)
  }

  if (prices.length === 0) return undefined
  return Math.min(...prices)
}

function firstImageUrl(
  images: StrapiMedia[] | undefined,
  preferred: keyof NonNullable<StrapiMedia["formats"]>
): string | undefined {
  const image = images?.[0]
  if (!image) return undefined
  return image.formats?.[preferred]?.url ?? image.url
}

/** Poster URL — prefers the legacy movie poster, else the event's own image. */
export function getEventPosterUrl(event: StrapiEvent): string | undefined {
  const poster = event.creativeWork?.poster
  if (poster) {
    return poster.formats?.medium?.url ?? poster.url
  }
  return firstImageUrl(event.images, "medium")
}

/** Backdrop URL — prefers legacy backdrop/poster, else the event's own image. */
export function getEventBackdropUrl(event: StrapiEvent): string | undefined {
  const work = event.creativeWork
  if (work?.backdrop?.url) return work.backdrop.url
  if (work?.poster) return work.poster.formats?.large?.url ?? work.poster.url
  return firstImageUrl(event.images, "large")
}

/** Best-available venue name for the event ("" when the venue is absent). */
export function getEventVenueName(event: StrapiEvent): string {
  return event.venue?.name ?? ""
}

/**
 * Map a real `StrapiEvent` to the flat `EventCardEvent` consumed by `EventCard`.
 */
export function toEventCardEvent(
  event: StrapiEvent,
  locale: string = "fr"
): EventCardEvent {
  return {
    id: event.documentId,
    title: event.creativeWork?.title || event.title,
    posterUrl: getEventPosterUrl(event),
    category: mapEventCategoryLabel(event, locale),
    venueName: getEventVenueName(event),
    date: getEventStartDate(event),
    price: getMinEventPrice(event),
    currency: DEFAULT_CURRENCY,
  }
}

/**
 * Map a real `StrapiEvent` to the `FilmHeroEvent` consumed by `FilmHero`.
 * Movie-level metadata (genres/rating/duration/year) only appears when the
 * legacy `creativeWork` relation happens to be populated; the curated browse
 * endpoint does not populate it, so those fields are typically `undefined`.
 */
export function toFilmHeroEvent(
  event: StrapiEvent,
  locale: string = "fr"
): FilmHeroEvent {
  const work = event.creativeWork
  return {
    id: event.documentId,
    title: work?.title || event.title,
    backdropUrl: getEventBackdropUrl(event),
    category: mapEventCategoryLabel(event, locale),
    genres: work?.genres?.map((g) => g.name),
    rating: work?.rating,
    duration: work?.duration,
    year: work?.releaseYear,
    venueCount: event.venue ? 1 : undefined,
  }
}
