export default {
  admin: {
    type: "admin",
    routes: [
      {
        method: "GET",
        path: "/search",
        handler: "tmdb.search",
        config: {
          policies: [],
        },
      },
      {
        method: "GET",
        path: "/movie/:id",
        handler: "tmdb.getDetails",
        config: {
          policies: [],
        },
      },
    ],
  },
}
