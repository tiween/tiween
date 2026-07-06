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
 * Map the real event `category` enum to a Schema.org Event @type.
 */
function mapCategoryToEventType(category?: string): EventSchema["@type"] {
  switch (category) {
    case "movie_screening":
      return "ScreeningEvent"
    case "theater_performance":
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
 * Build GeoCoordinates from the venue's `{ lat, lng }` object.
 */
function buildGeo(coords?: {
  lat: number
  lng: number
}): GeoCoordinatesSchema | undefined {
  if (!coords || isNaN(coords.lat) || isNaN(coords.lng)) return undefined
  return {
    "@type": "GeoCoordinates",
    latitude: coords.lat,
    longitude: coords.lng,
  }
}

/**
 * Generate JSON-LD structured data for a Strapi event.
 *
 * Reads the REAL events-manager schema first (`startDateTime`, `endDateTime`,
 * `eventStatus`, `category`, `screenings`, `images`) and falls back to the
 * deprecated legacy fields where present so both the curated homepage and the
 * event-detail page produce valid output.
 */
export function generateEventJsonLd(
  event: StrapiEvent,
  baseUrl: string
): EventSchema {
  const work = event.creativeWork
  const venue = event.venue

  // Ticket prices: real `screenings` first, then legacy `showtimes`.
  const priced = [...(event.screenings ?? []), ...(event.showtimes ?? [])]
  const prices = priced
    .map((s) => s.price)
    .filter((p): p is number => typeof p === "number")
  const minPrice = prices.length > 0 ? Math.min(...prices) : undefined
  // Unknown inventory (missing `ticketsAvailable`) is treated as available —
  // absence of data is not evidence of a sell-out. Only an explicit 0 across
  // every priced screening marks the event SoldOut.
  const hasInventory = priced.some(
    (s) => s.ticketsAvailable === undefined || s.ticketsAvailable > 0
  )

  // Build offer(s)
  const offers: OfferSchema[] = []
  if (minPrice !== undefined) {
    offers.push({
      "@type": "Offer",
      url: `${baseUrl}/events/${event.documentId}`,
      price: minPrice,
      priceCurrency: "TND",
      availability: hasInventory ? "InStock" : "SoldOut",
    })
  }

  // Build location (support real `cityRef` and legacy `city`)
  const city = venue?.cityRef ?? venue?.city
  const location: PlaceSchema | undefined = venue
    ? {
        "@type": "Place",
        name: venue.name,
        address: city
          ? {
              "@type": "PostalAddress",
              streetAddress: venue.address,
              addressLocality: city.name,
              addressRegion: city.region?.name,
              addressCountry: "Tunisia",
            }
          : venue.address,
        geo: buildGeo(venue.coordinates),
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
    // Real cast entries carry the actor under `.person` (component graph edge).
    work.cast.forEach((entry) => {
      const actor = entry.person
      if (!actor?.name) return
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
        actor: work.cast
          ?.filter((a) => a.person?.name)
          .map((a) => ({
            "@type": "Person" as const,
            name: a.person!.name,
          })),
        genre: work.genres?.map((g) => g.name),
        duration: minutesToISO8601Duration(work.duration),
        dateCreated: work.releaseYear?.toString(),
        inLanguage: work.language,
        countryOfOrigin: work.country,
      }
    : undefined

  // Get image URLs (real event `images` first, then legacy work/venue media).
  // schema.org requires ABSOLUTE image URLs; Strapi local media URLs are
  // relative (`/uploads/...`), so prefix them with `baseUrl` (mirrors the offer
  // URL a few lines up). A relative `image` is dropped from the rich result.
  const toAbsoluteUrl = (url: string): string =>
    /^https?:\/\//i.test(url) ? url : `${baseUrl}${url}`
  const images: string[] = []
  event.images?.forEach((img) => {
    if (img.url) images.push(toAbsoluteUrl(img.url))
  })
  if (work?.poster?.url) images.push(toAbsoluteUrl(work.poster.url))
  if (work?.backdrop?.url) images.push(toAbsoluteUrl(work.backdrop.url))
  if (venue?.images) {
    venue.images.forEach((img) => {
      if (img.url) images.push(toAbsoluteUrl(img.url))
    })
  }

  const startDate = event.startDateTime ?? event.startDate ?? ""
  const endDate = event.endDateTime ?? event.endDate
  // schema.org EventStatusType — map the real lifecycle status. `postponed` and
  // `rescheduled` must map to their own statuses, not silently degrade to
  // `EventScheduled` (which would misreport the event to search engines).
  const lifecycleStatus = event.eventStatus ?? event.status
  const eventStatusSchema: EventSchema["eventStatus"] =
    lifecycleStatus === "cancelled"
      ? "EventCancelled"
      : lifecycleStatus === "postponed"
        ? "EventPostponed"
        : lifecycleStatus === "rescheduled"
          ? "EventRescheduled"
          : "EventScheduled"
  const eventType = event.category
    ? mapCategoryToEventType(event.category)
    : mapEventType(work?.type)

  return {
    "@context": "https://schema.org",
    "@type": eventType,
    name: work?.title || event.title,
    description: work?.synopsis ?? event.description,
    image: images.length > 0 ? images : undefined,
    startDate,
    endDate,
    eventStatus: eventStatusSchema,
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
