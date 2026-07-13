import type { Core } from "@strapi/strapi"

const PLUGIN_ID = "events-manager"
const EVENT_UID = `plugin::${PLUGIN_ID}.event`
const SCREENING_UID = `plugin::${PLUGIN_ID}.screening`
const PERFORMANCE_UID = `plugin::${PLUGIN_ID}.performance`

export type SubEventKind = "screening" | "performance"

const SUB_EVENT_UIDS = {
  screening: SCREENING_UID,
  performance: PERFORMANCE_UID,
} as const

interface BulkScreeningParams {
  eventId: string
  movieId: string
  /** Dates in YYYY-MM-DD format */
  dates: string[]
  /** Time in HH:mm, interpreted as UTC — callers must convert local showtime to UTC */
  time: string
  videoFormat?: string
  audioLanguage?: string
  subtitleLanguage?: string
  price?: number
  ticketsAvailable?: number
}

interface DuplicateEventParams {
  eventId: string
  newTitle?: string
  dateOffset?: number // days to add to screening/performance dates
  copySubEvents?: boolean
}

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/
const TIME_FORMAT = /^([01]\d|2[0-3]):[0-5]\d$/

/**
 * Validate a YYYY-MM-DD date string, including calendar validity.
 * Date.UTC rolls overflowing components over (2026-02-30 becomes March 2),
 * so a round-trip comparison is needed to reject impossible dates.
 */
const assertValidDate = (date: string): void => {
  if (typeof date !== "string" || !DATE_FORMAT.test(date)) {
    throw new Error(`Invalid date "${date}": expected YYYY-MM-DD`)
  }

  const [year, month, day] = date.split("-").map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date "${date}": not a valid calendar date`)
  }
}

const assertValidTime = (time: string): void => {
  if (typeof time !== "string" || !TIME_FORMAT.test(time)) {
    throw new Error(`Invalid time "${time}": expected HH:mm (00:00-23:59)`)
  }
}

const assertNonNegativeInteger = (value: unknown, field: string): void => {
  if (typeof value !== "number") {
    throw new Error(`Invalid ${field}: must be a number`)
  }
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid ${field}: must be a non-negative integer`)
  }
}

const assertSubEventKind = (kind: string): void => {
  if (kind !== "screening" && kind !== "performance") {
    throw new Error(
      `Invalid kind "${kind}": expected "screening" or "performance"`
    )
  }
}

