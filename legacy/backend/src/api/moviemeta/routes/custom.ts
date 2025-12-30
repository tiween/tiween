export default {
  routes: [
    {
      method: "GET",
      path: "/moviemetas/tmdbid/:tmdbid",
      handler: "moviemeta.findByTMDBID",
    },
  ],
}
