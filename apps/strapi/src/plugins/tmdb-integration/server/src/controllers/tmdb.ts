import type { Core } from "@strapi/strapi"

const tmdbController = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Search movies by title
   * GET /tmdb-integration/search?query=&page=&locale=
   */
  async search(ctx) {
    const { query, page, locale, year } = ctx.query

    if (!query || typeof query !== "string") {
      return ctx.badRequest("Query parameter is required")
    }

    try {
      const movieService = strapi.plugin("tmdb-integration").service("movie")

      const results = await movieService.search(query, {
        page: page ? parseInt(page as string, 10) : 1,
        locale: locale as "fr" | "ar" | "en" | undefined,
        year: year ? parseInt(year as string, 10) : undefined,
      })

      // Add full image URLs to results
      const imageService = strapi.plugin("tmdb-integration").service("image")

      const resultsWithUrls = {
        ...results,
        results: results.results.map((movie) => ({
          ...movie,
          posterUrl: imageService.buildPosterUrl(movie.posterPath, "w342"),
          backdropUrl: imageService.buildBackdropUrl(
            movie.backdropPath,
            "w780"
          ),
        })),
      }

      return resultsWithUrls
    } catch (error) {
      strapi.log.error("[tmdb-controller] Search error:", error)
      return ctx.internalServerError("Failed to search movies")
    }
  },

  /**
   * Get movie details by TMDB ID
   * GET /tmdb-integration/movie/:id?locale=
   */
  async getDetails(ctx) {
    const { id } = ctx.params
    const { locale } = ctx.query

    const movieId = parseInt(id, 10)
    if (isNaN(movieId)) {
      return ctx.badRequest("Invalid movie ID")
    }

    try {
      const movieService = strapi.plugin("tmdb-integration").service("movie")

      const movie = await movieService.getDetails(
        movieId,
        locale as "fr" | "ar" | "en" | undefined
      )

      // Add full image URLs
      const imageService = strapi.plugin("tmdb-integration").service("image")

      return {
        ...movie,
        posterUrl: imageService.buildPosterUrl(movie.posterPath, "w500"),
        posterSizes: imageService.getAllPosterSizes(movie.posterPath),
        backdropUrl: imageService.buildBackdropUrl(movie.backdropPath, "w1280"),
        cast: movie.cast.map((member) => ({
          ...member,
          profileUrl: imageService.buildProfileUrl(member.profilePath),
        })),
        crew: movie.crew.map((member) => ({
          ...member,
          profileUrl: imageService.buildProfileUrl(member.profilePath),
        })),
      }
    } catch (error) {
      strapi.log.error("[tmdb-controller] Get details error:", error)
      if (error.message?.includes("404")) {
        return ctx.notFound("Movie not found")
      }
      return ctx.internalServerError("Failed to fetch movie details")
    }
  },
})

export default tmdbController
