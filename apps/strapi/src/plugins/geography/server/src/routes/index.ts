export default {
  "content-api": {
    type: "content-api",
    routes: [
      // Regions
      {
        method: "GET",
        path: "/regions",
        handler: "geography.findRegions",
        config: {
          policies: [],
          auth: false,
        },
      },
      {
        method: "GET",
        path: "/regions/:documentId",
        handler: "geography.findRegion",
        config: {
          policies: [],
          auth: false,
        },
      },
      // Cities
      {
        method: "GET",
        path: "/cities",
        handler: "geography.findCities",
        config: {
          policies: [],
          auth: false,
        },
      },
      {
        method: "GET",
        path: "/cities/:documentId",
        handler: "geography.findCity",
        config: {
          policies: [],
          auth: false,
        },
      },
    ],
  },
}
