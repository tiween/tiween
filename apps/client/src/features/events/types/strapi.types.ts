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
  city?: StrapiCity
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
 * Showtime data structure
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
 * Event data structure from Strapi events-manager plugin
 * This is a client-safe type definition (no server-only dependencies)
 */
export interface StrapiEvent {
  id: number
  documentId: string
  title: string
  slug: string
  description?: string
  startDate: string
  endDate: string
  status: "draft" | "scheduled" | "active" | "completed" | "cancelled"
  featured: boolean
  createdAt: string
  updatedAt: string
  publishedAt: string
  locale: string
  venue?: StrapiVenue
  creativeWork?: StrapiCreativeWork
  showtimes?: StrapiShowtime[]
}
