/**
 * Service tests for events-manager.event-manager.
 *
 * Covers the four documented service methods against a real Strapi instance
 * backed by SQLite (see tests/helpers/strapi.ts and config/env/test/database.ts):
 *
 *   - createBulkScreenings
 *   - duplicateEvent
 *   - updateTicketInventory
 *   - getEventStats
 *
 * All service calls go through `strapi.plugin('events-manager').service('event-manager')`
 * — never via direct import — so the plugin registry, lifecycle hooks, and
 * dependency resolution match production behavior.
 */
import type { Core } from "@strapi/strapi"

import {
  cleanupContent,
  seedEvent,
  seedMovie,
  seedScreening,
  seedVenue,
} from "../../../../../../../tests/fixtures/events"
import {
  cleanupStrapi,
  setupStrapi,
} from "../../../../../../../tests/helpers/strapi"

jest.setTimeout(60000)

let strapi: Core.Strapi
type EventManagerService = ReturnType<
  (typeof import("../event-manager"))["default"]
>

function service(): EventManagerService {
  return (strapi as any).plugin("events-manager").service("event-manager")
}

beforeAll(async () => {
  strapi = await setupStrapi()
})

afterAll(async () => {
  await cleanupStrapi()
})

afterEach(async () => {
  await cleanupContent(strapi)
})

describe("event-manager service: createBulkScreenings", () => {
  it("creates one screening per date with the shared time", async () => {
    const venue = await seedVenue(strapi)
    const event = await seedEvent(strapi, { venueDocumentId: venue.documentId })
    const movie = await seedMovie(strapi)

    const result = await service().createBulkScreenings({
      eventId: event.documentId,
      movieId: movie.documentId,
      dates: ["2026-07-01", "2026-07-02", "2026-07-03"],
      time: "20:00",
      ticketsAvailable: 100,
    })

    expect(result).toHaveLength(3)
    for (const screening of result) {
      expect(screening.documentId).toBeDefined()
      // Service parses `${date}T${time}` as UTC (Z), so we assert
      // using getUTCHours() to ensure consistency across environments.
      expect(new Date(screening.startDateTime).getUTCHours()).toBe(20)
      expect(screening.ticketsAvailable).toBe(100)
      expect(screening.ticketsSold).toBe(0)
      expect(screening.order).toBe(1)
    }
  })

  it("applies defaults (videoFormat=standard, audioLanguage=fr)", async () => {
    const venue = await seedVenue(strapi)
    const event = await seedEvent(strapi, { venueDocumentId: venue.documentId })
    const movie = await seedMovie(strapi)

    const [screening] = await service().createBulkScreenings({
      eventId: event.documentId,
      movieId: movie.documentId,
      dates: ["2026-07-01"],
      time: "20:00",
    })

    expect(screening.videoFormat).toBe("standard")
    expect(screening.audioLanguage).toBe("fr")
  })

  it("respects explicit videoFormat/language overrides", async () => {
    const venue = await seedVenue(strapi)
    const event = await seedEvent(strapi, { venueDocumentId: venue.documentId })
    const movie = await seedMovie(strapi)

    const [screening] = await service().createBulkScreenings({
      eventId: event.documentId,
      movieId: movie.documentId,
      dates: ["2026-07-01"],
      time: "18:30",
      videoFormat: "imax",
      audioLanguage: "en",
      subtitleLanguage: "ar",
      price: 25,
      ticketsAvailable: 50,
    })

    expect(screening.videoFormat).toBe("imax")
    expect(screening.audioLanguage).toBe("en")
    expect(screening.subtitleLanguage).toBe("ar")
    expect(Number(screening.price)).toBe(25)
    expect(screening.ticketsAvailable).toBe(50)
  })
})

