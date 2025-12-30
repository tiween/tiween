"use strict"

/**
 * mdb-requests service
 */
const defaultAPIParams = {
  language: "fr-FR",
  include_adult: "false",
}
const axios = require("axios")

module.exports = {
  async searchMovies(query) {
    const { apiKey, apiBaseUrl } = await strapi
      .plugin("tmdb")
      .service("settings")
      .getSettings()
    try {
      const response = await axios.get(`${apiBaseUrl}/search/movie`, {
        params: {
          ...defaultAPIParams,
          api_key: apiKey,
          query,
        },
      })
      return response.data
    } catch (error) {}
  },
  async fetchMovie(tmdbid) {
    const { apiKey, apiBaseUrl } = await strapi
      .plugin("tmdb")
      .service("settings")
      .getSettings()
    try {
      const response = await axios.get(`${apiBaseUrl}/movie/${tmdbid}`, {
        params: {
          ...defaultAPIParams,
          api_key: apiKey,
          append_to_response: "videos,credits",
        },
      })

      return response.data
    } catch (error) {
      console.log("error", error)
    }
  },
}
