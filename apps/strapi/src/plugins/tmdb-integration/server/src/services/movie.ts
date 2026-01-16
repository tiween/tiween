import type { Core } from "@strapi/strapi"

export interface MovieSearchResult {
  id: number
  title: string
  originalTitle: string
  posterPath: string | null
  backdropPath: string | null
  releaseDate: string
  overview: string
  voteAverage: number
  popularity: number
}

export interface MovieSearchResponse {
  results: MovieSearchResult[]
  page: number
  totalPages: number
  totalResults: number
}

export interface CastMember {
  id: number
  name: string
  character: string
  profilePath: string | null
  order: number
}

export interface CrewMember {
  id: number
  name: string
  job: string
  department: string
  profilePath: string | null
}

export interface Genre {
  id: number
  name: string
}

export interface MovieDetails {
  id: number
  title: string
  originalTitle: string
  overview: string
  runtime: number | null
  releaseDate: string
  posterPath: string | null
  backdropPath: string | null
  genres: Genre[]
  voteAverage: number
  voteCount: number
  popularity: number
  cast: CastMember[]
  crew: CrewMember[]
  imdbId: string | null
  tagline: string | null
  status: string
  budget: number
  revenue: number
}

type Locale = "fr" | "ar" | "en"

/**
 * Movie Service
 *
 * Provides methods for searching and fetching movie details from TMDB.
 */
const movieService = ({ strapi }: { strapi: Core.Strapi }) => {
  const getClient = () =>
    strapi.plugin("tmdb-integration").service("tmdbClient")

  const defaultLanguage = process.env.TMDB_DEFAULT_LANGUAGE || "fr"

  // Cache TTLs
  const SEARCH_TTL = 900 // 15 minutes
  const DETAILS_TTL = 3600 // 1 hour

  /**
   * Search movies by title
   */
  const search = async (
    query: string,
    options?: {
      page?: number
      locale?: Locale
      year?: number
    }
  ): Promise<MovieSearchResponse> => {
    const { page = 1, locale = defaultLanguage, year } = options || {}
    const cacheKey = `search:${query}:${page}:${locale}:${year || ""}`

    const client = getClient()
    const response = await client.execute(cacheKey, SEARCH_TTL, (tmdb) =>
      tmdb.search.movies({
        query,
        page,
        language: locale,
        year,
      })
    )

    return {
      results: response.results.map((movie) => ({
        id: movie.id,
        title: movie.title,
        originalTitle: movie.original_title,
        posterPath: movie.poster_path,
        backdropPath: movie.backdrop_path,
        releaseDate: movie.release_date || "",
        overview: movie.overview,
        voteAverage: movie.vote_average,
        popularity: movie.popularity,
      })),
      page: response.page,
      totalPages: response.total_pages,
      totalResults: response.total_results,
    }
  }

  /**
   * Get movie details by TMDB ID
   */
  const getDetails = async (
    movieId: number,
    locale: Locale = defaultLanguage as Locale
  ): Promise<MovieDetails> => {
    const cacheKey = `movie:${movieId}:${locale}`

    const client = getClient()

    // Fetch movie details with credits appended
    const response = await client.execute(cacheKey, DETAILS_TTL, (tmdb) =>
      tmdb.movies.details(movieId, ["credits"], locale)
    )

    const credits = response.credits || { cast: [], crew: [] }

    return {
      id: response.id,
      title: response.title,
      originalTitle: response.original_title,
      overview: response.overview || "",
      runtime: response.runtime,
      releaseDate: response.release_date || "",
      posterPath: response.poster_path,
      backdropPath: response.backdrop_path,
      genres: response.genres.map((g) => ({ id: g.id, name: g.name })),
      voteAverage: response.vote_average,
      voteCount: response.vote_count,
      popularity: response.popularity,
      cast: credits.cast.slice(0, 20).map((c) => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profilePath: c.profile_path,
        order: c.order,
      })),
      crew: credits.crew
        .filter((c) =>
          ["Director", "Writer", "Screenplay", "Producer"].includes(c.job)
        )
        .map((c) => ({
          id: c.id,
          name: c.name,
          job: c.job,
          department: c.department,
          profilePath: c.profile_path,
        })),
      imdbId: response.imdb_id,
      tagline: response.tagline,
      status: response.status,
      budget: response.budget,
      revenue: response.revenue,
    }
  }

  return {
    search,
    getDetails,
  }
}

export default movieService
