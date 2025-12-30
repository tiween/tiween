import type { Core } from "@strapi/strapi"

interface BulkShowtimeParams {
  eventId: string
  venueId: string
  dates: string[]
  time: string
  format?: string
  language?: string
  subtitles?: string
  price?: number
  ticketsAvailable?: number
}

interface DuplicateEventParams {
  eventId: string
  newTitle?: string
  dateOffset?: number // days to add to showtime dates
  copyShowtimes?: boolean
}

const eventManagerService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Create multiple showtimes for an event
   */
  async createBulkShowtimes(params: BulkShowtimeParams) {
    const {
      eventId,
      venueId,
      dates,
      time,
      format = "VOST",
      language = "fr",
      subtitles = "none",
      price = 0,
      ticketsAvailable = 0,
    } = params

    const createdShowtimes = []

    for (const date of dates) {
      const datetime = new Date(`${date}T${time}`)

      const showtime = await strapi.documents("api::showtime.showtime").create({
        data: {
          event: eventId,
          venue: venueId,
          datetime: datetime.toISOString(),
          format,
          language,
          subtitles,
          price,
          ticketsAvailable,
          ticketsSold: 0,
          premiere: false,
        },
      })

      createdShowtimes.push(showtime)
    }

    return createdShowtimes
  },

  /**
   * Duplicate an event with optional showtime copying
   */
  async duplicateEvent(params: DuplicateEventParams) {
    const { eventId, newTitle, dateOffset = 0, copyShowtimes = false } = params

    // Fetch the original event
    const originalEvent = await strapi.documents("api::event.event").findOne({
      documentId: eventId,
      populate: ["creativeWork", "venue", "showtimes"],
    })

    if (!originalEvent) {
      throw new Error("Event not found")
    }

    // Create new event with duplicated data
    const newEvent = await strapi.documents("api::event.event").create({
      data: {
        title: newTitle || `${originalEvent.title} (Copy)`,
        slug: `${originalEvent.slug}-copy-${Date.now()}`,
        description: originalEvent.description,
        startDate: originalEvent.startDate,
        endDate: originalEvent.endDate,
        status: "draft",
        featured: false,
        creativeWork: originalEvent.creativeWork?.documentId,
        venue: originalEvent.venue?.documentId,
      },
    })

    // Copy showtimes if requested
    if (copyShowtimes && originalEvent.showtimes?.length > 0) {
      for (const showtime of originalEvent.showtimes) {
        const originalDate = new Date(showtime.datetime)
        originalDate.setDate(originalDate.getDate() + dateOffset)

        await strapi.documents("api::showtime.showtime").create({
          data: {
            event: newEvent.documentId,
            venue:
              showtime.venue?.documentId || originalEvent.venue?.documentId,
            datetime: originalDate.toISOString(),
            format: showtime.format,
            language: showtime.language,
            subtitles: showtime.subtitles,
            price: showtime.price,
            ticketsAvailable: showtime.ticketsAvailable,
            ticketsSold: 0,
            premiere: false,
          },
        })
      }
    }

    return newEvent
  },

  /**
   * Update ticket inventory for a showtime
   */
  async updateTicketInventory(
    showtimeId: string,
    ticketsAvailable: number,
    ticketsSold?: number
  ) {
    const updateData: Record<string, number> = { ticketsAvailable }

    if (ticketsSold !== undefined) {
      updateData.ticketsSold = ticketsSold
    }

    return strapi.documents("api::showtime.showtime").update({
      documentId: showtimeId,
      data: updateData,
    })
  },

  /**
   * Get event statistics
   */
  async getEventStats(eventId: string) {
    const event = await strapi.documents("api::event.event").findOne({
      documentId: eventId,
      populate: ["showtimes"],
    })

    if (!event) {
      throw new Error("Event not found")
    }

    const showtimes = event.showtimes || []
    const totalTicketsAvailable = showtimes.reduce(
      (sum: number, s: any) => sum + (s.ticketsAvailable || 0),
      0
    )
    const totalTicketsSold = showtimes.reduce(
      (sum: number, s: any) => sum + (s.ticketsSold || 0),
      0
    )

    return {
      eventId,
      title: event.title,
      showtimeCount: showtimes.length,
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
