/**
 * TMDB Image URL Builder Service
 *
 * Constructs full image URLs from TMDB image paths.
 * TMDB image base URL: https://image.tmdb.org/t/p/
 */

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p"

export type PosterSize =
  | "w92"
  | "w154"
  | "w185"
  | "w342"
  | "w500"
  | "w780"
  | "original"

export type BackdropSize = "w300" | "w780" | "w1280" | "original"

export type ProfileSize = "w45" | "w185" | "h632" | "original"

const imageService = () => {
  /**
   * Build a poster image URL
   */
  const buildPosterUrl = (
    posterPath: string | null | undefined,
    size: PosterSize = "w500"
  ): string | null => {
    if (!posterPath) return null
    return `${TMDB_IMAGE_BASE}/${size}${posterPath}`
  }

  /**
   * Build a backdrop image URL
   */
  const buildBackdropUrl = (
    backdropPath: string | null | undefined,
    size: BackdropSize = "w1280"
  ): string | null => {
    if (!backdropPath) return null
    return `${TMDB_IMAGE_BASE}/${size}${backdropPath}`
  }

  /**
   * Build a profile (person) image URL
   */
  const buildProfileUrl = (
    profilePath: string | null | undefined,
    size: ProfileSize = "w185"
  ): string | null => {
    if (!profilePath) return null
    return `${TMDB_IMAGE_BASE}/${size}${profilePath}`
  }

  /**
   * Get all available poster sizes with URLs
   */
  const getAllPosterSizes = (
    posterPath: string | null | undefined
  ): Record<PosterSize, string | null> => {
    const sizes: PosterSize[] = [
      "w92",
      "w154",
      "w185",
      "w342",
      "w500",
      "w780",
      "original",
    ]
    return sizes.reduce(
      (acc, size) => {
        acc[size] = buildPosterUrl(posterPath, size)
        return acc
      },
      {} as Record<PosterSize, string | null>
    )
  }

  return {
    buildPosterUrl,
    buildBackdropUrl,
    buildProfileUrl,
    getAllPosterSizes,
    TMDB_IMAGE_BASE,
  }
}

export default imageService
