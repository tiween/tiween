"use strict"
const axios = require("axios")
const { get } = require("lodash")
const qs = require("qs")
// TODO refactor into one single place
const apiKey = "a6242674db72d5414a8893bd2c61c6dd"
const apiBaseUrl = "https://api.themoviedb.org/3"

const defaultOptions = {
  api_key: apiKey,
  language: "fr-FR",
  append_to_response: ["videos", "credits"].join(),
}
const posterBaseUrl = "https://image.tmdb.org/t/p/original"
/**
 * moviemeta service.
 */

const { createCoreService } = require("@strapi/strapi").factories

module.exports = createCoreService("api::moviemeta.moviemeta", ({ strapi }) => {
  return {
    findOrFetchAndSave: async (tmdbid) => {
      try {
        let moviemeta = await strapi.db
          .query("api::moviemeta.moviemeta")
          .findOne({
            where: { tmdbid: tmdbid },
          })
        if (!moviemeta) {
          const response = await axios.get(
            `${apiBaseUrl}/movie/${tmdbid}?${qs.stringify(defaultOptions)}`
          )
          const runtime = get(response, ["data", "runtime"], "")
          const title = get(response, ["data", "title"], "")
          const poster = get(response, ["data", "poster_path"], null)
          let colors = {}
          if (poster) {
            colors = await strapi
              .service("api::shared.shared")
              .getImageSwatches(`${posterBaseUrl}${poster}`)
          }
          const originalTitle = get(response, "data.original_title", "")
          moviemeta = await strapi.db.query("api::moviemeta.moviemeta").create({
            data: {
              tmdbid: tmdbid,
              colors: colors,
              runtime: runtime,
              title: title,
              originalTitle: originalTitle,
              remote: get(response, "data"),
            },
          })
        }

        return moviemeta
      } catch (error) {
        console.error("ERROR", error)
      }
    },
  }
})
