import { useEffect, useState } from "react"
import {
  Box,
  Flex,
  Loader,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from "@strapi/design-system"
import { Search } from "@strapi/icons"
import { useDebounce } from "use-debounce"

import type { MovieCardData } from "../MovieCard"

import { useTMDBSearch } from "../../hooks/useTMDB"
import { MovieCard } from "../MovieCard"

type ContentType = "movies" | "shorts" | "plays"

interface ContentSearchPanelProps {
  selectedMovie: MovieCardData | null
  onMovieSelect: (movie: MovieCardData) => void
}

/**
 * Content Search Panel
 *
 * Dynamic search panel with content type dropdown.
 * Searches TMDB for movies, or creative-works API for shorts/plays.
 */
const ContentSearchPanel = ({
  selectedMovie,
  onMovieSelect,
}: ContentSearchPanelProps) => {
  const [contentType, setContentType] = useState<ContentType>("movies")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery] = useDebounce(searchQuery, 300)

  const { results, isLoading, error } = useTMDBSearch({
    query: debouncedQuery,
    enabled: contentType === "movies" && debouncedQuery.length >= 2,
  })

  // Transform TMDB results to MovieCardData
  const movies: MovieCardData[] = results.map((movie) => ({
    id: movie.id,
    title: movie.title,
    originalTitle: movie.originalTitle,
    posterUrl: movie.posterUrl,
    releaseDate: movie.releaseDate,
    runtime: movie.runtime,
    overview: movie.overview,
    voteAverage: movie.voteAverage,
  }))

  return (
    <Flex direction="column" gap={4}>
      {/* Content Type Selector */}
      <SingleSelect
        label="Content Type"
        value={contentType}
        onChange={(value: ContentType) => {
          setContentType(value)
          setSearchQuery("")
        }}
      >
        <SingleSelectOption value="movies">
          Movies (Full-length)
        </SingleSelectOption>
        <SingleSelectOption value="shorts">Shorts</SingleSelectOption>
        <SingleSelectOption value="plays">Plays</SingleSelectOption>
      </SingleSelect>

      {/* Search Input */}
      <TextInput
        label="Search"
        placeholder={`Search ${contentType}...`}
        value={searchQuery}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setSearchQuery(e.target.value)
        }
        startAction={<Search />}
      />

      {/* Results */}
      <Box
        style={{
          maxHeight: 400,
          overflowY: "auto",
        }}
      >
        {isLoading ? (
          <Flex justifyContent="center" padding={4}>
            <Loader small />
          </Flex>
        ) : error ? (
          <Box padding={4}>
            <Typography textColor="danger600">
              Error loading results. Please try again.
            </Typography>
          </Box>
        ) : movies.length === 0 && debouncedQuery.length >= 2 ? (
          <Box padding={4} background="neutral100" hasRadius>
            <Typography textColor="neutral600" textAlign="center">
              No results found for "{debouncedQuery}"
            </Typography>
          </Box>
        ) : movies.length === 0 ? (
          <Box padding={4} background="neutral100" hasRadius>
            <Typography textColor="neutral600" textAlign="center">
              Enter at least 2 characters to search
            </Typography>
          </Box>
        ) : (
          <Flex direction="column" gap={2}>
            {movies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                isSelected={selectedMovie?.id === movie.id}
                onSelect={onMovieSelect}
              />
            ))}
          </Flex>
        )}
      </Box>

      {/* TODO: Add support for shorts and plays via creative-works API */}
      {contentType !== "movies" && (
        <Box padding={4} background="warning100" hasRadius>
          <Typography textColor="warning700">
            {contentType === "shorts" ? "Shorts" : "Plays"} search coming soon.
            Currently only TMDB movies are supported.
          </Typography>
        </Box>
      )}
    </Flex>
  )
}

export { ContentSearchPanel }