const eventManagerService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Create multiple screenings of a movie for an event
   */
  async createBulkScreenings(params: BulkScreeningParams) {
    const {
      eventId,
      movieId,
      dates,
      time,
      videoFormat = "standard",
      audioLanguage = "fr",
      subtitleLanguage,
      price = 0,
      ticketsAvailable = 0,
    } = params

    // Validate everything up front so a bad entry can't leave partial writes
    if (!Array.isArray(dates) || dates.length === 0) {
      throw new Error("dates must be a non-empty array of YYYY-MM-DD strings")
    }
    dates.forEach(assertValidDate)
    assertValidTime(time)
    assertNonNegativeInteger(ticketsAvailable, "ticketsAvailable")
    if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
      throw new Error("Invalid price: must be a non-negative finite number")
    }

    const createdScreenings = []

    for (const date of dates) {
      const startDateTime = new Date(`${date}T${time}:00Z`)

      const screening = await strapi.documents(SCREENING_UID).create({
        data: {
          event: eventId,
          movie: movieId,
          order: 1,
          startDateTime: startDateTime.toISOString(),
          videoFormat: videoFormat as
            | "standard"
            | "threeD"
            | "imax"
            | "fourDX"
            | "format70mm",
          audioLanguage,
          subtitleLanguage,
          price,
          ticketsAvailable,
          ticketsSold: 0,
        },
      })

      createdScreenings.push(screening)
    }

    return createdScreenings
  },

  /**
   * Duplicate an event with optional screening/performance copying
   */
  async duplicateEvent(params: DuplicateEventParams) {
    const { eventId, newTitle, dateOffset = 0, copySubEvents = false } = params

    // Fetch the original event
    const originalEvent = await strapi.documents(EVENT_UID).findOne({
      documentId: eventId,
      populate: {
        venue: true,
        screenings: { populate: ["movie"] },
        performances: { populate: ["play"] },
      },
    })

    if (!originalEvent) {
      throw new Error("Event not found")
    }

    const offsetDate = (
      value: string | Date | null | undefined
    ): string | null => {
      if (!value) return null
      const date = new Date(value)
      date.setDate(date.getDate() + dateOffset)
      return date.toISOString()
    }

    // Create new event with duplicated data
    const newEvent = await strapi.documents(EVENT_UID).create({
      data: {
        title: newTitle || `${originalEvent.title} (Copy)`,
        slug: `${originalEvent.slug}-copy-${Date.now()}`,
        description: originalEvent.description,
        category: originalEvent.category,
        startDateTime:
          offsetDate(originalEvent.startDateTime) ??
          originalEvent.startDateTime,
        endDateTime: offsetDate(originalEvent.endDateTime),
        eventStatus: "scheduled",
        venue: originalEvent.venue?.documentId,
      },
    })

    // Copy screenings and performances if requested
    if (copySubEvents) {
      for (const screening of originalEvent.screenings ?? []) {
        await strapi.documents(SCREENING_UID).create({
          data: {
            event: newEvent.documentId,
            movie: screening.movie?.documentId,
            order: screening.order,
            startDateTime: offsetDate(screening.startDateTime),
            videoFormat: screening.videoFormat,
            audioLanguage: screening.audioLanguage,
            subtitleLanguage: screening.subtitleLanguage,
            price: screening.price,
            ticketsAvailable: screening.ticketsAvailable,
            ticketsSold: 0,
          },
        })
      }

      for (const performance of originalEvent.performances ?? []) {
        await strapi.documents(PERFORMANCE_UID).create({
          data: {
            event: newEvent.documentId,
            play: performance.play?.documentId,
            order: performance.order,
            startDateTime: offsetDate(performance.startDateTime),
            audioLanguage: performance.audioLanguage,
            surtitleLanguage: performance.surtitleLanguage,
            price: performance.price,
            ticketsAvailable: performance.ticketsAvailable,
            ticketsSold: 0,
          },
        })
      }
    }

    return newEvent
  },

  /**
   * Update ticket inventory for a screening or a performance
   */
  async updateTicketInventory(
    subEventId: string,
    ticketsAvailable: number,
    ticketsSold?: number,
    kind: SubEventKind = "screening"
  ) {
    assertSubEventKind(kind)
    assertNonNegativeInteger(ticketsAvailable, "ticketsAvailable")
    if (ticketsSold !== undefined) {
      assertNonNegativeInteger(ticketsSold, "ticketsSold")
      if (ticketsSold > ticketsAvailable) {
        throw new Error(
          `ticketsSold (${ticketsSold}) cannot exceed ticketsAvailable (${ticketsAvailable})`
        )
      }
    }

    const uid = SUB_EVENT_UIDS[kind]

    // Check-then-act: a concurrent purchase can bump ticketsSold between this
    // read and the update below. The guard catches operator mistakes, not races —
    // the DB-level CHECK (ticketsSold <= ticketsAvailable), ensured by the
    // events-manager plugin bootstrap (`ensureInventoryCheckConstraint`) on
    // `screenings`/`performances`, is the final enforcer: any write that would
    // oversell is rejected by the database and its transaction rolls back.
    const subEvent = await strapi.documents(uid).findOne({
      documentId: subEventId,
    })

    if (!subEvent) {
      throw new Error(
        `${kind === "screening" ? "Screening" : "Performance"} not found`
      )
    }

    // When ticketsSold is untouched, capacity can't drop below what's already sold
    if (ticketsSold === undefined && ticketsAvailable < subEvent.ticketsSold) {
      throw new Error(
        `ticketsSold (${subEvent.ticketsSold}) cannot exceed ticketsAvailable (${ticketsAvailable})`
      )
    }

    const updateData: { ticketsAvailable: number; ticketsSold?: number } = {
      ticketsAvailable,
    }

    if (ticketsSold !== undefined) {
      updateData.ticketsSold = ticketsSold
    }

    return strapi.documents(uid).update({
      documentId: subEventId,
      data: updateData,
    })
  },

  /**
   * Get event statistics across screenings and performances
   */
  async getEventStats(eventId: string) {
    const event = await strapi.documents(EVENT_UID).findOne({
      documentId: eventId,
      populate: ["screenings", "performances"],
    })

    if (!event) {
      throw new Error("Event not found")
    }

    const subEvents = [
      ...(event.screenings || []),
      ...(event.performances || []),
    ]
    const totalTicketsAvailable = subEvents.reduce(
      (sum: number, s: any) => sum + (s.ticketsAvailable || 0),
      0
    )
    const totalTicketsSold = subEvents.reduce(
      (sum: number, s: any) => sum + (s.ticketsSold || 0),
      0
    )

    return {
      eventId,
      title: event.title,
      screeningCount: (event.screenings || []).length,
      performanceCount: (event.performances || []).length,
      subEventCount: subEvents.length,
      totalTicketsAvailable,
      totalTicketsSold,
      remainingTickets: totalTicketsAvailable - totalTicketsSold,
      soldPercentage:
        totalTicketsAvailable > 0
          ? Math.round((totalTicketsSold / totalTicketsAvailable) * 100)
          : 0,
    }
  },
})

export default eventManagerService
