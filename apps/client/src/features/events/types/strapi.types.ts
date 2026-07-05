/**
 * Person data structure (director, cast member)
 */
export interface StrapiPerson {
  id: number
  documentId?: string
  name: string
  slug: string
  photo?: {
    url: string
    formats?: {
      thumbnail?: { url: string }
      small?: { url: string }
    }
  }
}

/**
 * Media image structure
 */
export interface StrapiMedia {
  url: string
  alternativeText?: string
  formats?: {
    thumbnail?: { url: string }
    small?: { url: string }
    medium?: { url: string }
    large?: { url: string }
  }
}

/**
 * City with optional region
 */
export interface StrapiCity {
  id: number
  documentId?: string
  name: string
  slug: string
  region?: {
    id: number
    name: string
    slug: string
  }
}

/**
 * Venue data structure
 */
export interface StrapiVenue {
  id: number
  documentId: string
  name: string
  slug: string
  address?: string
  coordinates?: {
    lat: number
    lng: number
  }
  phone?: string
  email?: string
  /** Legacy nested city (kept for consumers not yet migrated). */
  city?: StrapiCity
  /** Real geography relation on the venues plugin schema. */
  cityRef?: StrapiCity
  images?: StrapiMedia[]
}

/**
 * Genre data structure
 */
export interface StrapiGenre {
  id: number
  documentId?: string
  name: string
  slug: string
}

/**
 * Creative work data structure
 */
export interface StrapiCreativeWork {
  id: number
  documentId: string
  title: string
  originalTitle?: string
  slug: string
  type: "film" | "short-film" | "play" | "concert" | "exhibition"
  synopsis?: string
  duration?: number
  releaseYear?: number
  rating?: number
  language?: string
  country?: string
  poster?: StrapiMedia
  backdrop?: StrapiMedia
  genres?: StrapiGenre[]
  directors?: StrapiPerson[]
  cast?: StrapiPerson[]
}

/**
 * Real event category enum (events-manager plugin schema).
 * MVP scope is `movie_screening` only.
 */
export type StrapiEventCategory =
  | "movie_screening"
  | "theater_performance"
  | "concert"
  | "exhibition"
  | "other"

/**
 * Real event status enum (events-manager plugin schema).
 */
export type StrapiEventStatus =
  | "scheduled"
  | "cancelled"
  | "postponed"
  | "rescheduled"

/**
 * Screening (real events-manager plugin schema — schema.org ScreeningEvent).
 * This is the MVP cinema sub-event; `movie` links to a creative-work.
 *
 * NOTE: the public browse endpoint (Story 3.1a) populates `screenings` shallow
 * (`screenings: true`), so `movie` is typically NOT populated on curated-slice
 * reads — treat it as optional.
 */
export interface StrapiScreening {
  id: number
  documentId?: string
  order?: number
  startDateTime?: string
  videoFormat?: "standard" | "threeD" | "imax" | "fourDX" | "format70mm"
  audioLanguage?: string
  subtitleLanguage?: string
  price?: number
  ticketsAvailable?: number
  ticketsSold?: number
  movie?: StrapiCreativeWork
}

/**
 * Legacy showtime shape (kept for consumers not yet migrated to `StrapiScreening`).
 * @deprecated Use `StrapiScreening` — the real plugin relation is `screenings`.
 */
export interface StrapiShowtime {
  id: number
  documentId: string
  time: string
  format?: string
  language?: string
  subtitles?: string
  price: number
  ticketsAvailable: number
  ticketsSold: number
}

/**
 * Event data structure from the Strapi events-manager plugin.
 * This is a client-safe type definition (no server-only dependencies).
 *
 * Aligned to the REAL plugin schema (Story 3.1a public browse API): the primary
 * fields are `category`, `startDateTime`/`endDateTime`, `eventStatus`,
 * `screenings`, and `images`. The legacy fields below (`startDate`, `endDate`,
 * `status`, `creativeWork`, `showtimes`) are retained as optional for surfaces
 * (event detail, search, watchlist) that migrate under their own stories.
 */
export interface StrapiEvent {
  id: number
  documentId: string
  title: string
  slug: string
  description?: string
  /** Real schema: event category enum (MVP = movie_screening). */
  category?: StrapiEventCategory
  /** Real schema: event start (ISO datetime). */
  startDateTime?: string
  /** Real schema: event end (ISO datetime). */
  endDateTime?: string
  /** Real schema: event lifecycle status. */
  eventStatus?: StrapiEventStatus
  /** Real schema: cinema sub-events. */
  screenings?: StrapiScreening[]
  /** Real schema: event images (media, multiple). */
  images?: StrapiMedia[]
  featured: boolean
  createdAt: string
  updatedAt: string
  publishedAt: string
  locale: string
  venue?: StrapiVenue

  // Legacy fields (kept required to preserve back-compat with surfaces — event
  // detail, search, watchlist — that migrate under their own stories). The
  // public browse API no longer returns these; new homepage code reads the
  // real fields above.
  /** @deprecated Legacy — use `startDateTime`. */
  startDate: string
  /** @deprecated Legacy — use `endDateTime`. */
  endDate: string
  /** @deprecated Legacy — use `eventStatus`. */
  status: "draft" | "scheduled" | "active" | "completed" | "cancelled"
  /** @deprecated Legacy — the movie now lives on `screening.movie`. */
  creativeWork?: StrapiCreativeWork
  /** @deprecated Legacy — use `screenings`. */
  showtimes?: StrapiShowtime[]
}
