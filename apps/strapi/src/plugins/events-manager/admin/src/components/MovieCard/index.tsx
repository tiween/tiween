import { useState } from "react"
import { Box, Flex, IconButton, Typography } from "@strapi/design-system"
import { Star } from "@strapi/icons"

export interface MovieCardData {
  id: number
  title: string
  originalTitle?: string
  posterUrl: string | null
  releaseDate?: string
  runtime?: number | null
  overview?: string
  voteAverage?: number
}

interface MovieCardProps {
  movie: MovieCardData
  isSelected?: boolean
  isFavorite?: boolean
  onSelect?: (movie: MovieCardData) => void
  onFavoriteToggle?: (movie: MovieCardData) => void
}

/**
 * Movie Selection Card
 *
 * Displays a movie with poster, title, and metadata.
 * Supports selection state and favorite toggle.
 */
const MovieCard = ({
  movie,
  isSelected = false,
  isFavorite = false,
  onSelect,
  onFavoriteToggle,
}: MovieCardProps) => {
  const [isHovered, setIsHovered] = useState(false)

  const releaseYear = movie.releaseDate
    ? new Date(movie.releaseDate).getFullYear()
    : null

  const formatRuntime = (minutes: number | null | undefined) => {
    if (!minutes) return null
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent selection when clicking the star
    if ((e.target as HTMLElement).closest("[data-favorite-button]")) {
      return
    }
    onSelect?.(movie)
  }

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onFavoriteToggle?.(movie)
  }

  return (
    <Box
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      padding={3}
      background={isSelected ? "primary100" : "neutral0"}
      hasRadius
      shadow={isHovered ? "filterShadow" : "tableShadow"}
      style={{
        cursor: "pointer",
        border: isSelected
          ? "2px solid var(--colors-primary600)"
          : isHovered
            ? "2px solid var(--colors-neutral300)"
            : "2px solid transparent",
        transition: "all 0.15s ease",
        position: "relative",
      }}
    >
      {/* Favorite Button */}
      <Box
        data-favorite-button
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 1,
        }}
      >
        <IconButton
          onClick={handleFavoriteClick}
          label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          variant="ghost"
        >
          <Star
            fill={isFavorite ? "var(--colors-warning500)" : "none"}
            stroke={isFavorite ? "var(--colors-warning500)" : "currentColor"}
          />
        </IconButton>
      </Box>

      <Flex gap={3}>
        {/* Poster */}
        <Box
          style={{
            width: 80,
            height: 120,
            flexShrink: 0,
            borderRadius: 4,
            overflow: "hidden",
            backgroundColor: "var(--colors-neutral200)",
          }}
        >
          {movie.posterUrl ? (
            <img
              src={movie.posterUrl}
              alt={movie.title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <Flex
              justifyContent="center"
              alignItems="center"
              style={{ height: "100%" }}
            >
              <Typography variant="pi" textColor="neutral500">
                No poster
              </Typography>
            </Flex>
          )}
        </Box>

        {/* Content */}
        <Flex direction="column" gap={1} style={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="omega"
            fontWeight="bold"
            ellipsis
            style={{ paddingRight: 32 }}
          >
            {movie.title}
          </Typography>

          {movie.originalTitle && movie.originalTitle !== movie.title && (
            <Typography variant="pi" textColor="neutral600" ellipsis>
              {movie.originalTitle}
            </Typography>
          )}

          <Flex gap={2} wrap="wrap">
            {releaseYear && (
              <Typography variant="pi" textColor="neutral500">
                {releaseYear}
              </Typography>
            )}
            {movie.runtime && (
              <Typography variant="pi" textColor="neutral500">
                • {formatRuntime(movie.runtime)}
              </Typography>
            )}
            {movie.voteAverage !== undefined && movie.voteAverage > 0 && (
              <Typography variant="pi" textColor="neutral500">
                • ★ {movie.voteAverage.toFixed(1)}
              </Typography>
            )}
          </Flex>

          {movie.overview && (
            <Typography
              variant="pi"
              textColor="neutral600"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                marginTop: 4,
              }}
            >
              {movie.overview}
            </Typography>
          )}

          {/* Selection indicator */}
          {isSelected && (
            <Box
              style={{
                position: "absolute",
                bottom: 8,
                right: 8,
              }}
            >
              <Typography variant="pi" textColor="primary600" fontWeight="bold">
                ✓ Selected
              </Typography>
            </Box>
          )}
        </Flex>
      </Flex>
    </Box>
  )
}

export { MovieCard }
