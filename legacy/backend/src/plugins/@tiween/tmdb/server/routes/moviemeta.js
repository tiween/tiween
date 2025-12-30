"use strict"

module.exports = {
  type: "admin",
  routes: [
    {
      method: "POST",
      path: "/moviemeta/sync",
      handler: "moviemeta.syncWithTMDB",
      config: {
        policies: [],
        auth: false,
      },
    },
  ],
}