describe("event-manager service: duplicateEvent", () => {
  it("creates a new event with default '(Copy)' suffix and unique slug", async () => {
    const venue = await seedVenue(strapi)
    const original = await seedEvent(strapi, {
      title: "Original Show",
      venueDocumentId: venue.documentId,
    })

    const duplicated = await service().duplicateEvent({
      eventId: original.documentId,
    })

    expect(duplicated.documentId).not.toBe(original.documentId)
    expect(duplicated.title).toBe("Original Show (Copy)")
    expect(duplicated.slug).toMatch(new RegExp(`^${original.slug}-copy-\\d+$`))
    expect(duplicated.eventStatus).toBe("scheduled")
  })

  it("uses an explicit newTitle when provided", async () => {
    const venue = await seedVenue(strapi)
    const original = await seedEvent(strapi, {
      venueDocumentId: venue.documentId,
    })

    const duplicated = await service().duplicateEvent({
      eventId: original.documentId,
      newTitle: "Special Encore Screening",
    })

    expect(duplicated.title).toBe("Special Encore Screening")
  })

  it("does NOT duplicate screenings by default", async () => {
    const venue = await seedVenue(strapi)
    const original = await seedEvent(strapi, {
      venueDocumentId: venue.documentId,
    })
    await seedScreening(strapi, {
      eventDocumentId: original.documentId,
    })

    const duplicated = await service().duplicateEvent({
      eventId: original.documentId,
    })

    const duplicatedWithScreenings: any = await strapi
      .documents("plugin::events-manager.event")
      .findOne({
        documentId: duplicated.documentId,
        populate: ["screenings"],
      })

    expect(duplicatedWithScreenings.screenings ?? []).toHaveLength(0)
  })

  it("duplicates screenings with dateOffset applied when copySubEvents=true", async () => {
    const venue = await seedVenue(strapi)
    const original = await seedEvent(strapi, {
      venueDocumentId: venue.documentId,
    })
    const originalScreening = await seedScreening(strapi, {
      eventDocumentId: original.documentId,
      startDateTime: "2026-07-01T20:00:00.000Z",
    })

    const duplicated = await service().duplicateEvent({
      eventId: original.documentId,
      copySubEvents: true,
      dateOffset: 7,
    })

    const populated: any = await strapi
      .documents("plugin::events-manager.event")
      .findOne({
        documentId: duplicated.documentId,
        populate: ["screenings"],
      })

    expect(populated.screenings).toHaveLength(1)
    const copied = populated.screenings[0]
    const original_dt = new Date(originalScreening.startDateTime).getTime()
    const copied_dt = new Date(copied.startDateTime).getTime()
    const deltaDays = Math.round((copied_dt - original_dt) / (24 * 3600 * 1000))
    expect(deltaDays).toBe(7)
    expect(copied.ticketsSold).toBe(0)
  })

  it("throws 'Event not found' when given a non-existent eventId", async () => {
    await expect(
      service().duplicateEvent({ eventId: "non-existent-document-id" })
    ).rejects.toThrow(/event not found/i)
  })
})

describe("event-manager service: updateTicketInventory", () => {
  it("writes ticketsAvailable when ticketsSold is omitted", async () => {
    const venue = await seedVenue(strapi)
    const event = await seedEvent(strapi, { venueDocumentId: venue.documentId })
    const screening = await seedScreening(strapi, {
      eventDocumentId: event.documentId,
      ticketsAvailable: 50,
      ticketsSold: 10,
    })

    const updated = await service().updateTicketInventory(
      screening.documentId,
      80
    )

    expect(updated.ticketsAvailable).toBe(80)
    // ticketsSold should be unchanged since it was not passed
    expect(updated.ticketsSold).toBe(10)
  })

  it("writes both ticketsAvailable and ticketsSold when both are provided", async () => {
    const venue = await seedVenue(strapi)
    const event = await seedEvent(strapi, { venueDocumentId: venue.documentId })
    const screening = await seedScreening(strapi, {
      eventDocumentId: event.documentId,
    })

    const updated = await service().updateTicketInventory(
      screening.documentId,
      100,
      25
    )

    expect(updated.ticketsAvailable).toBe(100)
    expect(updated.ticketsSold).toBe(25)
  })
})

describe("event-manager service: getEventStats", () => {
  it("aggregates screening counts and computes soldPercentage", async () => {
    const venue = await seedVenue(strapi)
    const event = await seedEvent(strapi, { venueDocumentId: venue.documentId })
    await seedScreening(strapi, {
      eventDocumentId: event.documentId,
      ticketsAvailable: 100,
      ticketsSold: 25,
    })
    await seedScreening(strapi, {
      eventDocumentId: event.documentId,
      ticketsAvailable: 100,
      ticketsSold: 75,
    })

    const stats = await service().getEventStats(event.documentId)

    expect(stats.eventId).toBe(event.documentId)
    expect(stats.title).toBe(event.title)
    expect(stats.screeningCount).toBe(2)
    expect(stats.subEventCount).toBe(2)
    expect(stats.totalTicketsAvailable).toBe(200)
    expect(stats.totalTicketsSold).toBe(100)
    expect(stats.remainingTickets).toBe(100)
    expect(stats.soldPercentage).toBe(50)
  })

  it("returns 0% when no tickets are available (avoids division by zero)", async () => {
    const venue = await seedVenue(strapi)
    const event = await seedEvent(strapi, { venueDocumentId: venue.documentId })

    const stats = await service().getEventStats(event.documentId)

    expect(stats.subEventCount).toBe(0)
    expect(stats.totalTicketsAvailable).toBe(0)
    expect(stats.totalTicketsSold).toBe(0)
    expect(stats.remainingTickets).toBe(0)
    expect(stats.soldPercentage).toBe(0)
  })

  it("throws 'Event not found' when given a non-existent eventId", async () => {
    await expect(
      service().getEventStats("non-existent-document-id")
    ).rejects.toThrow(/event not found/i)
  })
})
