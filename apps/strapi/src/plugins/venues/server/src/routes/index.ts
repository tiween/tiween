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
      // Venue-manager self-service profile (Story 7.2). All three are LITERAL
      // segments under the `/venues/:documentId` prefix and MUST stay above it
      // — Koa matches in registration order, so below it `me` and
      // `property-definitions` are read as documentIds and 404.
      //
      // AUTHENTICATION IS DECLARED BY OMITTING `auth`, NOT BY `auth: true`.
      // `@strapi/core`'s route schema (`services/server/routing.js`) validates
      // `config.auth` with `yup.lazy(v => v === false ? boolean() : object({
      // scope: array().of(string()).required() }))` under `strict: true`, so a
      // literal `auth: true` is NOT a valid value — it throws
      // `Invalid route config` at BOOT and takes the whole API down. Leaving the
      // key off is what makes a content-api route both authenticated (401
      // without a JWT) and permission-checked against the caller's
      // users-permissions role, which is exactly what is wanted here and what
      // every other authenticated route in this repo does (see
      // `plugins/user-engagement/server/src/routes/content-api.ts`).
      //
      // The `plugin::venues.is-venue-manager` policy on top is the server-side
      // tenant gate the epic marks P0; the dashboard's own role check is
      // convenience only. The venue is then resolved from `ctx.state.user`
      // inside the service, never from the request.
      {
        method: "GET",
        path: "/venues/me",
        handler: "venue-profile.getMine",
        config: {
          policies: ["plugin::venues.is-venue-manager"],
        },
      },
      {
        method: "PUT",
        path: "/venues/me",
        handler: "venue-profile.updateMine",
        config: {
          policies: ["plugin::venues.is-venue-manager"],
        },
      },
      {
        method: "GET",
        path: "/venues/property-definitions",
        handler: "venue-profile.propertyDefinitions",
        config: {
          policies: ["plugin::venues.is-venue-manager"],
        },
      },
      // Public venue page read by slug (Story 7.2). Also a literal segment, so
      // it too has to precede `/venues/:documentId`. Unauthenticated by design:
      // it is the surface on which an approved venue's edits become observable.
      {
        method: "GET",
        path: "/venues/by-slug/:slug",
        handler: "venue.findVenueBySlug",
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
      // ----------------------------------------------------------------
      // Venue CRUD for the venues-plugin admin UI (Story 2D.2).
      //
      // WHY THE `/admin/venues` PREFIX rather than a bare `/venues`:
      // `@strapi/core`'s `register-routes.js` mounts BOTH routers of a plugin
      // under the same `/<pluginName>` prefix, so an admin `GET /venues` and
      // the existing content-api `GET /venues` would resolve to the same URL
      // (`/venues/venues`) and the first router registered wins. The public,
      // `auth: false` route would silently shadow the authenticated one — the
      // exact failure that looks like "the admin list ignores my permissions".
      // The extra segment keeps the two namespaces disjoint by construction.
      //
      // Every route carries TWO policies, and both are load-bearing:
      //   1. `admin::hasPermissions` — the RBAC grant check against the
      //      actions registered in `../register.ts`. Without it any
      //      authenticated admin user, whatever their role, could write venues.
      //   2. `plugin::venues.venues-admin-scope` — resolves `manage-all` into
      //      `ctx.state.venuesAdminScope`, which `services/venue-admin.ts`
      //      turns into the `manager.email` tenant filter (AC 7).
      //
      // `bulk-delete` is registered BEFORE `/admin/venues/:documentId` for the
      // same reason `/venues/selector` precedes `/venues/:documentId` above:
      // ordering is what stops a literal segment being read as an id. It is a
      // POST so the id routes cannot actually swallow it today — the ordering
      // is explicit so a future method change cannot break it silently.
      // ----------------------------------------------------------------
      {
        method: "GET",
        path: "/admin/venues",
        handler: "venue-admin.find",
        config: {
          policies: [
            {
              name: "admin::hasPermissions",
              config: { actions: ["plugin::venues.read"] },
            },
            "plugin::venues.venues-admin-scope",
          ],
        },
      },
      {
        method: "POST",
        path: "/admin/venues/bulk-delete",
        handler: "venue-admin.bulkDelete",
        config: {
          policies: [
            {
              name: "admin::hasPermissions",
              config: { actions: ["plugin::venues.delete"] },
            },
            "plugin::venues.venues-admin-scope",
          ],
        },
      },
      {
        method: "POST",
        path: "/admin/venues",
        handler: "venue-admin.create",
        config: {
          policies: [
            {
              name: "admin::hasPermissions",
              config: { actions: ["plugin::venues.create"] },
            },
            "plugin::venues.venues-admin-scope",
          ],
        },
      },
      {
        method: "GET",
        path: "/admin/venues/:documentId",
        handler: "venue-admin.findOne",
        config: {
          policies: [
            {
              name: "admin::hasPermissions",
              config: { actions: ["plugin::venues.read"] },
            },
            "plugin::venues.venues-admin-scope",
          ],
        },
      },
      {
        method: "PUT",
        path: "/admin/venues/:documentId",
        handler: "venue-admin.update",
        config: {
          policies: [
            {
              name: "admin::hasPermissions",
              config: { actions: ["plugin::venues.update"] },
            },
            "plugin::venues.venues-admin-scope",
          ],
        },
      },
      {
        method: "DELETE",
        path: "/admin/venues/:documentId",
        handler: "venue-admin.delete",
        config: {
          policies: [
            {
              name: "admin::hasPermissions",
              config: { actions: ["plugin::venues.delete"] },
            },
            "plugin::venues.venues-admin-scope",
          ],
        },
      },
    ],
  },
}
