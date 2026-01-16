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
