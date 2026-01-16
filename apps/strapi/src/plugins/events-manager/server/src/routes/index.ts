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
      // Seed routes (admin only)
      {
        method: "POST",
        path: "/seed",
        handler: "seed.seed",
        config: {
          policies: [],
          auth: false,
        },
      },
      {
        method: "POST",
        path: "/seed/venues",
        handler: "seed.seedVenues",
        config: {
          policies: [],
        },
      },
      {
        method: "POST",
        path: "/seed/event-groups",
        handler: "seed.seedEventGroups",
        config: {
          policies: [],
        },
      },
    ],
  },
}
