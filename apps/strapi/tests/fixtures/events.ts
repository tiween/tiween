/**
 * Test fixtures for events-manager content types.
 *
 * Uses Strapi v5 Document Service API (`strapi.documents(uid)`) — NOT the
 * deprecated v4 Entity Service. This keeps lifecycle hooks firing the same
 * way as production code.
 */
import type { Core } from "@strapi/strapi"

const EVENT_UID = "plugin::events-manager.event"
const SCREENING_UID = "plugin::events-manager.screening"
const VENUE_UID = "plugin::venues.venue"
// The catalog of record is the unified creative-work (2C.3 consolidation).
// A screening's `movie` field now targets plugin::creative-works.creative-work,
// so the "movie" fixture seeds a creative-work with type: "film".
const WORK_UID = "plugin::creative-works.creative-work"

export interface SeededVenue {
  documentId: string
  name: string
}

export interface SeededEvent {
  documentId: string
  title: string
  slug: string
}

export interface SeededScreening {
  documentId: string
  startDateTime: string
}

export interface SeededMovie {
  documentId: string
  title: string
}

let counter = 0
function uniq(prefix: string): string {
  counter += 1
  return `${prefix}-${counter}-${Date.now()}`
}

export async function seedVenue(
  strapi: Core.Strapi,
  overrides: Partial<{ name: string }> = {}
): Promise<SeededVenue> {
  const name = overrides.name ?? `Test Venue ${uniq("v")}`
  const venue = await strapi.documents(VENUE_UID).create({
    data: {
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      address: "Avenue Habib Bourguiba, Tunis",
      capacity: 100,
    },
  })
  return { documentId: venue.documentId, name: venue.name }
}

export async function seedMovie(
  strapi: Core.Strapi,
  overrides: Partial<{ title: string }> = {}
): Promise<SeededMovie> {
  const title = overrides.title ?? `Test Movie ${uniq("m")}`
  const work = await strapi.documents(WORK_UID).create({
    data: {
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      type: "film",
    },
  })
  return { documentId: work.documentId, title: work.title }
}

export async function seedEvent(
  strapi: Core.Strapi,
  overrides: Partial<{
    title: string
    venueDocumentId: string
    startDateTime: string
    category: string
  }> = {}
): Promise<SeededEvent> {
  const title = overrides.title ?? `Test Event ${uniq("e")}`
  const event = await strapi.documents(EVENT_UID).create({
    data: {
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      category: (overrides.category ?? "movie_screening") as
        | "movie_screening"
        | "theater_performance"
        | "concert"
        | "exhibition"
        | "other",
      startDateTime: overrides.startDateTime ?? new Date().toISOString(),
      eventStatus: "scheduled",
      ...(overrides.venueDocumentId
        ? { venue: overrides.venueDocumentId }
        : {}),
    },
  })
  return {
    documentId: event.documentId,
    title: event.title!,
    slug: event.slug!,
  }
}

export async function seedScreening(
  strapi: Core.Strapi,
  params: {
    eventDocumentId: string
    startDateTime?: string
    price?: number
    ticketsAvailable?: number
    ticketsSold?: number
  }
): Promise<SeededScreening> {
  const startDateTime = params.startDateTime ?? new Date().toISOString()
  const screening = await strapi.documents(SCREENING_UID).create({
    data: {
      event: params.eventDocumentId,
      order: 1,
      startDateTime,
      videoFormat: "standard",
      audioLanguage: "fr",
      subtitleLanguage: "none",
      price: params.price ?? 10,
      ticketsAvailable: params.ticketsAvailable ?? 50,
      ticketsSold: params.ticketsSold ?? 0,
    },
  })
  return {
    documentId: screening.documentId,
    startDateTime: screening.startDateTime as string,
  }
}

export async function cleanupContent(strapi: Core.Strapi): Promise<void> {
  // Clean in reverse-dependency order: screenings -> events -> works -> venues
  for (const uid of [SCREENING_UID, EVENT_UID, WORK_UID, VENUE_UID] as const) {
    let items = await strapi.documents(uid).findMany({ limit: 100 })
    while (items.length > 0) {
      for (const item of items) {
        await strapi.documents(uid).delete({ documentId: item.documentId })
      }
      items = await strapi.documents(uid).findMany({ limit: 100 })
    }
  }
}
