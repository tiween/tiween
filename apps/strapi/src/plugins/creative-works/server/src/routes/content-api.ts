export default {
  type: "content-api",
  routes: [
    // Public short-film directory (SDATA-03). `auth: false` — NEVER `auth: true`
    // (boot fails with `Invalid route config`). Real URL:
    // /api/creative-works/creative-works/short-films
    {
      method: "GET",
      path: "/creative-works/short-films",
      handler: "short-film.list",
      config: {
        policies: [],
        auth: false,
        middlewares: [
          {
            name: "plugin::creative-works.short-films-rate-limit",
            config: { max: 600, windowMs: 60000 },
          },
        ],
      },
    },
    // `featured` MUST stay above `:slug`, or `:slug` captures "featured"
    // (research Pitfall 12). Order: list, featured, :slug/related, :slug.
    {
      method: "GET",
      path: "/creative-works/short-films/featured",
      handler: "short-film.featured",
      config: {
        policies: [],
        auth: false,
        middlewares: [
          {
            name: "plugin::creative-works.short-films-rate-limit",
            config: { max: 600, windowMs: 60000 },
          },
        ],
      },
    },
    {
      method: "GET",
      path: "/creative-works/short-films/:slug/related",
      handler: "short-film.related",
      config: {
        policies: [],
        auth: false,
        middlewares: [
          {
            name: "plugin::creative-works.short-films-rate-limit",
            config: { max: 600, windowMs: 60000 },
          },
        ],
      },
    },
    // Detail by slug: keep it the LAST short-films route.
    {
      method: "GET",
      path: "/creative-works/short-films/:slug",
      handler: "short-film.findOne",
      config: {
        policies: [],
        auth: false,
        middlewares: [
          {
            name: "plugin::creative-works.short-films-rate-limit",
            config: { max: 600, windowMs: 60000 },
          },
        ],
      },
    },
    {
      method: "GET",
      path: "/persons/search",
      handler: "person.search",
      config: {
        policies: [],
      },
    },
  ],
}
