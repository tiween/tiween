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
