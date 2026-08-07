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
      // Venue-manager event creation (Story 7.3). The DISTINCT `/venue/*`
      // prefix means none of these can be swallowed by `/events/:documentId`
      // above (no ordering constraint), and the public routes stay untouched.
      //
      // AUTHENTICATION IS DECLARED BY OMITTING `auth`, NOT BY `auth: true`.
      // `@strapi/core`'s route schema validates `config.auth` with
      // `yup.lazy(v => v === false ? boolean() : object({ scope: ... }))`
      // under `strict: true`, so a literal `auth: true` throws
      // `Invalid route config` at BOOT (7.2's lead review finding). Omitting
      // the key makes a content-api route both authenticated (401 without a
      // JWT) and permission-checked against the caller's users-permissions
      // role — the grants are seeded by `src/bootstrap/venue-manager-role.ts`.
      //
      // The `plugin::venues.is-venue-manager` policy (referenced cross-plugin
      // by its global id — the same string venues' own routes use) is the
      // server-side tenant gate; the venue itself is then resolved from
      // `ctx.state.user` inside the service, never from the request.
      {
        method: "GET",
        path: "/venue/events",
        handler: "venue-events.findMine",
        config: {
          policies: ["plugin::venues.is-venue-manager"],
        },
      },
      {
        method: "POST",
        path: "/venue/events",
        handler: "venue-events.create",
        config: {
          policies: ["plugin::venues.is-venue-manager"],
        },
      },
      {
        method: "GET",
        path: "/venue/events/:documentId",
        handler: "venue-events.findOne",
        config: {
          policies: ["plugin::venues.is-venue-manager"],
        },
      },
      {
        method: "POST",
        path: "/venue/events/:documentId/publish",
        handler: "venue-events.publish",
        config: {
          policies: ["plugin::venues.is-venue-manager"],
        },
      },
      {
        method: "GET",
        path: "/venue/creative-works/search",
        handler: "venue-events.searchCreativeWorks",
        config: {
          policies: ["plugin::venues.is-venue-manager"],
        },
      },
      {
        method: "POST",
        path: "/venue/creative-works",
        handler: "venue-events.createCreativeWork",
        config: {
          policies: ["plugin::venues.is-venue-manager"],
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
