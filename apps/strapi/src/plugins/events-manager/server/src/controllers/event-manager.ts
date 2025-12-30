import type { Core } from "@strapi/strapi"

const eventManagerController = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Create bulk showtimes for an event
   */
  async createBulkShowtimes(ctx: any) {
    try {
      const {
        eventId,
        venueId,
        dates,
        time,
        format,
        language,
        subtitles,
        price,
        ticketsAvailable,
      } = ctx.request.body

      if (!eventId || !venueId || !dates || !time) {
        return ctx.badRequest(
          "Missing required fields: eventId, venueId, dates, time"
        )
      }

      const showtimes = await strapi
        .plugin("events-manager")
        .service("event-manager")
        .createBulkShowtimes({
          eventId,
          venueId,
          dates,
          time,
          format,
          language,
          subtitles,
          price,
          ticketsAvailable,
        })

      return ctx.send({
        message: `Created ${showtimes.length} showtimes`,
        data: showtimes,
      })
    } catch (error: any) {
      return ctx.badRequest(error.message)
    }
  },

  /**
   * Duplicate an event
   */
  async duplicateEvent(ctx: any) {
    try {
      const { eventId, newTitle, dateOffset, copyShowtimes } = ctx.request.body

      if (!eventId) {
        return ctx.badRequest("Missing required field: eventId")
      }

      const newEvent = await strapi
        .plugin("events-manager")
        .service("event-manager")
        .duplicateEvent({
          eventId,
          newTitle,
          dateOffset,
          copyShowtimes,
        })

      return ctx.send({
        message: "Event duplicated successfully",
        data: newEvent,
      })
    } catch (error: any) {
      return ctx.badRequest(error.message)
    }
  },

  /**
   * Update ticket inventory
   */
  async updateTicketInventory(ctx: any) {
    try {
      const { showtimeId, ticketsAvailable, ticketsSold } = ctx.request.body

      if (!showtimeId || ticketsAvailable === undefined) {
        return ctx.badRequest(
          "Missing required fields: showtimeId, ticketsAvailable"
        )
      }

      const showtime = await strapi
        .plugin("events-manager")
        .service("event-manager")
        .updateTicketInventory(showtimeId, ticketsAvailable, ticketsSold)

      return ctx.send({
        message: "Ticket inventory updated",
        data: showtime,
      })
    } catch (error: any) {
      return ctx.badRequest(error.message)
    }
  },

  /**
   * Get event statistics
   */
  async getEventStats(ctx: any) {
    try {
      const { eventId } = ctx.params

      if (!eventId) {
        return ctx.badRequest("Missing required parameter: eventId")
      }

      const stats = await strapi
        .plugin("events-manager")
        .service("event-manager")
        .getEventStats(eventId)

      return ctx.send({
        data: stats,
      })
    } catch (error: any) {
      return ctx.badRequest(error.message)
    }
  },
})

export default eventManagerController
