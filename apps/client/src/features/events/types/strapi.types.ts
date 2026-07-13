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
 * Geo point component (`shared.geo-point`) on the venues plugin schema.
 * Populated for the Story 3.8 map; the detail page renders text only.
 */
export interface StrapiGeoPoint {
  latitude: number
  longitude: number
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
  /** Real `shared.geo-point` component ({ latitude, longitude }) — Story 3.8 map. */
  geo?: StrapiGeoPoint
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
 * Fictional character portrayed in a creative work (`creative-works.character`).
 */
export interface StrapiCharacter {
  id?: number
  documentId?: string
  name: string
  slug?: string
}

/**
 * Cast component entry (`creative-works.cast`): an actor's portrayal of a
 * character. The real schema stores `cast` as a repeatable component with a
 * `person` relation (+ optional `character` and `billing`) — NOT a flat
 * `StrapiPerson[]`.
 */
export interface StrapiCastEntry {
  id?: number
  person: StrapiPerson
  character?: StrapiCharacter
  billing?: number
}

/**
 * Credit-role vocabulary (`creative-works.credit-role`). The `department`
 * discriminates crew (directors are `department === "directing"`).
 */
export interface StrapiCreditRole {
  id?: number
  documentId?: string
  name: string
  slug: string
  department?:
    | "directing"
    | "writing"
    | "production"
    | "camera"
    | "editing"
    | "sound"
    | "music"
    | "art"
    | "costume-makeup"
    | "lighting"
    | "stage"
    | "other"
}

/**
 * Credit component entry (`creative-works.credit`): a crew member's contribution
 * to a creative work. There is NO `directors` relation — directors are `credits`
 * whose `creditRole.department === "directing"`.
 */
export interface StrapiCreditEntry {
  id?: number
  person: StrapiPerson
  creditRole?: StrapiCreditRole
  customRole?: string
  billing?: number
}

/**
 * Video component entry (`common.video`) on a creative work. A trailer is an
 * entry with `videoType === "trailer"` (there is NO scalar `trailerUrl`).
 */
export interface StrapiVideo {
  id?: number
  url: string
  videoType?:
    | "trailer"
    | "teaser"
    | "clip"
    | "featurette"
    | "interview"
    | "behind-the-scenes"
    | "full-length"
  type?: "FULL_LENGTH" | "TEASER" | "CLIP"
}

/**
 * Creative work data structure.
 *
 * Aligned to the REAL creative-works plugin schema for the detail surface
 * (Story 3.7): `synopsis`, `ageRating`, `videos`, and the component-based
 * `cast`/`credits` graph. The legacy flat `directors?: StrapiPerson[]` is kept
 * (deprecated) because other, unmigrated surfaces (shorts, SEO JSON-LD, the
 * desktop/map detail variants) still read it.
 */
export interface StrapiCreativeWork {
  id: number
  documentId: string
  title: string
  originalTitle?: string
  slug: string
  type: "film" | "short-film" | "play" | "concert" | "exhibition"
  /** Localized synopsis (richtext). Real schema field. */
  synopsis?: string
  duration?: number
  releaseYear?: number
  rating?: number
  /** Classification (real schema enum). */
  ageRating?: "TP" | "PG12" | "PG16" | "PG18"
  language?: string
  country?: string
  poster?: StrapiMedia
  backdrop?: StrapiMedia
  genres?: StrapiGenre[]
  /** Real cast component graph (`cast[].person` + optional `character`). */
  cast?: StrapiCastEntry[]
  /** Real crew credits (`credits[]` with `creditRole.department`). */
  credits?: StrapiCreditEntry[]
  /** Real videos component (trailer = entry with `videoType === "trailer"`). */
  videos?: StrapiVideo[]
  /**
   * @deprecated Legacy flat directors relation — the real schema has none
   * (directors come from `credits` where `creditRole.department === "directing"`).
   * Retained only for unmigrated surfaces (shorts, SEO JSON-LD, desktop/map
   * detail variants).
   */
  directors?: StrapiPerson[]
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
  /** Derived server-side: true when the showtime is fully sold. */
  soldOut?: boolean
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

  // Legacy fields (now OPTIONAL because the Story 3.1a public browse API never
  // returns them). Consumers must treat these as possibly-absent — the real
  // fields above (`startDateTime`/`endDateTime`/`eventStatus`) are the source of
  // truth. Retained (deprecated) only for surfaces — event detail, search,
  // watchlist — that migrate under their own stories.
  /** @deprecated Legacy — use `startDateTime`. */
  startDate?: string
  /** @deprecated Legacy — use `endDateTime`. */
  endDate?: string
  /** @deprecated Legacy — use `eventStatus`. */
  status?: "draft" | "scheduled" | "active" | "completed" | "cancelled"
  /** @deprecated Legacy — the movie now lives on `screening.movie`. */
  creativeWork?: StrapiCreativeWork
  /** @deprecated Legacy — use `screenings`. */
  showtimes?: StrapiShowtime[]
}
