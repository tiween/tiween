export default {
  type: "content-api",
  routes: [
    {
      method: "GET",
      path: "/creative-works/featured",
      handler: "creative-work.findFeatured",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/creative-works/type/:type",
      handler: "creative-work.findByType",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/creative-works/search",
      handler: "creative-work.search",
      config: {
        policies: [],
      },
    },
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
      },
    },
    // Detail by slug: keep it the LAST short-films route (01-04 inserts
    // `featured` and `:slug/related` above it so `:slug` cannot swallow them).
    {
      method: "GET",
      path: "/creative-works/short-films/:slug",
      handler: "short-film.findOne",
      config: {
        policies: [],
        auth: false,
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
