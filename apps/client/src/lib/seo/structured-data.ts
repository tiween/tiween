import type { StrapiEvent } from "@/features/events/types"

/**
 * Schema.org Event type for cultural events
 * @see https://schema.org/Event
 */
export interface EventSchema {
  "@context": "https://schema.org"
  "@type":
    | "Event"
    | "ScreeningEvent"
    | "TheaterEvent"
    | "MusicEvent"
    | "ExhibitionEvent"
  name: string
  description?: string
  image?: string | string[]
  startDate: string
  endDate?: string
  eventStatus?:
    | "EventScheduled"
    | "EventCancelled"
    | "EventPostponed"
    | "EventRescheduled"
  eventAttendanceMode?:
    | "OfflineEventAttendanceMode"
    | "OnlineEventAttendanceMode"
    | "MixedEventAttendanceMode"
  location?: PlaceSchema
  offers?: OfferSchema | OfferSchema[]
  performer?: PersonSchema | PersonSchema[]
  organizer?: OrganizationSchema
  duration?: string // ISO 8601 duration format (e.g., "PT2H30M")
  inLanguage?: string
  workPerformed?: CreativeWorkSchema
}

/**
 * Schema.org Place for venues
 */
export interface PlaceSchema {
  "@type": "Place"
  name: string
  address?: PostalAddressSchema | string
  geo?: GeoCoordinatesSchema
  telephone?: string
  url?: string
}

/**
 * Schema.org PostalAddress
 */
export interface PostalAddressSchema {
  "@type": "PostalAddress"
  streetAddress?: string
  addressLocality?: string // City
  addressRegion?: string // Region/State
  postalCode?: string
  addressCountry?: string
}

/**
 * Schema.org GeoCoordinates
 */
export interface GeoCoordinatesSchema {
  "@type": "GeoCoordinates"
  latitude: number
  longitude: number
}

/**
 * Schema.org Offer for ticket pricing
 */
export interface OfferSchema {
  "@type": "Offer"
  url?: string
  price: number
  priceCurrency: string
  availability?: "InStock" | "SoldOut" | "PreOrder" | "LimitedAvailability"
  validFrom?: string
  validThrough?: string
}

/**
 * Schema.org Person for directors, cast, performers
 */
export interface PersonSchema {
  "@type": "Person"
  name: string
  url?: string
  image?: string
}

/**
 * Schema.org Organization
 */
export interface OrganizationSchema {
  "@type": "Organization"
  name: string
  url?: string
  logo?: string
}

/**
 * Schema.org CreativeWork for films, plays, etc.
 */
export interface CreativeWorkSchema {
  "@type": "Movie" | "Play" | "MusicComposition" | "CreativeWork"
  name: string
  director?: PersonSchema | PersonSchema[]
  actor?: PersonSchema | PersonSchema[]
  genre?: string | string[]
  duration?: string
  dateCreated?: string
  inLanguage?: string
  countryOfOrigin?: string
}

/**
 * Map Strapi creative work type to Schema.org Event type
 */
function mapEventType(type?: string): EventSchema["@type"] {
  switch (type) {
    case "film":
    case "short-film":
      return "ScreeningEvent"
    case "play":
      return "TheaterEvent"
    case "concert":
      return "MusicEvent"
    case "exhibition":
      return "ExhibitionEvent"
    default:
      return "Event"
  }
}

/**
 * Map Strapi creative work type to Schema.org CreativeWork type
 */
function mapCreativeWorkType(type?: string): CreativeWorkSchema["@type"] {
  switch (type) {
    case "film":
    case "short-film":
      return "Movie"
    case "play":
      return "Play"
    case "concert":
      return "MusicComposition"
    default:
      return "CreativeWork"
  }
}

/**
 * Convert minutes to ISO 8601 duration format
 * @example 90 -> "PT1H30M"
 */
function minutesToISO8601Duration(minutes?: number): string | undefined {
  if (!minutes) return undefined
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0 && mins > 0) return `PT${hours}H${mins}M`
  if (hours > 0) return `PT${hours}H`
  return `PT${mins}M`
}

/**
 * Parse coordinates string "lat,lng" to GeoCoordinates
 */
function parseCoordinates(coords?: string): GeoCoordinatesSchema | undefined {
  if (!coords) return undefined
  const [lat, lng] = coords.split(",").map(Number)
  if (isNaN(lat) || isNaN(lng)) return undefined
  return {
    "@type": "GeoCoordinates",
    latitude: lat,
    longitude: lng,
  }
}

/**
 * Generate JSON-LD structured data for a Strapi event
 */
