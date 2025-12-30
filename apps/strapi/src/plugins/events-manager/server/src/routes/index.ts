export default {
  admin: {
    type: "admin",
    routes: [
      {
        method: "POST",
        path: "/bulk-showtimes",
        handler: "event-manager.createBulkShowtimes",
        config: {
          policies: [],
        },
      },
      {
        method: "POST",
        path: "/duplicate-event",
        handler: "event-manager.duplicateEvent",
        config: {
          policies: [],
        },
      },
      {
        method: "PUT",
        path: "/ticket-inventory",
        handler: "event-manager.updateTicketInventory",
        config: {
          policies: [],
        },
      },
      {
        method: "GET",
        path: "/event-stats/:eventId",
        handler: "event-manager.getEventStats",
        config: {
          policies: [],
        },
      },
    ],
  },
}
