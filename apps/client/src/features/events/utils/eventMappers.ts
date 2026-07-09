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
import type { ShowtimeFormat } from "../../tickets/components/ShowtimeButton"
import type { FilmHeroEvent } from "../components/FilmHero"
import type { EventCardEvent } from "../types/event.types"
import type {
  StrapiCreativeWork,
  StrapiEvent,
  StrapiEventCategory,
  StrapiMedia,
  StrapiScreening,
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

/**
 * The film for a `movie_screening` event = `screenings[0].movie` (one event =
 * one film, many screenings). `undefined` when no screening carries a populated
 * movie (browse endpoint) or the event has no screenings.
 */
export function getEventFilm(
  event: StrapiEvent
): StrapiCreativeWork | undefined {
  return event.screenings?.find((s) => s?.movie)?.movie
}

/** Poster URL — prefers the legacy movie poster, else the event's own image. */
export function getEventPosterUrl(event: StrapiEvent): string | undefined {
  const poster = event.creativeWork?.poster
  if (poster) {
    return poster.formats?.medium?.url ?? poster.url
  }
  return firstImageUrl(event.images, "medium")
}

/**
 * Backdrop URL — prefers the real film (`screenings[0].movie`) backdrop/poster,
 * then the legacy `creativeWork`, then the event's own image.
 */
export function getEventBackdropUrl(event: StrapiEvent): string | undefined {
  const film = getEventFilm(event)
  if (film?.backdrop?.url) return film.backdrop.url
  if (film?.poster) return film.poster.formats?.large?.url ?? film.poster.url
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
 *
 * Movie-level metadata (genres/rating/duration/year) is read from the real film
 * (`screenings[0].movie`), which is only populated on the deep detail read
 * (`DETAIL_POPULATE`); on the shallow curated browse read it is absent, so those
 * fields fall back to `undefined`.
 */
export function toFilmHeroEvent(
  event: StrapiEvent,
  locale: string = "fr"
): FilmHeroEvent {
  const film = getEventFilm(event)
  return {
    id: event.documentId,
    title: film?.title || event.title,
    backdropUrl: getEventBackdropUrl(event),
    category: mapEventCategoryLabel(event, locale),
    genres: film?.genres?.map((g) => g.name),
    rating: film?.rating ?? undefined,
    duration: film?.duration,
    year: film?.releaseYear,
    venueCount: event.venue ? 1 : undefined,
  }
}

// ---------------------------------------------------------------------------
// Event detail mapping (Story 3.7)
// ---------------------------------------------------------------------------

/** A person flattened for the detail view (cast member or director). */
export interface DetailPerson {
  name: string
  photoUrl?: string
  /** Character portrayed (cast) — omitted for directors. */
  role?: string
}

/** A single screening flattened into a tappable showtime for the detail view. */
export interface DetailShowtime {
  /** Screening `documentId` (the ticketing entrypoint key). */
  id: string
  /** ISO `startDateTime` (the view formats the clock time). */
  time: string
  price?: number
  formats: ShowtimeFormat[]
  status: "available" | "sold-out"
}

/** Resolved venue block for the detail view. */
export interface DetailVenue {
  /** Venue `documentId` (stable key for the map marker / directions). */
  documentId: string
  name: string
  address?: string
  city?: string
  region?: string
  /** Latitude — set only when the venue `geo` carries finite coordinates. */
  latitude?: number
  /** Longitude — set only when the venue `geo` carries finite coordinates. */
  longitude?: number
}

/**
 * Presentation model for `EventDetailPage`, derived purely from a real
 * `StrapiEvent` (Story 3.1a schema, deep-populated by `DETAIL_POPULATE`).
 */
export interface EventDetailData {
  documentId: string
  title: string
  originalTitle?: string
  synopsis: string
  backdropUrl?: string
  posterUrl?: string
  category: string
  genres: string[]
  rating?: number
  duration?: number
  year?: number
  ageRating?: string
  trailerUrl?: string
  venue?: DetailVenue
  showtimes: DetailShowtime[]
  cast: DetailPerson[]
  directors: DetailPerson[]
  minPrice?: number
  currency: string
}

/**
 * Video-format → premium badge. `standard`/`format70mm` contribute no badge
 * (there is no `ShowtimeFormat` token for them — unknowns are omitted, per the
 * best-effort contract).
 */
const VIDEO_FORMAT_BADGE: Partial<
  Record<NonNullable<StrapiScreening["videoFormat"]>, ShowtimeFormat>
> = {
  threeD: "3D",
  imax: "IMAX",
  fourDX: "4DX",
}

/**
 * French dub languages: an audio track in one of these, with no subtitles, is a
 * French-dubbed version (`VF` = Version Française). Matched case-insensitively
 * against the free-text `audioLanguage`. Non-French audio with no subtitles is
 * treated as the original version (`VO`) — tagging e.g. an Arabic track `VF`
 * would be factually wrong.
 */
const FRENCH_DUB_LANGUAGES = new Set([
  "fr",
  "fra",
  "fre",
  "french",
  "français",
  "francais",
])

function hasText(value?: string | null): value is string {
  return typeof value === "string" && value.trim().length > 0
}

/** Strip HTML/markup tags and collapse whitespace from a richtext string. */
export function stripMarkup(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Derive the `ShowtimeFormat[]` badges for a screening from its `videoFormat`
 * and audio/subtitle pair:
 * - premium video format → `3D` / `IMAX` / `4DX` (standard/70mm omitted);
 * - subtitles present ⇒ `VOST`;
 * - else a local-dub audio track ⇒ `VF`;
 * - else an original audio track (no subs) ⇒ `VO`.
 *
 * Best-effort: unknown/absent values contribute no badge and never throw.
 */
export function deriveScreeningFormats(
  screening: Pick<
    StrapiScreening,
    "videoFormat" | "audioLanguage" | "subtitleLanguage"
  >
): ShowtimeFormat[] {
  const formats: ShowtimeFormat[] = []

  if (screening.videoFormat) {
    const badge = VIDEO_FORMAT_BADGE[screening.videoFormat]
    if (badge) formats.push(badge)
  }

  if (hasText(screening.subtitleLanguage)) {
    formats.push("VOST")
  } else if (hasText(screening.audioLanguage)) {
    const audio = screening.audioLanguage.trim().toLowerCase()
    formats.push(FRENCH_DUB_LANGUAGES.has(audio) ? "VF" : "VO")
  }

  return formats
}

/** Poster URL for the detail view — real film poster, else the event image. */
function getDetailPosterUrl(
  film: StrapiCreativeWork | undefined,
  event: StrapiEvent
): string | undefined {
  if (film?.poster) {
    return film.poster.formats?.medium?.url ?? film.poster.url
  }
  return firstImageUrl(event.images, "medium")
}

/** Flatten a cast entry / credit entry `person` into a `DetailPerson`. */
function toDetailPerson(
  person: { name?: string; photo?: { url?: string } } | undefined,
  role?: string
): DetailPerson | null {
  if (!person || !hasText(person.name)) return null
  return {
    name: person.name,
    photoUrl: person.photo?.url,
    ...(hasText(role) ? { role } : {}),
  }
}

/**
 * Pure, dependency-free (no `server-only`, no React) mapper from a real
 * deep-populated `StrapiEvent` to the `EventDetailData` the detail page renders.
 *
 * Resilient by contract: an event with no screenings / no movie / no venue /
 * no cast maps without throwing — the corresponding section is simply empty.
 */
export function toEventDetail(
  event: StrapiEvent,
  locale: string = "fr"
): EventDetailData {
  const film = getEventFilm(event)
  const screenings = Array.isArray(event.screenings) ? event.screenings : []

  // Showtimes: every screening (with a stable id) sorted by start instant asc.
  const showtimes: DetailShowtime[] = screenings
    .filter((s): s is StrapiScreening => Boolean(s?.documentId))
    .map((s) => ({
      id: s.documentId as string,
      time: s.startDateTime ?? "",
      price: typeof s.price === "number" ? s.price : undefined,
      formats: deriveScreeningFormats(s),
      status:
        typeof s.ticketsAvailable === "number" && s.ticketsAvailable <= 0
          ? ("sold-out" as const)
          : ("available" as const),
    }))
    .sort((a, b) => a.time.localeCompare(b.time))

  // Cast: `movie.cast[].person` ordered by billing (lower = billed first).
  const cast: DetailPerson[] = [...(film?.cast ?? [])]
    .sort((a, b) => (a.billing ?? 99) - (b.billing ?? 99))
    .map((entry) => toDetailPerson(entry.person, entry.character?.name))
    .filter((p): p is DetailPerson => p !== null)

  // Directors: `movie.credits[]` where the credit-role is in the directing
  // department (or the role slug is `director`), ordered by billing.
  const directors: DetailPerson[] = [...(film?.credits ?? [])]
    .filter(
      (c) =>
        c.creditRole?.department === "directing" ||
        c.creditRole?.slug === "director"
    )
    .sort((a, b) => (a.billing ?? 99) - (b.billing ?? 99))
    .map((entry) => toDetailPerson(entry.person))
    .filter((p): p is DetailPerson => p !== null)

  // Trailer: a `movie.videos[]` entry with `videoType === "trailer"`.
  const trailerUrl = film?.videos?.find((v) => v.videoType === "trailer")?.url

  // Venue block: address + city (cityRef) + region (cityRef.region) + geo.
  // Coordinates: accept only finite, in-range values (Strapi decimals may
  // arrive as numeric strings, hence `Number(...)`); reject the null-island
  // default `(0,0)` and out-of-range values so the map and the directions
  // deep-link never point the user at the wrong place.
  const venueSource = event.venue
  const lat = Number(venueSource?.geo?.latitude)
  const lng = Number(venueSource?.geo?.longitude)
  const hasCoords =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  const venue: DetailVenue | undefined = venueSource
    ? {
        documentId: venueSource.documentId,
        name: venueSource.name,
        address: hasText(venueSource.address) ? venueSource.address : undefined,
        city: venueSource.cityRef?.name ?? venueSource.city?.name,
        region:
          venueSource.cityRef?.region?.name ?? venueSource.city?.region?.name,
        ...(hasCoords ? { latitude: lat, longitude: lng } : {}),
      }
    : undefined

  return {
    documentId: event.documentId,
    title: film?.title || event.title,
    originalTitle:
      film && hasText(film.originalTitle) && film.originalTitle !== film.title
        ? film.originalTitle
        : undefined,
    synopsis: stripMarkup(film?.synopsis || event.description || ""),
    backdropUrl: getEventBackdropUrl(event),
    posterUrl: getDetailPosterUrl(film, event),
    category: mapEventCategoryLabel(event, locale),
    genres: film?.genres?.map((g) => g.name) ?? [],
    rating: typeof film?.rating === "number" ? film.rating : undefined,
    duration: film?.duration,
    year: film?.releaseYear,
    ageRating: film?.ageRating,
    trailerUrl,
    venue,
    showtimes,
    cast,
    directors,
    minPrice: getMinEventPrice(event),
    currency: DEFAULT_CURRENCY,
  }
}
