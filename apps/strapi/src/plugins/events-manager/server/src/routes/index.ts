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
          // DW-19: per-IP fixed-window limiter on the trending route ONLY (the
          // uncached/unauthenticated resource-exhaustion surface). Generous
          // 100/min so the single Next.js SSR caller is never throttled while
          // crude direct abuse of the public route stays bounded.
          middlewares: [
            {
              name: "plugin::events-manager.trending-rate-limit",
              config: { max: 100, windowMs: 60000 },
            },
          ],
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
      // Public ticket-tiers read for a sub-event (Story 6.1). A distinct
      // `/showtimes/*` prefix, so no ordering conflict with the `/events/*`
      // routes above.
      {
        method: "GET",
        path: "/showtimes/:documentId/ticket-tiers",
        handler: "ticket-tiers.findTicketTiers",
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
