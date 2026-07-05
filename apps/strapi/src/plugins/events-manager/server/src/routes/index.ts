export default {
  "content-api": {
    type: "content-api",
    routes: [
      // Public events browse (Story 3.1a) — published cinema events only.
      {
        method: "GET",
        path: "/events",
        handler: "events.findEvents",
        config: {
          policies: [],
          auth: false,
        },
      },
      // Register BEFORE `/events/:documentId` so `trending` is not captured
      // as a documentId route param.
      {
        method: "GET",
        path: "/events/trending",
        handler: "events.findTrending",
        config: {
          policies: [],
          auth: false,
        },
      },
      {
        method: "GET",
        path: "/events/:documentId",
        handler: "events.findEvent",
        config: {
          policies: [],
          auth: false,
        },
      },
    ],
  },
  admin: {
    type: "admin",
    routes: [
      {
        method: "POST",
        path: "/bulk-screenings",
        handler: "event-manager.createBulkScreenings",
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
        path: "/seed/event-groups",
        handler: "seed.seedEventGroups",
        config: {
          policies: [],
        },
      },
    ],
  },
}
