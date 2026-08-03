export default {
  "content-api": {
    type: "content-api",
    routes: [
      // Venues (public read)
      {
        method: "GET",
        path: "/venues",
        handler: "venue.findVenues",
        config: {
          policies: [],
          auth: false,
        },
      },
      // Venue picker feed. MUST stay before `/venues/:documentId`, otherwise
      // the literal `selector` segment is swallowed by the id route.
      {
        method: "GET",
        path: "/venues/selector",
        handler: "venue.findVenuesForSelector",
        config: {
          policies: [],
          auth: false,
        },
      },
      // Public venue application (Story 7.1). Like `/venues/selector` this is a
      // LITERAL segment under the `/venues/:documentId` prefix — it is a POST so
      // the GET detail route cannot actually swallow it, but the ordering is
      // kept explicit so a future method change can't silently break it.
      // Unauthenticated by design. The rate-limit middleware is an ABUSE
      // BACKSTOP for callers that bypass the Next.js proxy — behind the proxy
      // it is one GLOBAL bucket (all traffic shares the Next server's IP), so
      // the cap is sized high on purpose; a business-sized cap here would
      // reject every applicant platform-wide. The per-applicant throttle is the
      // Next-layer limiter. See `../middlewares/index.ts` for the full
      // rationale and what per-IP would require.
      {
        method: "POST",
        path: "/venues/register",
        handler: "registration.register",
        config: {
          policies: [],
          auth: false,
          middlewares: [
            {
              name: "plugin::venues.registration-rate-limit",
              config: { max: 200, windowMs: 3600000 },
            },
          ],
        },
      },
      {
        method: "GET",
        path: "/venues/:documentId",
        handler: "venue.findVenue",
        config: {
          policies: [],
          auth: false,
        },
      },
    ],
  },
  "admin-api": {
    type: "admin",
    routes: [
      {
        method: "POST",
        path: "/seed/venues",
        handler: "seed.seedVenues",
        config: {
          policies: [],
        },
      },
    ],
  },
}
