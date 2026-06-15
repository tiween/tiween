import type { Core } from "@strapi/strapi"

const eventManagerController = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Create bulk screenings for an event
   */
  async createBulkScreenings(ctx: any) {
    try {
      const {
        eventId,
        movieId,
        dates,
        time,
        videoFormat,
        audioLanguage,
        subtitleLanguage,
        price,
        ticketsAvailable,
      } = ctx.request.body

      if (!eventId || !movieId || !dates || !time) {
        return ctx.badRequest(
          "Missing required fields: eventId, movieId, dates, time"
        )
      }

      const screenings = await strapi
        .plugin("events-manager")
        .service("event-manager")
        .createBulkScreenings({
          eventId,
          movieId,
          dates,
          time,
          videoFormat,
          audioLanguage,
          subtitleLanguage,
          price,
          ticketsAvailable,
        })

      return ctx.send({
        message: `Created ${screenings.length} screenings`,
        data: screenings,
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
      const { eventId, newTitle, dateOffset, copySubEvents } = ctx.request.body

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
          copySubEvents,
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
   * Update ticket inventory for a screening or a performance
   */
  async updateTicketInventory(ctx: any) {
    try {
      const { subEventId, kind, ticketsAvailable, ticketsSold } =
        ctx.request.body

      if (!subEventId || ticketsAvailable === undefined) {
        return ctx.badRequest(
          "Missing required fields: subEventId, ticketsAvailable"
        )
      }

      const subEvent = await strapi
        .plugin("events-manager")
        .service("event-manager")
        .updateTicketInventory(subEventId, ticketsAvailable, ticketsSold, kind)

      return ctx.send({
        message: "Ticket inventory updated",
        data: subEvent,
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
