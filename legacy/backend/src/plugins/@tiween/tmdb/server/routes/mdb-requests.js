"use strict"

module.exports = {
  type: "admin",
  routes: [
    {
      method: "GET",
      path: "/search-movies",
      handler: "mdb-requests.searchMovies",
      config: {
        policies: [],
        auth: false,
      },
    },
  ],
}
