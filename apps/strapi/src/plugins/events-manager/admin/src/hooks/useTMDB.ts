import { useCallback, useEffect, useState } from "react"
import { useFetchClient } from "@strapi/strapi/admin"

interface TMDBSearchResult {
  id: number
  title: string
  originalTitle: string
  posterUrl: string | null
  backdropUrl: string | null
  releaseDate: string
  overview: string
  voteAverage: number
  runtime?: number
}

interface TMDBSearchResponse {
  results: TMDBSearchResult[]
  page: number
  totalPages: number
  totalResults: number
}

interface TMDBMovieDetails extends TMDBSearchResult {
  runtime: number | null
  genres: { id: number; name: string }[]
  cast: {
    id: number
    name: string
    character: string
    profileUrl: string | null
  }[]
  crew: {
    id: number
    name: string
    job: string
    department: string
    profileUrl: string | null
  }[]
  imdbId: string | null
  tagline: string | null
}

interface UseTMDBSearchOptions {
  query: string
  page?: number
  locale?: "fr" | "ar" | "en"
  enabled?: boolean
}

export const useTMDBSearch = ({
  query,
  page = 1,
  locale = "fr",
  enabled = true,
}: UseTMDBSearchOptions) => {
  const { get } = useFetchClient()

  const [results, setResults] = useState<TMDBSearchResult[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalResults, setTotalResults] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchSearch = useCallback(async () => {
    if (!enabled || query.length < 2) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await get<TMDBSearchResponse>(
        "/tmdb-integration/search",
        {
          params: { query, page, locale },
        }
      )
      setResults(response.data.results ?? [])
      setCurrentPage(response.data.page ?? 1)
      setTotalPages(response.data.totalPages ?? 0)
      setTotalResults(response.data.totalResults ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [get, query, page, locale, enabled])

  useEffect(() => {
    fetchSearch()
  }, [fetchSearch])

  return {
    results,
    page: currentPage,
    totalPages,
    totalResults,
    isLoading,
    error,
  }
}

interface UseTMDBDetailsOptions {
  movieId: number
  locale?: "fr" | "ar" | "en"
  enabled?: boolean
}

export const useTMDBDetails = ({
  movieId,
  locale = "fr",
  enabled = true,
}: UseTMDBDetailsOptions) => {
  const { get } = useFetchClient()

  const [movie, setMovie] = useState<TMDBMovieDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchDetails = useCallback(async () => {
    if (!enabled || movieId <= 0) {
      setMovie(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await get<TMDBMovieDetails>(
        `/tmdb-integration/movie/${movieId}`,
        {
          params: { locale },
        }
      )
      setMovie(response.data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [get, movieId, locale, enabled])

  useEffect(() => {
    fetchDetails()
  }, [fetchDetails])

  return {
    movie,
    isLoading,
    error,
  }
}