export function generateEventJsonLd(
  event: StrapiEvent,
  baseUrl: string
): EventSchema {
  const work = event.creativeWork
  const venue = event.venue

  // Get minimum price from showtimes
  const minPrice = event.showtimes?.reduce((min, st) => {
    return st.price < min ? st.price : min
  }, event.showtimes[0]?.price || 0)

  // Get max price for range display
  const maxPrice = event.showtimes?.reduce((max, st) => {
    return st.price > max ? st.price : max
  }, 0)

  // Build offer(s)
  const offers: OfferSchema[] = []
  if (event.showtimes && event.showtimes.length > 0) {
    // If all same price, single offer; otherwise aggregate
    if (minPrice === maxPrice) {
      offers.push({
        "@type": "Offer",
        url: `${baseUrl}/events/${event.documentId}`,
        price: minPrice,
        priceCurrency: "TND",
        availability: event.showtimes.some((st) => st.ticketsAvailable > 0)
          ? "InStock"
          : "SoldOut",
      })
    } else {
      // Multiple price tiers - show lowest as main offer
      offers.push({
        "@type": "Offer",
        url: `${baseUrl}/events/${event.documentId}`,
        price: minPrice,
        priceCurrency: "TND",
        availability: "InStock",
      })
    }
  }

  // Build location
  const location: PlaceSchema | undefined = venue
    ? {
        "@type": "Place",
        name: venue.name,
        address: venue.city
          ? {
              "@type": "PostalAddress",
              streetAddress: venue.address,
              addressLocality: venue.city.name,
              addressRegion: venue.city.region?.name,
              addressCountry: "Tunisia",
            }
          : venue.address,
        geo: parseCoordinates(venue.coordinates),
        telephone: venue.phone,
      }
    : undefined

  // Build performers/directors
  const performers: PersonSchema[] = []
  if (work?.directors) {
    work.directors.forEach((director) => {
      performers.push({
        "@type": "Person",
        name: director.name,
        url: director.slug ? `${baseUrl}/people/${director.slug}` : undefined,
      })
    })
  }
  if (work?.cast) {
    work.cast.forEach((actor) => {
      performers.push({
        "@type": "Person",
        name: actor.name,
        url: actor.slug ? `${baseUrl}/people/${actor.slug}` : undefined,
      })
    })
  }

  // Build creative work performed
  const workPerformed: CreativeWorkSchema | undefined = work
    ? {
        "@type": mapCreativeWorkType(work.type),
        name: work.title,
        director: work.directors?.map((d) => ({
          "@type": "Person" as const,
          name: d.name,
        })),
        actor: work.cast?.map((a) => ({
          "@type": "Person" as const,
          name: a.name,
        })),
        genre: work.genres?.map((g) => g.name),
        duration: minutesToISO8601Duration(work.duration),
        dateCreated: work.releaseYear?.toString(),
        inLanguage: work.language,
        countryOfOrigin: work.country,
      }
    : undefined

  // Get image URLs
  const images: string[] = []
  if (work?.poster?.url) images.push(work.poster.url)
  if (work?.backdrop?.url) images.push(work.backdrop.url)
  if (venue?.images) {
    venue.images.forEach((img) => {
      if (img.url) images.push(img.url)
    })
  }

  return {
    "@context": "https://schema.org",
    "@type": mapEventType(work?.type),
    name: work?.title || event.title,
    description: work?.synopsis,
    image: images.length > 0 ? images : undefined,
    startDate: event.startDate,
    endDate: event.endDate,
    eventStatus:
      event.status === "cancelled" ? "EventCancelled" : "EventScheduled",
    eventAttendanceMode: "OfflineEventAttendanceMode",
    location,
    offers:
      offers.length > 0
        ? offers.length === 1
          ? offers[0]
          : offers
        : undefined,
    performer: performers.length > 0 ? performers : undefined,
    duration: minutesToISO8601Duration(work?.duration),
    inLanguage: work?.language,
    workPerformed,
    organizer: {
      "@type": "Organization",
      name: "Tiween",
      url: baseUrl,
    },
  }
}

/**
 * Generate JSON-LD for breadcrumb navigation
 */
export function generateBreadcrumbJsonLd(
  items: Array<{ name: string; url: string }>,
  baseUrl: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${baseUrl}${item.url}`,
    })),
  }
}

/**
 * Generate JSON-LD for organization (site-wide)
 */
export function generateOrganizationJsonLd(baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Tiween",
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description:
      "Tiween est la plateforme de billetterie culturelle en Tunisie. Découvrez les films, pièces de théâtre, concerts et expositions près de chez vous.",
    sameAs: [
      "https://facebook.com/tiween",
      "https://instagram.com/tiween",
      "https://twitter.com/tiween",
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Tunis",
      addressCountry: "Tunisia",
    },
  }
}

/**
 * Generate JSON-LD for website (site-wide)
 */
export function generateWebsiteJsonLd(baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Tiween",
    url: baseUrl,
    description:
      "Tiween est la plateforme de billetterie culturelle en Tunisie.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
}
